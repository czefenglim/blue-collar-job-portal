// src/controllers/jobAppeal.controller.ts

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translateText } from '../services/googleTranslation';
import { AuthRequest } from '../types/user';
import { uploadToS3 } from '../services/s3Service';
import { AdminAuthRequest } from '../types/admin';

const prisma = new PrismaClient();

/**
 * ✅ Employer submits an appeal for a rejected job
 * POST /api/employer/jobs/:jobId/appeal
 */
export const submitJobAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { jobId } = req.params;
    const { explanation } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!explanation || explanation.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message:
          'Please provide a detailed explanation (minimum 50 characters)',
      });
    }

    // ✅ Verify job ownership and status
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
      include: {
        company: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (job.company?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to appeal this job',
      });
    }

    if (job.approvalStatus !== 'REJECTED_AI') {
      return res.status(400).json({
        success: false,
        message:
          'This job cannot be appealed. Only AI-rejected jobs can be appealed.',
      });
    }

    // ✅ Check if appeal already exists
    const existingAppeal = await prisma.jobAppeal.findFirst({
      where: {
        jobId: parseInt(jobId),
        employerId: userId,
      },
    });

    if (existingAppeal) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an appeal for this job',
      });
    }

    // ✅ Upload evidence files to S3 - FIXED!
    const evidenceUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          // ✅ Use the same way as other functions: uploadToS3(file, folder)
          const fileUrl = await uploadToS3(file, 'appeals');
          evidenceUrls.push(fileUrl);
        } catch (uploadError) {
          console.error('Error uploading evidence file:', uploadError);
          // Continue with other files even if one fails
        }
      }
    }

    // ✅ Create appeal
    const e_en = await translateText(explanation.trim(), 'en');
    const e_ms = await translateText(explanation.trim(), 'ms');
    const e_ta = await translateText(explanation.trim(), 'ta');
    const e_zh = await translateText(explanation.trim(), 'zh');
    const appeal = await prisma.jobAppeal.create({
      data: {
        jobId: parseInt(jobId),
        employerId: userId,
        explanation: explanation.trim(),
        explanation_en: e_en ?? undefined,
        explanation_ms: e_ms ?? undefined,
        explanation_ta: e_ta ?? undefined,
        explanation_zh: e_zh ?? undefined,
        evidence: evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null,
        status: 'PENDING',
      },
    });

    // ✅ Update job approval status to APPEALED
    await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        approvalStatus: 'APPEALED',
      },
    });

    // ✅ Send notification to employer
    const notifMsg = `Your appeal for "${job.title}" has been submitted and will be reviewed by our team.`;
    const notif_en = await translateText(notifMsg, 'en');
    const notif_ms = await translateText(notifMsg, 'ms');
    const notif_ta = await translateText(notifMsg, 'ta');
    const notif_zh = await translateText(notifMsg, 'zh');
    await prisma.notification.create({
      data: {
        userId,
        title: 'Appeal Submitted',
        message: notifMsg,
        message_en: notif_en ?? undefined,
        message_ms: notif_ms ?? undefined,
        message_ta: notif_ta ?? undefined,
        message_zh: notif_zh ?? undefined,
        type: 'SYSTEM_UPDATE',
        actionUrl: `/(employer-hidden)/job-post-details/${jobId}`,
      },
    });

    console.log(`✅ Appeal submitted for job #${jobId} by user #${userId}`);
    if (evidenceUrls.length > 0) {
      console.log(`📎 ${evidenceUrls.length} evidence files uploaded to S3`);
      console.log(`📂 Files:`, evidenceUrls);
    }

    return res.status(201).json({
      success: true,
      message:
        'Appeal submitted successfully. Our team will review your request.',
      data: {
        appealId: appeal.id,
        status: appeal.status,
        submittedAt: appeal.createdAt,
        evidenceCount: evidenceUrls.length,
        evidenceUrls: evidenceUrls, // Optional: return URLs to frontend
      },
    });
  } catch (error: any) {
    console.error('❌ Error submitting appeal:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * ✅ Admin reviews an appeal (approve or reject)
 * PATCH /api/admin/appeals/:appealId/review
 */
export const reviewJobAppeal = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminEmail = req.adminEmail;
    const { appealId } = req.params;
    const { decision, reviewNotes } = req.body;

    if (!adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Must be APPROVE or REJECT',
      });
    }

    // ✅ Get appeal with job details
    const appeal = await prisma.jobAppeal.findUnique({
      where: { id: parseInt(appealId) },
      include: {
        job: {
          include: {
            company: true,
          },
        },
        employer: true,
      },
    });

    if (!appeal) {
      return res.status(404).json({
        success: false,
        message: 'Appeal not found',
      });
    }

    if (appeal.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This appeal has already been reviewed',
      });
    }

    // ✅ Update appeal status
    const rn_en = reviewNotes ? await translateText(reviewNotes, 'en') : null;
    const rn_ms = reviewNotes ? await translateText(reviewNotes, 'ms') : null;
    const rn_ta = reviewNotes ? await translateText(reviewNotes, 'ta') : null;
    const rn_zh = reviewNotes ? await translateText(reviewNotes, 'zh') : null;
    const updatedAppeal = await prisma.jobAppeal.update({
      where: { id: parseInt(appealId) },
      data: {
        status: decision === 'APPROVE' ? 'ACCEPTED' : 'REJECTED',
        adminDecision: decision,
        reviewNotes: reviewNotes || null,
        reviewNotes_en: rn_en ?? undefined,
        reviewNotes_ms: rn_ms ?? undefined,
        reviewNotes_ta: rn_ta ?? undefined,
        reviewNotes_zh: rn_zh ?? undefined,
        reviewedAt: new Date(),
        // Note: reviewedBy should be admin user ID, but we're using email for now
        // You may need to adjust this based on your admin user structure
      },
    });

    // ✅ Update job approval status
    const newJobStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED_FINAL';

    await prisma.job.update({
      where: { id: appeal.jobId },
      data: {
        approvalStatus: newJobStatus,
        isActive: decision === 'APPROVE',
        approvedAt: decision === 'APPROVE' ? new Date() : null,
        rejectedAt: decision === 'REJECT' ? new Date() : null,
      },
    });

    // ✅ Log admin action
    const reasonText = reviewNotes || `Appeal ${decision.toLowerCase()}ed`;
    const r_en = await translateText(reasonText, 'en');
    const r_ms = await translateText(reasonText, 'ms');
    const r_ta = await translateText(reasonText, 'ta');
    const r_zh = await translateText(reasonText, 'zh');
    await prisma.adminAction.create({
      data: {
        adminEmail,
        actionType:
          decision === 'APPROVE' ? 'APPROVE_COMPANY' : 'REJECT_COMPANY',
        targetType: 'JOB_APPEAL',
        targetId: appeal.jobId,
        reason: reasonText,
        reason_en: r_en ?? undefined,
        reason_ms: r_ms ?? undefined,
        reason_ta: r_ta ?? undefined,
        reason_zh: r_zh ?? undefined,
        notes: `Appeal ID: ${appealId}`,
      },
    });

    // ✅ Notify employer
    const notificationMessage =
      decision === 'APPROVE'
        ? `Your appeal for "${appeal.job.title}" has been approved. Your job post is now live!`
        : `Your appeal for "${
            appeal.job.title
          }" has been rejected. This decision is final.${
            reviewNotes ? ` Reason: ${reviewNotes}` : ''
          }`;

    const n_en = await translateText(notificationMessage, 'en');
    const n_ms = await translateText(notificationMessage, 'ms');
    const n_ta = await translateText(notificationMessage, 'ta');
    const n_zh = await translateText(notificationMessage, 'zh');
    await prisma.notification.create({
      data: {
        userId: appeal.employerId,
        title: decision === 'APPROVE' ? 'Appeal Approved' : 'Appeal Rejected',
        message: notificationMessage,
        message_en: n_en ?? undefined,
        message_ms: n_ms ?? undefined,
        message_ta: n_ta ?? undefined,
        message_zh: n_zh ?? undefined,
        type: 'SYSTEM_UPDATE',
        actionUrl: `/(employer-hidden)/job-post-details/${appeal.jobId}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Appeal ${decision.toLowerCase()}ed successfully`,
      data: {
        appealId: updatedAppeal.id,
        decision,
        jobStatus: newJobStatus,
        reviewedAt: updatedAppeal.reviewedAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Error reviewing appeal:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * ✅ Get all appeals for admin
 * GET /api/admin/appeals
 */
export const getAllAppeals = async (req: AdminAuthRequest, res: Response) => {
  try {
    const adminEmail = req.adminEmail;

    if (!adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    const [appeals, total] = await Promise.all([
      prisma.jobAppeal.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          job: {
            include: {
              company: true,
              industry: true,
            },
          },
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.jobAppeal.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        appeals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching appeals:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * ✅ Get a single appeal details
 * GET /api/admin/appeals/:appealId
 */
export const getAppealById = async (req: AuthRequest, res: Response) => {
  try {
    const adminEmail = req.user?.email;
    const { appealId } = req.params;

    if (!adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const appeal = await prisma.jobAppeal.findUnique({
      where: { id: parseInt(appealId) },
      include: {
        job: {
          include: {
            company: true,
            industry: true,
          },
        },
        employer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
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

    if (!appeal) {
      return res.status(404).json({
        success: false,
        message: 'Appeal not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: appeal,
    });
  } catch (error: any) {
    console.error('❌ Error fetching appeal:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
