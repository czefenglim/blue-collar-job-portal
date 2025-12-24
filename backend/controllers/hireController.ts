import { Response } from 'express';
import { PrismaClient, ApplicationStatus, OfferStatus } from '@prisma/client';
import { AuthRequest } from '../types/user';
import {
  uploadOfferContractToS3,
  getSignedDownloadUrl,
  getFileInfoFromUrl,
} from '../services/s3Service';

const prisma = new PrismaClient();

// Create a hire offer
export const createOffer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      applicationId,
      startDate,
      contractDuration,
      durationPeriod,
      salaryAmount,
      salaryCurrency,
      payFrequency,
      employerConfirmed,
      compliesWithLaws,
    } = req.body;

    // Validate input
    if (
      !applicationId ||
      !startDate ||
      !contractDuration ||
      !salaryAmount ||
      !salaryCurrency ||
      !payFrequency
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const file = (req as any).file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: 'Contract file is required' });
    }

    // Get application and verify access
    const application = await prisma.jobApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Verify employer owns this job
    if (application.job.company.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Create Offer (without contractUrl first)
    // The contract will be uploaded to: contracts/{offerId}/employer_original_v1.pdf
    let offer = await prisma.jobOffer.create({
      data: {
        applicationId: parseInt(applicationId),
        startDate: new Date(startDate),
        contractDuration,
        durationPeriod,
        salaryAmount: parseFloat(salaryAmount), // Ensure float
        salaryCurrency,
        payFrequency,
        contractUrl: 'pending_upload', // Placeholder to be updated immediately
        employerConfirmed:
          employerConfirmed === 'true' || employerConfirmed === true,
        compliesWithLaws:
          compliesWithLaws === 'true' || compliesWithLaws === true,
        applicantStatus: OfferStatus.PENDING,
      },
    });

    // Upload contract to S3 with new structure
    // /contracts/{offerId}/employer_original_v1.pdf
    const uploadResult = await uploadOfferContractToS3(
      offer.id,
      'employer_original_v1.pdf',
      file.buffer
    );

    // Update Offer with contractUrl
    offer = await prisma.jobOffer.update({
      where: { id: offer.id },
      data: {
        contractUrl: uploadResult.key,
      },
    });

    // Update Application Status
    await prisma.jobApplication.update({
      where: { id: parseInt(applicationId) },
      data: {
        status: ApplicationStatus.OFFERED,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create offer',
    });
  }
};

// Get offer details
export const getOffer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { applicationId } = req.params;

    const offer = await prisma.jobOffer.findUnique({
      where: { applicationId: parseInt(applicationId) },
      include: {
        application: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
            user: true,
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    // Verify access (either employer or applicant)
    const isEmployer = offer.application.job.company.userId === userId;
    const isApplicant = offer.application.userId === userId;

    if (!isEmployer && !isApplicant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Generate signed URLs
    if (offer.contractUrl) {
      const fileInfo = getFileInfoFromUrl(offer.contractUrl);
      const key = fileInfo.key || offer.contractUrl;
      offer.contractUrl = await getSignedDownloadUrl(key, 3600);
    }
    if (offer.signedContractUrl) {
      const fileInfo = getFileInfoFromUrl(offer.signedContractUrl);
      const key = fileInfo.key || offer.signedContractUrl;
      offer.signedContractUrl = await getSignedDownloadUrl(key, 3600);
    }

    return res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offer',
    });
  }
};

// Respond to offer (Applicant)
export const respondToOffer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const body = req.body || {};
    const { offerId, status } = body;

    // Handle file from upload.fields()
    const files = (req as any).files;
    const file = files?.['signedContract']?.[0];

    if (!offerId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (offerId, status)',
      });
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // If accepted, require file
    if (status === 'ACCEPTED' && !file) {
      return res.status(400).json({
        success: false,
        message: 'Signed contract file is required',
      });
    }

    const offer = await prisma.jobOffer.findUnique({
      where: { id: parseInt(offerId) },
      include: {
        application: true,
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    // Verify applicant
    if (offer.application.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    let signedContractUrl = offer.signedContractUrl;

    if (status === 'ACCEPTED' && file) {
      const uploadResult = await uploadOfferContractToS3(
        offer.id,
        'applicant_signed_v2.pdf',
        file.buffer
      );
      signedContractUrl = uploadResult.key;
    }

    // Update Offer
    const updatedOffer = await prisma.jobOffer.update({
      where: { id: parseInt(offerId) },
      data: {
        applicantStatus: status as OfferStatus,
        applicantSignature:
          status === 'ACCEPTED' ? 'Signed via PDF upload' : null,
        signedContractUrl: signedContractUrl,
      },
    });

    // Update Application Status
    await prisma.jobApplication.update({
      where: { id: offer.applicationId },
      data: {
        status:
          status === 'ACCEPTED'
            ? ApplicationStatus.OFFER_ACCEPTED
            : ApplicationStatus.OFFER_REJECTED,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Offer ${status.toLowerCase()}`,
      data: updatedOffer,
    });
  } catch (error) {
    console.error('Error responding to offer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to offer',
    });
  }
};

// Verify Hire (Employer)
export const verifyHire = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { offerId } = req.body;

    const offer = await prisma.jobOffer.findUnique({
      where: { id: parseInt(offerId) },
      include: {
        application: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    // Verify employer
    if (offer.application.job.company.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (offer.applicantStatus !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Applicant has not accepted the offer yet',
      });
    }

    // Update Offer
    const updatedOffer = await prisma.jobOffer.update({
      where: { id: parseInt(offerId) },
      data: {
        employerVerified: true,
      },
    });

    // Update Application Status to HIRED
    await prisma.jobApplication.update({
      where: { id: offer.applicationId },
      data: {
        status: ApplicationStatus.HIRED,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Hire verified and completed',
      data: updatedOffer,
    });
  } catch (error) {
    console.error('Error verifying hire:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify hire',
    });
  }
};
