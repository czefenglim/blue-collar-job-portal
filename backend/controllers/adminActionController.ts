import { Response } from 'express';
import {
  PrismaClient,
  AdminActionType,
  ReportStatus,
  NotificationType,
  AccountStatus,
} from '@prisma/client';
import { translateText } from '../services/googleTranslation';
import { AdminAuthRequest } from '../types/admin';

const prisma = new PrismaClient();

// Get job details for admin review
export const getJobForReview = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
      include: {
        company: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phoneNumber: true,
                status: true,
              },
            },
          },
        },
        industry: true,
        creator: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
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

    // Get total reports against this job
    const reportCount = await prisma.report.count({
      where: { jobId: parseInt(jobId) },
    });

    // Get total reports against this employer
    const employerReportCount = await prisma.report.count({
      where: {
        job: {
          companyId: job.companyId,
        },
      },
    });

    // Get recent reports for this job
    const recentReports = await prisma.report.findMany({
      where: { jobId: parseInt(jobId) },
      include: {
        user: {
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
      take: 5,
    });

    return res.status(200).json({
      success: true,
      data: {
        job,
        reportCount,
        employerReportCount,
        recentReports,
        applicationCount: job.applications.length,
      },
    });
  } catch (error) {
    console.error('Error fetching job for review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch job details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Suspend job
export const suspendJob = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const { reason, reportId } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason must be at least 10 characters',
      });
    }

    const adminEmail = req.adminEmail;

    // Suspend the job
    const sr_en = await translateText(reason.trim(), 'en');
    const sr_ms = await translateText(reason.trim(), 'ms');
    const sr_ta = await translateText(reason.trim(), 'ta');
    const sr_zh = await translateText(reason.trim(), 'zh');
    const job = await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedBy: adminEmail,
        suspensionReason: reason.trim(),
        suspensionReason_en: sr_en ?? undefined,
        suspensionReason_ms: sr_ms ?? undefined,
        suspensionReason_ta: sr_ta ?? undefined,
        suspensionReason_zh: sr_zh ?? undefined,
        isActive: false,
        approvalStatus: 'SUSPENDED',
      },
      include: {
        company: {
          include: {
            user: true,
          },
        },
      },
    });

    // Log admin action with translations
    const reasonText = reason.trim();
    const r_en = await translateText(reasonText, 'en');
    const r_ms = await translateText(reasonText, 'ms');
    const r_ta = await translateText(reasonText, 'ta');
    const r_zh = await translateText(reasonText, 'zh');
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: AdminActionType.SUSPEND_JOB,
        targetType: 'JOB',
        targetId: parseInt(jobId),
        reason: reasonText,
        reason_en: r_en ?? undefined,
        reason_ms: r_ms ?? undefined,
        reason_ta: r_ta ?? undefined,
        reason_zh: r_zh ?? undefined,
        notes: reportId ? `Related to report #${reportId}` : null,
      },
    });

    // If related to a report, update report status
    if (reportId) {
      // Find admin user for reviewedBy field
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      await prisma.report.update({
        where: { id: parseInt(reportId) },
        data: {
          status: ReportStatus.RESOLVED,
          reviewedBy: adminUser?.id || null,
          reviewedAt: new Date(),
          reviewNotes: `Job suspended: ${reason}`,
        },
      });

      // Notify the reporter
      const report = await prisma.report.findUnique({
        where: { id: parseInt(reportId) },
        include: { user: true },
      });

      if (report) {
        const notifMsg =
          'Your report has been reviewed and action has been taken. The job post has been suspended. Thank you for helping keep our platform safe.';
        const n_en = await translateText(notifMsg, 'en');
        const n_ms = await translateText(notifMsg, 'ms');
        const n_ta = await translateText(notifMsg, 'ta');
        const n_zh = await translateText(notifMsg, 'zh');
        await prisma.notification.create({
          data: {
            userId: report.userId,
            title: 'Report Resolved',
            message: notifMsg,
            message_en: n_en ?? undefined,
            message_ms: n_ms ?? undefined,
            message_ta: n_ta ?? undefined,
            message_zh: n_zh ?? undefined,
            type: NotificationType.SYSTEM_UPDATE,
          },
        });
      }
    }

    // Create notification for employer
    if (job.company.user) {
      const notifMsg = `Your job post "${job.title}" has been suspended. Reason: ${reason}. Please contact support if you believe this is a mistake.`;
      const n_en = await translateText(notifMsg, 'en');
      const n_ms = await translateText(notifMsg, 'ms');
      const n_ta = await translateText(notifMsg, 'ta');
      const n_zh = await translateText(notifMsg, 'zh');
      await prisma.notification.create({
        data: {
          userId: job.company.user.id,
          title: 'Job Post Suspended',
          message: notifMsg,
          message_en: n_en ?? undefined,
          message_ms: n_ms ?? undefined,
          message_ta: n_ta ?? undefined,
          message_zh: n_zh ?? undefined,
          type: NotificationType.SYSTEM_UPDATE,
          actionUrl: `/(employer-hidden)/job-post-details/${job.id}`,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job suspended successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error suspending job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to suspend job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete job
export const deleteJob = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const { reason, reportId } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Deletion reason must be at least 10 characters',
      });
    }

    const adminEmail = req.adminEmail;

    // Get job details before deletion
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

    // Log admin action before deletion
    const reasonText = reason.trim();
    const r_en = await translateText(reasonText, 'en');
    const r_ms = await translateText(reasonText, 'ms');
    const r_ta = await translateText(reasonText, 'ta');
    const r_zh = await translateText(reasonText, 'zh');
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: AdminActionType.DELETE_JOB,
        targetType: 'JOB',
        targetId: parseInt(jobId),
        reason: reasonText,
        reason_en: r_en ?? undefined,
        reason_ms: r_ms ?? undefined,
        reason_ta: r_ta ?? undefined,
        reason_zh: r_zh ?? undefined,
        notes: `Deleted job: ${job.title} (${job.slug})`,
      },
    });

    // If related to a report, update report status
    if (reportId) {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      const rn_en = await translateText(`Job deleted: ${reasonText}`, 'en');
      const rn_ms = await translateText(`Job deleted: ${reasonText}`, 'ms');
      const rn_ta = await translateText(`Job deleted: ${reasonText}`, 'ta');
      const rn_zh = await translateText(`Job deleted: ${reasonText}`, 'zh');
      await prisma.report.update({
        where: { id: parseInt(reportId) },
        data: {
          status: ReportStatus.RESOLVED,
          reviewedBy: adminUser?.id || null,
          reviewedAt: new Date(),
          reviewNotes: `Job deleted: ${reasonText}`,
          reviewNotes_en: rn_en ?? undefined,
          reviewNotes_ms: rn_ms ?? undefined,
          reviewNotes_ta: rn_ta ?? undefined,
          reviewNotes_zh: rn_zh ?? undefined,
        },
      });

      // Notify the reporter
      const report = await prisma.report.findUnique({
        where: { id: parseInt(reportId) },
        include: { user: true },
      });

      if (report) {
        const notifMsg =
          'Your report has been reviewed and the job post has been removed. Thank you for helping keep our platform safe.';
        const n_en = await translateText(notifMsg, 'en');
        const n_ms = await translateText(notifMsg, 'ms');
        const n_ta = await translateText(notifMsg, 'ta');
        const n_zh = await translateText(notifMsg, 'zh');
        await prisma.notification.create({
          data: {
            userId: report.userId,
            title: 'Report Resolved',
            message: notifMsg,
            message_en: n_en ?? undefined,
            message_ms: n_ms ?? undefined,
            message_ta: n_ta ?? undefined,
            message_zh: n_zh ?? undefined,
            type: NotificationType.SYSTEM_UPDATE,
          },
        });
      }
    }

    // Create notification for employer before deletion
    if (job.company.user) {
      const notifMsg = `Your job post "${job.title}" has been permanently deleted. Reason: ${reason}. Please contact support if you have questions.`;
      const n_en = await translateText(notifMsg, 'en');
      const n_ms = await translateText(notifMsg, 'ms');
      const n_ta = await translateText(notifMsg, 'ta');
      const n_zh = await translateText(notifMsg, 'zh');
      await prisma.notification.create({
        data: {
          userId: job.company.user.id,
          title: 'Job Post Deleted',
          message: notifMsg,
          message_en: n_en ?? undefined,
          message_ms: n_ms ?? undefined,
          message_ta: n_ta ?? undefined,
          message_zh: n_zh ?? undefined,
          type: 'SYSTEM_UPDATE',
        },
      });
    }

    // Delete the job (cascade will handle related records)
    await prisma.job.delete({
      where: { id: parseInt(jobId) },
    });

    return res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Suspend employer account
export const suspendEmployer = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason, duration, reportId } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason must be at least 10 characters',
      });
    }

    const adminEmail = req.adminEmail;

    // Suspend the employer
    const reasonText = reason.trim();
    const sr_en_user = await translateText(reasonText, 'en');
    const sr_ms_user = await translateText(reasonText, 'ms');
    const sr_ta_user = await translateText(reasonText, 'ta');
    const sr_zh_user = await translateText(reasonText, 'zh');
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        status: AccountStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspensionReason: reasonText,
        suspensionReason_en: sr_en_user ?? undefined,
        suspensionReason_ms: sr_ms_user ?? undefined,
        suspensionReason_ta: sr_ta_user ?? undefined,
        suspensionReason_zh: sr_zh_user ?? undefined,
        isActive: false,
      },
      include: {
        company: true,
      },
    });

    // Log admin action with translations

    const r_en = await translateText(reasonText, 'en');
    const r_ms = await translateText(reasonText, 'ms');
    const r_ta = await translateText(reasonText, 'ta');
    const r_zh = await translateText(reasonText, 'zh');
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: AdminActionType.SUSPEND_EMPLOYER,
        targetType: 'EMPLOYER',
        targetId: parseInt(userId),
        reason: reasonText,
        reason_en: r_en ?? undefined,
        reason_ms: r_ms ?? undefined,
        reason_ta: r_ta ?? undefined,
        reason_zh: r_zh ?? undefined,
        notes: duration
          ? `Suspended for ${duration} days`
          : 'Indefinite suspension',
      },
    });

    // If related to a report, update report status
    if (reportId) {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      const rn_en = await translateText(
        `Employer account suspended: ${reasonText}`,
        'en'
      );
      const rn_ms = await translateText(
        `Employer account suspended: ${reasonText}`,
        'ms'
      );
      const rn_ta = await translateText(
        `Employer account suspended: ${reasonText}`,
        'ta'
      );
      const rn_zh = await translateText(
        `Employer account suspended: ${reasonText}`,
        'zh'
      );
      await prisma.report.update({
        where: { id: parseInt(reportId) },
        data: {
          status: ReportStatus.RESOLVED,
          reviewedBy: adminUser?.id || null,
          reviewedAt: new Date(),
          reviewNotes: `Employer account suspended: ${reasonText}`,
          reviewNotes_en: rn_en ?? undefined,
          reviewNotes_ms: rn_ms ?? undefined,
          reviewNotes_ta: rn_ta ?? undefined,
          reviewNotes_zh: rn_zh ?? undefined,
        },
      });
    }

    // Create notification for employer
    const notifMsg = `Your account has been suspended. Reason: ${reason}. Please contact support for assistance.`;
    const n_en = await translateText(notifMsg, 'en');
    const n_ms = await translateText(notifMsg, 'ms');
    const n_ta = await translateText(notifMsg, 'ta');
    const n_zh = await translateText(notifMsg, 'zh');
    await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        title: 'Account Suspended',
        message: notifMsg,
        message_en: n_en ?? undefined,
        message_ms: n_ms ?? undefined,
        message_ta: n_ta ?? undefined,
        message_zh: n_zh ?? undefined,
        type: NotificationType.SYSTEM_UPDATE,
      },
    });

    // Deactivate all active jobs from this employer
    if (user.company) {
      const jsr = `Employer account suspended: ${reasonText}`;
      const jsr_en = await translateText(jsr, 'en');
      const jsr_ms = await translateText(jsr, 'ms');
      const jsr_ta = await translateText(jsr, 'ta');
      const jsr_zh = await translateText(jsr, 'zh');
      await prisma.job.updateMany({
        where: {
          companyId: user.company.id,
          isActive: true,
        },
        data: {
          isActive: false,
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedBy: adminEmail!,
          suspensionReason: jsr,
          suspensionReason_en: jsr_en ?? undefined,
          suspensionReason_ms: jsr_ms ?? undefined,
          suspensionReason_ta: jsr_ta ?? undefined,
          suspensionReason_zh: jsr_zh ?? undefined,
          approvalStatus: 'SUSPENDED',
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Employer suspended successfully',
      data: user,
    });
  } catch (error) {
    console.error('Error suspending employer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to suspend employer',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Dismiss report
export const dismissReport = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Dismissal reason must be at least 10 characters',
      });
    }

    const adminEmail = req.adminEmail;
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const reasonText = reason.trim();
    const rn_en = await translateText(reasonText, 'en');
    const rn_ms = await translateText(reasonText, 'ms');
    const rn_ta = await translateText(reasonText, 'ta');
    const rn_zh = await translateText(reasonText, 'zh');
    const report = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status: ReportStatus.DISMISSED,
        reviewedBy: adminUser?.id || null,
        reviewedAt: new Date(),
        reviewNotes: reasonText,
        reviewNotes_en: rn_en ?? undefined,
        reviewNotes_ms: rn_ms ?? undefined,
        reviewNotes_ta: rn_ta ?? undefined,
        reviewNotes_zh: rn_zh ?? undefined,
      },
      include: {
        user: true,
      },
    });

    // Log admin action with translations
    const r_en2 = rn_en;
    const r_ms2 = rn_ms;
    const r_ta2 = rn_ta;
    const r_zh2 = rn_zh;
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: AdminActionType.DISMISS_REPORT,
        targetType: 'REPORT',
        targetId: parseInt(reportId),
        reason: reasonText,
        reason_en: r_en2 ?? undefined,
        reason_ms: r_ms2 ?? undefined,
        reason_ta: r_ta2 ?? undefined,
        reason_zh: r_zh2 ?? undefined,
      },
    });

    // Notify the reporter with translations
    const notifMsg =
      'Your report has been reviewed. After investigation, we found no violation of our policies. Thank you for your vigilance.';
    const n_en = await translateText(notifMsg, 'en');
    const n_ms = await translateText(notifMsg, 'ms');
    const n_ta = await translateText(notifMsg, 'ta');
    const n_zh = await translateText(notifMsg, 'zh');
    await prisma.notification.create({
      data: {
        userId: report.userId,
        title: 'Report Reviewed',
        message: notifMsg,
        message_en: n_en ?? undefined,
        message_ms: n_ms ?? undefined,
        message_ta: n_ta ?? undefined,
        message_zh: n_zh ?? undefined,
        type: NotificationType.SYSTEM_UPDATE,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Report dismissed successfully',
      data: report,
    });
  } catch (error) {
    console.error('Error dismissing report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dismiss report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get admin action history
export const getAdminActionHistory = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const { targetType, targetId, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = parseInt(targetId as string);

    const skip = (Number(page) - 1) * Number(limit);

    const [actions, total] = await Promise.all([
      prisma.adminAction.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.adminAction.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: actions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching admin actions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin actions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
