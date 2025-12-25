import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translateText } from '../services/googleTranslation';
import {
  uploadToS3,
  deleteFromS3,
  generatePresignedUrlsForEvidence,
} from '../services/s3Service';
import { AdminAuthRequest } from '../types/admin';
import { AuthRequest, MulterAuthRequest } from '../types/common';
import { Appeal } from '../types/appeal';
import { Report } from '../types/report';
import multer from 'multer';
import {
  sendAppealAcceptedNotification,
  sendAppealRejectedNotification,
} from '../utils/notificationHelper';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/heic',
      'application/pdf',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only JPG, PNG, and PDF files are allowed.'
        )
      );
    }
  },
});

// Helper function to add presigned URLs to appeal
async function addPresignedUrlsToAppeal(appeal: Appeal) {
  if (appeal.evidence) {
    try {
      const evidenceUrls = JSON.parse(appeal.evidence);
      const presignedUrls = await Promise.all(
        evidenceUrls.map((url: string) =>
          generatePresignedUrlsForEvidence(JSON.stringify([url]))
        )
      );
      return {
        ...appeal,
        evidenceUrls: presignedUrls.flat(),
        evidence: appeal.evidence,
      };
    } catch (error) {
      console.error('Error generating presigned URLs:', error);
    }
  }
  return {
    ...appeal,
    evidenceUrls: [],
  };
}

// Get employer's reports
export const getEmployerReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify user is an employer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || user.role !== 'EMPLOYER' || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employer only.',
      });
    }

    // Get all reports for jobs posted by this employer's company
    const reports = await prisma.report.findMany({
      where: {
        job: {
          companyId: user.company.id,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            isSuspended: true,
            suspensionReason: true,
            isActive: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        appeals: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add presigned URLs to all reports
    const reportsWithPresignedUrls = await Promise.all(
      reports.map(async (report: Report) => {
        let evidenceUrls: string[] = [];
        const r = report as unknown as Report;
        if (r.evidence) {
          evidenceUrls = await generatePresignedUrlsForEvidence(r.evidence);
        }
        return {
          ...report,
          evidenceUrls,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: reportsWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error fetching employer reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get employer report by ID
export const getEmployerReportById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify user is an employer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || user.role !== 'EMPLOYER' || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employer only.',
      });
    }

    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            isSuspended: true,
            suspensionReason: true,
            isActive: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        appeals: {
          include: {
            reviewer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Verify the report belongs to employer's company
    if (report.job.company.id !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Add presigned URLs
    let evidenceUrls: string[] = [];
    if (report.evidence) {
      evidenceUrls = await generatePresignedUrlsForEvidence(report.evidence);
    }

    // Add presigned URLs to appeals
    const appealsWithUrls = await Promise.all(
      report.appeals.map((appeal: Appeal) =>
        addPresignedUrlsToAppeal(appeal as unknown as Appeal)
      )
    );

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        evidenceUrls,
        appeals: appealsWithUrls,
      },
    });
  } catch (error) {
    console.error('Error fetching employer report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Submit an appeal
export const submitAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { reportId, explanation } = req.body;
    const files = (req as MulterAuthRequest).files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate required fields
    if (!reportId || !explanation) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and explanation are required',
      });
    }

    // Validate explanation length
    if (explanation.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Explanation must be at least 20 characters long',
      });
    }

    // Verify user is an employer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || user.role !== 'EMPLOYER' || !user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employer only.',
      });
    }

    // Check if report exists and belongs to employer
    const report = await prisma.report.findUnique({
      where: { id: parseInt(reportId) },
      include: {
        job: {
          include: {
            company: true,
          },
        },
        appeals: {
          where: {
            status: {
              in: ['PENDING', 'UNDER_REVIEW'],
            },
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.job.company.id !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if report can be appealed
    if (!['RESOLVED', 'DISMISSED'].includes(report.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only resolved or dismissed reports can be appealed',
      });
    }

    // Check if there's already a pending appeal
    if (report.appeals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'There is already a pending appeal for this report',
      });
    }

    // Upload evidence files if any
    let evidenceUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const fileUrl = await uploadToS3(file, 'appeals');
          evidenceUrls.push(fileUrl);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
        }
      }
    }

    // Create appeal
    const e_en = await translateText(explanation.trim(), 'en');
    const e_ms = await translateText(explanation.trim(), 'ms');
    const e_ta = await translateText(explanation.trim(), 'ta');
    const e_zh = await translateText(explanation.trim(), 'zh');
    const appeal = await prisma.appeal.create({
      data: {
        reportId: parseInt(reportId),
        employerId: userId,
        explanation: explanation.trim(),
        explanation_en: e_en ?? undefined,
        explanation_ms: e_ms ?? undefined,
        explanation_ta: e_ta ?? undefined,
        explanation_zh: e_zh ?? undefined,
        evidence: evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null,
      },
      include: {
        employer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Update report status to indicate appeal is pending
    await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status: 'PENDING_EMPLOYER_RESPONSE',
      },
    });

    // Add presigned URLs to response
    const appealWithPresignedUrls = await addPresignedUrlsToAppeal(appeal);

    return res.status(201).json({
      success: true,
      message: 'Appeal submitted successfully',
      data: appealWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error submitting appeal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit appeal',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Admin: Get all appeals
export const getAllAppeals = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        include: {
          employer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          report: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  company: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.appeal.count({ where: where as any }),
    ]);

    // Add presigned URLs to all appeals
    const appealsWithPresignedUrls = await Promise.all(
      appeals.map((appeal: Appeal) =>
        addPresignedUrlsToAppeal(appeal as unknown as Appeal)
      )
    );

    return res.status(200).json({
      success: true,
      data: appealsWithPresignedUrls,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching appeals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appeals',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Admin: Review appeal
export const reviewAppeal = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!adminId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    if (!['ACCEPTED', 'REJECTED_FINAL'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACCEPTED or REJECTED_FINAL',
      });
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: parseInt(id) },
      include: {
        report: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!appeal) {
      return res.status(404).json({
        success: false,
        message: 'Appeal not found',
      });
    }

    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: req.adminEmail },
    });

    // Update appeal
    const rnText = reviewNotes || null;
    const rn_en = rnText ? await translateText(rnText, 'en') : null;
    const rn_ms = rnText ? await translateText(rnText, 'ms') : null;
    const rn_ta = rnText ? await translateText(rnText, 'ta') : null;
    const rn_zh = rnText ? await translateText(rnText, 'zh') : null;
    const updatedAppeal = await prisma.appeal.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewNotes,
        reviewNotes_en: rn_en ?? undefined,
        reviewNotes_ms: rn_ms ?? undefined,
        reviewNotes_ta: rn_ta ?? undefined,
        reviewNotes_zh: rn_zh ?? undefined,
        reviewedBy: adminUser?.id || null,
        reviewedAt: new Date(),
      },
      include: {
        employer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        report: {
          include: {
            job: true,
          },
        },
      },
    });

    if (status === 'ACCEPTED') {
      await sendAppealAcceptedNotification(
        appeal.employerId,
        appeal.reportId,
        appeal.report.job.title
      );
    } else if (status === 'REJECTED') {
      await sendAppealRejectedNotification(
        appeal.employerId,
        appeal.reportId,
        reviewNotes || 'Appeal did not meet criteria'
      );
    }

    // If appeal is accepted, restore the job
    if (status === 'ACCEPTED') {
      await prisma.job.update({
        where: { id: appeal.report.jobId },
        data: {
          isSuspended: false,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
          isActive: true,
        },
      });

      // Update report status
      await prisma.report.update({
        where: { id: appeal.reportId },
        data: {
          status: 'DISMISSED',
        },
      });

      // Log admin action
      const r_en = await translateText(reviewNotes || 'Appeal accepted', 'en');
      await prisma.adminAction.create({
        data: {
          adminEmail: req.adminEmail!,
          actionType: 'UNSUSPEND_JOB',
          targetType: 'JOB',
          targetId: appeal.report.jobId,
          reason: reviewNotes || 'Appeal accepted',
          reason_en: r_en ?? undefined,
          notes: `Appeal #${appeal.id} accepted`,
        },
      });
    } else {
      // Appeal rejected - keep job suspended/deleted
      await prisma.report.update({
        where: { id: appeal.reportId },
        data: {
          status: 'RESOLVED',
        },
      });
    }

    // Add presigned URLs
    const appealWithPresignedUrls = await addPresignedUrlsToAppeal(
      updatedAppeal
    );

    return res.status(200).json({
      success: true,
      message: 'Appeal reviewed successfully',
      data: appealWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error reviewing appeal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to review appeal',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
