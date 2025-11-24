import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import {
  translateJobs,
  translateCompanies,
} from '../workers/translationWorker';
import { AIJobVerificationService } from '../services/aiJobVerification';
import {
  sendJobApprovedNotification,
  sendJobMatchNotification,
} from '../utils/notificationHelper';
import { geocodeAddress } from '../utils/geocoding';
import {
  uploadCompanyLogoService,
  deleteOldFile,
  uploadVerificationDocumentService,
  getSignedDownloadUrl,
} from '../services/s3Service';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export const uploadCompanyLogo = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { userId },
      select: { id: true, logo: true },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Please create company profile first',
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      });
    }

    // Validate file size (5MB max)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
    }

    console.log(`🏢 Uploading company logo for company ${company.id}`);

    // Upload to S3
    const uploadResult = await uploadCompanyLogoService(
      company.id,
      req.file.buffer,
      req.file.mimetype
    );

    console.log(`✅ Company logo uploaded to S3:`, uploadResult.url);

    // ✅ Update database with KEY only (not full URL)
    await prisma.company.update({
      where: { id: company.id },
      data: { logo: uploadResult.key }, // ← Store key instead of URL
    });

    // Delete old logo (async, don't wait)
    if (company.logo) {
      deleteOldFile(company.logo).catch((err) =>
        console.error('Error deleting old logo:', err)
      );
    }

    res.json({
      success: true,
      data: {
        logo: uploadResult.url, // Return URL to frontend
        key: uploadResult.key,
      },
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
    });
  }
};

// ===================================================================
// STEP 2: Create/Update Company Profile
// ===================================================================
export const createCompany = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      companyId,
      companyName,
      industry,
      companySize,
      address,
      city,
      state,
      postcode,
      description,
      phone,
      email,
      website,
      // ❌ REMOVED: logo - now handled separately
    } = req.body;

    const industryId = Number(industry);

    // Validate required fields
    if (!userId || !companyName || !industryId || !companySize) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields (userId, companyName, industry, companySize)',
      });
    }

    // ... existing validation code ...

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify industry exists
    const industryExists = await prisma.industry.findUnique({
      where: { id: industryId },
    });

    if (!industryExists) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found',
      });
    }

    // Generate slug
    let slug = slugify(companyName, { lower: true, strict: true });
    if (!existingUser.company) {
      const existingCompany = await prisma.company.findUnique({
        where: { slug },
      });
      if (existingCompany) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    let company;
    let statusCode: number;
    let message: string;

    if (existingUser.company) {
      // ✅ Update existing company (preserve existing logo)
      console.log('Updating company with ID:', existingUser.company.id);
      company = await prisma.company.update({
        where: { id: existingUser.company.id },
        data: {
          name: companyName,
          industryId,
          companySize,
          address,
          city,
          state,
          postcode,
          description,
          phone,
          email,
          website,
          onboardingStep: 2,
        },
      });
      statusCode = 200;
      message = 'Company updated successfully';
    } else {
      // ✅ Create new company (without logo initially)
      console.log('Creating new company with slug:', slug);
      company = await prisma.company.create({
        data: {
          userId,
          name: companyName,
          slug,
          industryId,
          companySize,
          address,
          city,
          state,
          postcode,
          description,
          phone,
          email,
          website,
          // logo will be added later via uploadCompanyLogo endpoint
          onboardingCompleted: false,
          onboardingStep: 2,
          verificationStatus: 'PENDING',
          isActive: true,
        },
      });

      // Update user role to EMPLOYER
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'EMPLOYER' },
      });

      statusCode = 201;
      message = 'Company created successfully';
    }

    // Fire translation in background
    if (company.name || company.description) {
      translateCompanies().catch((err) =>
        console.error('Translation error for company:', err)
      );
    }

    return res.status(statusCode).json({
      success: true,
      companyId: company.id,
      message,
      data: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        industryId: company.industryId,
        companySize: company.companySize,
        phone: company.phone,
        website: company.website,
        address: company.address,
        city: company.city,
        state: company.state,
        postcode: company.postcode,
        logo: company.logo, // Return existing logo URL if available
        onboardingStep: company.onboardingStep,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const getCompanyByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const parsedUserId = parseInt(userId);

    if (isNaN(parsedUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId',
      });
    }

    const company = await prisma.company.findFirst({
      where: { userId: parsedUserId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // ✅ Generate signed URLs for logo and verification document
    if (company.logo) {
      try {
        const signedLogoUrl = await getSignedDownloadUrl(company.logo, 3600);
        company.logo = signedLogoUrl;
      } catch (error) {
        console.error('Error generating signed URL for logo:', error);
      }
    }

    if (company.verificationDocument) {
      try {
        const signedDocUrl = await getSignedDownloadUrl(
          company.verificationDocument,
          3600
        );
        company.verificationDocument = signedDocUrl;
      } catch (error) {
        console.error(
          'Error generating signed URL for verification document:',
          error
        );
      }
    }

    return res.status(200).json({
      success: true,
      ...company, // return full company object with signed URLs
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const uploadVerificationDocument = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const company = await prisma.company.findUnique({
      where: { userId },
      select: { id: true, verificationDocument: true },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Validate file type (PDFs and images)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PDF and image files are allowed.',
      });
    }

    // Validate file size (10MB max for documents)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit',
      });
    }

    console.log(`📄 Uploading verification document for company ${company.id}`);

    // Upload to S3
    const uploadResult = await uploadVerificationDocumentService(
      company.id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    console.log(`✅ Verification document uploaded to S3:`, uploadResult.url);

    // ✅ Update database with KEY only (not full URL)
    await prisma.company.update({
      where: { id: company.id },
      data: { verificationDocument: uploadResult.key }, // ← Store key instead of URL
    });

    // Delete old document (async, don't wait)
    if (company.verificationDocument) {
      deleteOldFile(company.verificationDocument).catch((err) =>
        console.error('Error deleting old verification document:', err)
      );
    }

    res.json({
      success: true,
      data: {
        verificationDocument: uploadResult.url, // Return URL to frontend
        key: uploadResult.key,
        fileName: uploadResult.fileName,
      },
      message: 'Verification document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading verification document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload verification document',
    });
  }
};

// ✅ UPDATED: Submit Verification (without businessDocument in body)
export const submitVerification = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      contactPhone,
      businessEmail,
      // ❌ REMOVED: businessDocument - now handled separately
    } = req.body;

    // Validate required fields
    if (!companyId || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (companyId, contactPhone)',
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(contactPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
      });
    }

    // Validate email if provided
    if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        email: true,
        verificationDocument: true, // ✅ Keep existing document
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // ✅ Update company with verification details (preserve document)
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        phone: contactPhone,
        email: businessEmail || company.email,
        // ❌ DO NOT update verificationDocument here
        onboardingStep: 3,
        verificationStatus: 'PENDING',
      },
    });

    // ✅ Create/update verification record (with existing document URL)
    if (company.verificationDocument) {
      await prisma.companyVerification.upsert({
        where: { companyId },
        create: {
          companyId,
          businessDocument: company.verificationDocument,
          documentType: 'SSM',
          phoneVerified: false,
          emailVerified: false,
          status: 'PENDING',
          submittedAt: new Date(),
        },
        update: {
          // Keep existing document
          submittedAt: new Date(),
          status: 'PENDING',
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification details submitted successfully',
      data: {
        id: updatedCompany.id,
        phone: updatedCompany.phone,
        email: updatedCompany.email,
        verificationStatus: updatedCompany.verificationStatus,
        verificationDocument: updatedCompany.verificationDocument,
        onboardingStep: updatedCompany.onboardingStep,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// STEP 4: Create/Update First Job Post (UPSERT)
// ===================================================================
export const createFirstJob = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      jobId, // For upsert
      title,
      industryId,
      jobType,
      salaryMin,
      salaryMax,
      skills,
      city, // ✅ UPDATED
      state, // ✅ UPDATED
      address, // ✅ UPDATED
      postcode, // ✅ UPDATED
      description,
      requirements,
      benefits,
    } = req.body;

    // ✅ UPDATED: Validate required fields with new structure
    if (
      !companyId ||
      !title ||
      !industryId ||
      !jobType ||
      !city ||
      !state ||
      !description
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Missing required fields: companyId, title, industryId, jobType, city, state, description',
      });
    }

    // Validate job type enum
    const validJobTypes = [
      'FULL_TIME',
      'PART_TIME',
      'CONTRACT',
      'TEMPORARY',
      'FREELANCE',
    ];
    if (!validJobTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid job type. Must be one of: FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, FREELANCE',
      });
    }

    // Validate salary range
    if (salaryMin && salaryMax && salaryMin > salaryMax) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary',
      });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        industry: true,
        user: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // ✅ CHECK COMPANY VERIFICATION STATUS
    if (!company.isVerified || company.verificationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message:
          'Your company must be verified before posting jobs. Please wait for admin approval.',
      });
    }

    // Verify industry exists
    const industryExists = await prisma.industry.findUnique({
      where: { id: industryId },
    });

    if (!industryExists) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found',
      });
    }

    // ✅ Trim and validate location fields
    const cityTrimmed = city.trim();
    const stateTrimmed = state.trim();
    const addressTrimmed = address?.trim() || null;
    const postcodeTrimmed = postcode?.trim() || null;

    // ✅ RUN AI VERIFICATION WITH COHERE
    console.log('🤖 Starting AI verification for first job post...');

    const verificationResult = await AIJobVerificationService.verifyJob({
      title,
      description,
      requirements: requirements || undefined,
      benefits: benefits || undefined,
      salaryMin,
      salaryMax,
      salaryType: salaryMin || salaryMax ? 'MONTHLY' : undefined,
      city: cityTrimmed,
      state: stateTrimmed,
      industryId,
      companyId: company.id,
    });

    console.log('🤖 AI Verification Complete:', {
      riskScore: verificationResult.riskScore,
      autoApprove: verificationResult.autoApprove,
      flags: verificationResult.flags,
    });

    // ✅ DETERMINE APPROVAL STATUS BASED ON AI RESULT
    let approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED_AI' = 'PENDING';
    let rejectionReason: string | null = null;

    if (verificationResult.autoApprove) {
      approvalStatus = 'APPROVED';
      console.log('✅ First job auto-approved by AI');
    } else if (verificationResult.riskScore > 70) {
      approvalStatus = 'REJECTED_AI';
      rejectionReason = `Auto-rejected by AI verification (Risk Score: ${verificationResult.riskScore}/100):\n\n${verificationResult.flagReason}`;
      console.log('❌ First job auto-rejected by AI (high risk)');
    } else {
      approvalStatus = 'PENDING';
      console.log('⚠️ First job flagged for human review');
    }

    // ✅ GEOCODE JOB LOCATION with all fields
    let coordinates: { latitude: number; longitude: number } | null = null;

    console.log(`📍 Geocoding job location: ${cityTrimmed}, ${stateTrimmed}`);

    const geocodingResult = await geocodeAddress(
      addressTrimmed,
      cityTrimmed,
      stateTrimmed,
      postcodeTrimmed
    );

    if (geocodingResult) {
      coordinates = {
        latitude: geocodingResult.latitude,
        longitude: geocodingResult.longitude,
      };
      console.log(
        `✅ Job geocoding successful: ${JSON.stringify(coordinates)}`
      );
    } else {
      console.warn(`⚠️ Job geocoding failed, continuing without coordinates`);
    }

    let job;

    // UPSERT: Update if jobId provided, create otherwise
    if (jobId) {
      // Update existing job
      job = await prisma.job.update({
        where: { id: parseInt(jobId) },
        data: {
          title,
          industryId,
          jobType,
          workingHours: 'FLEXIBLE',
          experienceLevel: 'ENTRY_LEVEL',
          city: cityTrimmed,
          state: stateTrimmed,
          address: addressTrimmed,
          postcode: postcodeTrimmed,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          description,
          requirements,
          benefits,
          salaryMin,
          salaryMax,
          salaryType: salaryMin || salaryMax ? 'MONTHLY' : null,
          skills,
          approvalStatus,
          isActive: approvalStatus === 'APPROVED',
          approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
          rejectedAt: approvalStatus === 'REJECTED_AI' ? new Date() : null,
          rejectionReason,
        },
        include: {
          industry: true,
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              city: true,
              state: true,
            },
          },
        },
      });
    } else {
      // Create new job
      let slug = slugify(title, { lower: true, strict: true });

      const existingJob = await prisma.job.findUnique({
        where: { slug },
      });

      if (existingJob) {
        slug = `${slug}-${Date.now()}`;
      }

      job = await prisma.job.create({
        data: {
          companyId,
          title,
          slug,
          industryId,
          jobType,
          workingHours: 'FLEXIBLE',
          experienceLevel: 'ENTRY_LEVEL',
          city: cityTrimmed,
          state: stateTrimmed,
          address: addressTrimmed,
          postcode: postcodeTrimmed,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          description,
          requirements,
          benefits,
          salaryMin,
          salaryMax,
          salaryType: salaryMin || salaryMax ? 'MONTHLY' : null,
          skills,
          approvalStatus,
          isActive: approvalStatus === 'APPROVED',
          approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
          rejectedAt: approvalStatus === 'REJECTED_AI' ? new Date() : null,
          rejectionReason,
          createdBy: company.userId,
        },
        include: {
          industry: true,
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              city: true,
              state: true,
            },
          },
        },
      });
    }

    // Update company onboarding status to complete
    await prisma.company.update({
      where: { id: companyId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    });

    // ✅ SEND NOTIFICATIONS BASED ON APPROVAL STATUS
    if (approvalStatus === 'APPROVED' && company.userId) {
      await sendJobApprovedNotification(company.userId, job.title, job.id);

      const matchingUsers = await findMatchingJobSeekers(job);
      for (const matchUser of matchingUsers) {
        await sendJobMatchNotification(
          matchUser.id,
          job.title,
          job.company.name,
          job.slug
        );
      }

      console.log(
        `✅ First job approved and notifications sent to ${matchingUsers.length} matching users`
      );
    } else if (approvalStatus === 'REJECTED_AI' && company.userId) {
      await prisma.notification.create({
        data: {
          userId: company.userId,
          title: 'Job Post Rejected by AI',
          message: `Your job post "${job.title}" was rejected by our automated review. You can appeal this decision if you believe this is a legitimate job posting.`,
          type: 'SYSTEM_UPDATE',
          actionUrl: `/employer/jobs/${job.id}`,
        },
      });
      console.log(
        '❌ First job rejected by AI, employer notified with appeal option'
      );
    } else if (company.userId) {
      await prisma.notification.create({
        data: {
          userId: company.userId,
          title: 'Job Post Under Review',
          message: `Your job post "${job.title}" is being reviewed by our team. You'll be notified once it's approved.`,
          type: 'SYSTEM_UPDATE',
          actionUrl: `/employer/jobs/${job.id}`,
        },
      });
      console.log('⚠️ First job pending review, employer notified');
    }

    // Trigger translation in background
    if (approvalStatus === 'APPROVED') {
      translateJobs().catch((err) =>
        console.error('Translation error for job:', err)
      );
    }

    return res.status(jobId ? 200 : 201).json({
      success: true,
      jobId: job.id,
      message:
        approvalStatus === 'APPROVED'
          ? jobId
            ? 'Job post updated and approved automatically by AI!'
            : 'Job post created and approved automatically by AI!'
          : approvalStatus === 'REJECTED_AI'
          ? 'Job post rejected by AI verification. You can appeal this decision from your job posts page.'
          : jobId
          ? 'Job post updated and is pending human review.'
          : 'Job post created and is pending human review.',
      data: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        jobType: job.jobType,
        city: job.city,
        state: job.state,
        address: job.address,
        postcode: job.postcode,
        isActive: job.isActive,
        industryId: job.industryId,
        approvalStatus: job.approvalStatus,
        latitude: job.latitude,
        longitude: job.longitude,
        geocoded: coordinates !== null,
        aiVerification: {
          riskScore: verificationResult.riskScore,
          flags: verificationResult.flags,
          autoApproved: verificationResult.autoApprove,
          summary:
            AIJobVerificationService.generateVerificationSummary(
              verificationResult
            ),
          canAppeal: approvalStatus === 'REJECTED_AI',
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error in createFirstJob:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// GET: Employer Profile
// ===================================================================
export const getEmployerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            industry: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ✅ Generate signed URLs for company logo and verification document
    if (user.company) {
      if (user.company.logo) {
        try {
          const signedLogoUrl = await getSignedDownloadUrl(
            user.company.logo,
            3600
          );
          user.company.logo = signedLogoUrl;
        } catch (error) {
          console.error('Error generating signed URL for logo:', error);
        }
      }

      if (user.company.verificationDocument) {
        try {
          const signedDocUrl = await getSignedDownloadUrl(
            user.company.verificationDocument,
            3600
          );
          user.company.verificationDocument = signedDocUrl;
        } catch (error) {
          console.error(
            'Error generating signed URL for verification document:',
            error
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        company: user.company,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// GET: Industries (serves as job categories with multilingual support)
// ===================================================================
export const getIndustries = async (req: Request, res: Response) => {
  try {
    const { lang = 'en' } = req.query;

    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        name_ms: true,
        name_zh: true,
        name_ta: true,
        slug: true,
        icon: true,
        description: true,
        description_ms: true,
        description_zh: true,
        description_ta: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Map to return the appropriate language
    const localizedIndustries = industries.map((ind) => {
      let localizedName = ind.name;
      let localizedDescription = ind.description;

      switch (lang) {
        case 'ms':
          localizedName = ind.name_ms || ind.name;
          localizedDescription = ind.description_ms || ind.description;
          break;
        case 'zh':
          localizedName = ind.name_zh || ind.name;
          localizedDescription = ind.description_zh || ind.description;
          break;
        case 'ta':
          localizedName = ind.name_ta || ind.name;
          localizedDescription = ind.description_ta || ind.description;
          break;
      }

      return {
        id: ind.id,
        name: localizedName,
        slug: ind.slug,
        icon: ind.icon,
        description: localizedDescription,
      };
    });

    return res.status(200).json({
      success: true,
      data: localizedIndustries,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// PATCH: Update Company Profile (for later edits)
// ===================================================================
export const updateCompanyProfile = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.slug;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.onboardingCompleted;
    delete updateData.onboardingStep;

    const company = await prisma.company.update({
      where: { id: parseInt(companyId) },
      data: updateData,
    });

    // Trigger translation if name or description was updated
    if (updateData.name || updateData.description) {
      await translateCompanies().catch((err) =>
        console.error('Translation error for company update:', err)
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Company profile updated successfully',
      data: company,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// GET: Check Onboarding Status
// ===================================================================
export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: parseInt(companyId) },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
        verificationStatus: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// PATCH: Complete Onboarding
// ===================================================================
export const completeOnboarding = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.update({
      where: { id: parseInt(companyId) },
      data: {
        onboardingCompleted: true,
        onboardingStep: 6, // Review step completed
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        onboardingCompleted: company.onboardingCompleted,
        onboardingStep: company.onboardingStep,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// GET: Employer Dashboard Stats
// ===================================================================
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Get userId from authenticated request
    const userId = req.user!.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user',
      });
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found. Please complete onboarding first.',
      });
    }

    const companyId = user.company.id;

    // Get total jobs count
    const totalJobs = await prisma.job.count({
      where: { companyId },
    });

    // Get active jobs count
    const activeJobs = await prisma.job.count({
      where: {
        companyId,
        isActive: true,
      },
    });

    // Get closed jobs count
    const closedJobs = await prisma.job.count({
      where: {
        companyId,
        isActive: false,
      },
    });

    // Get total applicants across all jobs
    const totalApplicants = await prisma.jobApplication.count({
      where: {
        job: {
          companyId,
        },
      },
    });

    // Get pending applicants count
    const pendingApplicants = await prisma.jobApplication.count({
      where: {
        job: {
          companyId,
        },
        status: 'PENDING',
      },
    });

    // Get shortlisted applicants count
    const shortlistedApplicants = await prisma.jobApplication.count({
      where: {
        job: {
          companyId,
        },
        status: 'SHORTLISTED',
      },
    });

    // Get recent jobs (last 5)
    const recentJobs = await prisma.job.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Format recent jobs
    const formattedRecentJobs = recentJobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.isActive ? 'ACTIVE' : 'CLOSED',
      applicants: job._count.applications,
      createdAt: job.createdAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        closedJobs,
        totalApplicants,
        pendingApplicants,
        shortlistedApplicants,
        recentJobs: formattedRecentJobs,
        companyName: user.company.name,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// GET: Employer's Job Posts
// ===================================================================
// backend/src/controllers/employerController.ts

export const getEmployerJobs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const companyId = user.company.id;

    // ✅ Get all jobs with company logo included
    const jobs = await prisma.job.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        slug: true,
        jobType: true,
        city: true,
        state: true,
        salaryMin: true,
        salaryMax: true,
        isActive: true,
        approvalStatus: true,
        rejectionReason: true,
        approvedAt: true,
        rejectedAt: true,
        viewCount: true,
        applicationCount: true,
        estimatedHireDaysMin: true, // ✅ Include if you have this field
        estimatedHireDaysMax: true, // ✅ Include if you have this field
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            applications: true,
          },
        },
        // ✅ Include company with logo
        company: {
          select: {
            id: true,
            name: true,
            logo: true, // ← Include logo key
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // ✅ Generate signed URLs for company logos
    const jobsWithSignedLogos = await Promise.all(
      jobs.map(async (job) => {
        const jobData = { ...job };

        // Generate signed URL for company logo if exists
        if (jobData.company?.logo) {
          try {
            const signedLogoUrl = await getSignedDownloadUrl(
              jobData.company.logo,
              3600
            );
            jobData.company.logo = signedLogoUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for company logo:',
              error
            );
            jobData.company.logo = null;
          }
        }

        return jobData;
      })
    );

    return res.status(200).json({
      success: true,
      data: jobsWithSignedLogos,
    });
  } catch (error: any) {
    console.error('Error fetching employer jobs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// ===================================================================
// PATCH: Toggle Job Status (Active/Closed)
// ===================================================================
export const toggleJobStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Get the job and verify ownership
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (job.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this job',
      });
    }

    // Toggle the status
    const updatedJob = await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        isActive: !job.isActive,
        updatedBy: userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Job ${
        updatedJob.isActive ? 'activated' : 'closed'
      } successfully`,
      data: {
        id: updatedJob.id,
        isActive: updatedJob.isActive,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// GET: Applicants List (Paginated)
export const getApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { page = '1', limit = '20', status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      job: {
        companyId: user.company.id,
      },
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              profile: {
                select: {
                  profilePicture: true,
                },
              },
            },
          },
          job: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: {
          appliedAt: 'desc',
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    // ✅ Generate signed URLs for profile pictures
    const applicationsWithSignedUrls = await Promise.all(
      applications.map(async (application) => {
        const appData = { ...application };

        // Generate signed URL for profile picture if exists
        if (appData.user?.profile?.profilePicture) {
          try {
            const signedProfileUrl = await getSignedDownloadUrl(
              appData.user.profile.profilePicture,
              3600
            );
            appData.user.profile.profilePicture = signedProfileUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for profile picture:',
              error
            );
            appData.user.profile.profilePicture = null;
          }
        }

        return appData;
      })
    );

    return res.status(200).json({
      success: true,
      data: applicationsWithSignedUrls,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching applicants:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applicants',
    });
  }
};

// GET: Applicant Detail
export const getApplicantDetail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { applicationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            profile: {
              select: {
                experienceYears: true,
                city: true,
                state: true,
                profilePicture: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            jobType: true,
            city: true,
            state: true,
            companyId: true,
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

    // Verify ownership
    if (application.job.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application',
      });
    }

    if (application.user?.profile?.profilePicture) {
      try {
        const signedProfileUrl = await getSignedDownloadUrl(
          application.user.profile.profilePicture,
          3600
        );
        application.user.profile.profilePicture = signedProfileUrl;
      } catch (error) {
        console.error(
          'Error generating signed URL for profile picture:',
          error
        );
        application.user.profile.profilePicture = null;
      }
    }

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error: any) {
    console.error('Error fetching applicant detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applicant details',
    });
  }
};

// PATCH: Shortlist Applicant
export const shortlistApplicant = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { applicationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: { job: true },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (application.job.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: parseInt(applicationId) },
      data: { status: 'SHORTLISTED' },
    });

    return res.status(200).json({
      success: true,
      message: 'Applicant shortlisted successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error shortlisting applicant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to shortlist applicant',
    });
  }
};

// PATCH: Reject Applicant
export const rejectApplicant = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { applicationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: parseInt(applicationId) },
      include: { job: true },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (application.job.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: parseInt(applicationId) },
      data: { status: 'REJECTED' },
    });

    return res.status(200).json({
      success: true,
      message: 'Applicant rejected',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error rejecting applicant:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject applicant',
    });
  }
};

/**
 * Get employer's company verification status
 */
export const getVerificationStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const company = await prisma.company.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        verificationRemark: true,
        verifiedDate: true,
        createdAt: true,
        industry: {
          select: {
            id: true,
            name: true,
          },
        },
        city: true,
        state: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
    });
  }
};

/**
 * Resubmit company after rejection
 */
export const resubmitCompany = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // First, check if company exists and is rejected
    const existingCompany = await prisma.company.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    if (existingCompany.verificationStatus !== 'Rejected') {
      return res.status(400).json({
        success: false,
        message: `Company is currently ${existingCompany.verificationStatus}. Only rejected companies can be resubmitted.`,
      });
    }

    // Update company status to Pending
    const company = await prisma.company.update({
      where: { userId },
      data: {
        verificationStatus: 'Pending',
        verificationRemark: null, // Clear previous rejection reason
      },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        verifiedDate: true,
      },
    });

    // Log the resubmission
    console.log(
      `[RESUBMISSION] Company ${company.name} (ID: ${company.id}) resubmitted for verification`
    );

    res.json({
      success: true,
      message: 'Company resubmitted for verification successfully',
      data: company,
    });
  } catch (error) {
    console.error('Error resubmitting company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubmit company',
    });
  }
};

// Helper function to find matching job seekers
const findMatchingJobSeekers = async (job: any) => {
  const users = await prisma.user.findMany({
    where: {
      role: 'JOB_SEEKER',
      isActive: true,
      profile: {
        industries: {
          some: {
            industryId: job.industryId,
          },
        },
      },
    },
    take: 50, // Limit to prevent spam
  });

  return users;
};
