import { Request, Response } from 'express';
import { PrismaClient, Prisma, ReportStatus } from '@prisma/client';
import { translateText } from '../services/googleTranslation';
import { SupportedLang, labelEnum } from '../utils/enumLabels';
import {
  uploadToS3,
  deleteFromS3,
  generatePresignedUrlsForEvidence,
} from '../services/s3Service';
import { AdminAuthRequest } from '../types/admin';
import { AuthRequest, MulterAuthRequest } from '../types/common';
import { Report } from '../types/report';
import multer from 'multer';
import { ReportWhereInput } from '../types/input';

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

// Helper function to add presigned URLs to report
async function addPresignedUrlsToReport(report: Report) {
  if (report.evidence) {
    const presignedUrls = await generatePresignedUrlsForEvidence(
      report.evidence
    );
    return {
      ...report,
      evidenceUrls: presignedUrls, // Add presigned URLs
      evidence: report.evidence, // Keep original for reference
    };
  }
  return {
    ...report,
    evidenceUrls: [],
  };
}

// Create a new report
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { jobId, reportType, description } = req.body;
    const files = (req as MulterAuthRequest).files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate required fields
    if (!jobId || !reportType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Job ID, report type, and description are required',
      });
    }

    // Validate description length
    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters long',
      });
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check if user already reported this job
    const existingReport = await prisma.report.findFirst({
      where: {
        userId,
        jobId: parseInt(jobId),
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
      },
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this job. Please wait for review.',
      });
    }

    // Upload evidence files if any
    let evidenceUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const fileUrl = await uploadToS3(file, 'reports');
          evidenceUrls.push(fileUrl);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          // Continue with other files
        }
      }
    }

    // Create report
    const d_ms = await translateText(description.trim(), 'ms');
    const d_ta = await translateText(description.trim(), 'ta');
    const d_zh = await translateText(description.trim(), 'zh');
    const d_en = await translateText(description.trim(), 'en');
    const report = await prisma.report.create({
      data: {
        userId,
        jobId: parseInt(jobId),
        reportType,
        description: description.trim(),
        description_ms: d_ms ?? undefined,
        description_ta: d_ta ?? undefined,
        description_zh: d_zh ?? undefined,
        description_en: d_en ?? undefined,
        evidence: evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Add presigned URLs to response
    const reportWithPresignedUrls = await addPresignedUrlsToReport(
      report as unknown as Report
    );

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: reportWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get user's reports
export const getUserReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const reports = await prisma.report.findMany({
      where: { userId },
      include: {
        user: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add presigned URLs to all reports
    const reportsWithPresignedUrls = await Promise.all(
      reports.map((report: Report) =>
        addPresignedUrlsToReport(report as unknown as Report)
      )
    );

    return res.status(200).json({
      success: true,
      data: reportsWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get report by ID
export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
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
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Only allow user to view their own reports (or admin)
    if (report.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Add presigned URLs
    const reportWithPresignedUrls = await addPresignedUrlsToReport(
      report as unknown as Report
    );

    return res.status(200).json({
      success: true,
      data: reportWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update report status (Admin only)
export const updateReportStatus = async (
  req: AdminAuthRequest,
  res: Response
) => {
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

    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // For admin, we need to find the user ID from the admin email
    const adminUser = await prisma.user.findUnique({
      where: { email: req.adminEmail },
    });

    const rnText = reviewNotes || null;
    const rn_ms = rnText ? await translateText(rnText, 'ms') : null;
    const rn_ta = rnText ? await translateText(rnText, 'ta') : null;
    const rn_zh = rnText ? await translateText(rnText, 'zh') : null;
    const rn_en = rnText ? await translateText(rnText, 'en') : null;
    const updatedReport = await prisma.report.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewNotes,
        reviewNotes_ms: rn_ms ?? undefined,
        reviewNotes_ta: rn_ta ?? undefined,
        reviewNotes_zh: rn_zh ?? undefined,
        reviewNotes_en: rn_en ?? undefined,
        reviewedBy: adminUser?.id || null,
        reviewedAt: new Date(),
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
      },
    });

    // Add presigned URLs
    const reportWithPresignedUrls = await addPresignedUrlsToReport(
      updatedReport as unknown as Report
    );

    return res.status(200).json({
      success: true,
      message: 'Report status updated successfully',
      data: reportWithPresignedUrls,
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete report (User can only delete their own pending reports)
export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const report = await prisma.report.findUnique({
      where: { id: parseInt(id) },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Only allow user to delete their own pending reports
    if (report.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (report.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete report that is under review or resolved',
      });
    }

    // Delete evidence files from S3 if any
    if (report.evidence) {
      try {
        const evidenceUrls = JSON.parse(report.evidence);
        for (const url of evidenceUrls) {
          await deleteFromS3(url);
        }
      } catch (error) {
        console.error('Error deleting evidence files:', error);
      }
    }

    await prisma.report.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all reports (Admin only)
export const getAllReports = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const langParam: SupportedLang = (req.query.lang as SupportedLang) || 'en';

    const where: Prisma.ReportWhereInput = {};
    if (status) {
      where.status = status as ReportStatus;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.report.count({ where }),
    ]);

    // Add presigned URLs and localized labels to all reports
    const reportsWithPresignedUrls = await Promise.all(
      reports.map(async (report: Report) => {
        const withUrls = await addPresignedUrlsToReport(
          report as unknown as Report
        );
        const statusLabel = labelEnum(
          'JobReportStatus',
          report.status,
          langParam
        );
        return { ...withUrls, statusLabel };
      })
    );

    return res.status(200).json({
      success: true,
      data: reportsWithPresignedUrls,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching all reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
