import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
    const job = await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedBy: adminEmail,
        suspensionReason: reason.trim(),
        isActive: false,
      },
      include: {
        company: {
          include: {
            user: true,
          },
        },
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: 'SUSPEND_JOB',
        targetType: 'JOB',
        targetId: parseInt(jobId),
        reason: reason.trim(),
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
          status: 'RESOLVED',
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
        await prisma.notification.create({
          data: {
            userId: report.userId,
            title: 'Report Resolved',
            message: `Your report has been reviewed and action has been taken. The job post has been suspended. Thank you for helping keep our platform safe.`,
            type: 'SYSTEM_UPDATE',
          },
        });
      }
    }

    // Create notification for employer
    if (job.company.user) {
      await prisma.notification.create({
        data: {
          userId: job.company.user.id,
          title: 'Job Post Suspended',
          message: `Your job post "${job.title}" has been suspended. Reason: ${reason}. Please contact support if you believe this is a mistake.`,
          type: 'SYSTEM_UPDATE',
          actionUrl: `/jobs/${job.slug}`,
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
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: 'DELETE_JOB',
        targetType: 'JOB',
        targetId: parseInt(jobId),
        reason: reason.trim(),
        notes: `Deleted job: ${job.title} (${job.slug})`,
      },
    });

    // If related to a report, update report status
    if (reportId) {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      await prisma.report.update({
        where: { id: parseInt(reportId) },
        data: {
          status: 'RESOLVED',
          reviewedBy: adminUser?.id || null,
          reviewedAt: new Date(),
          reviewNotes: `Job deleted: ${reason}`,
        },
      });

      // Notify the reporter
      const report = await prisma.report.findUnique({
        where: { id: parseInt(reportId) },
        include: { user: true },
      });

      if (report) {
        await prisma.notification.create({
          data: {
            userId: report.userId,
            title: 'Report Resolved',
            message: `Your report has been reviewed and the job post has been removed. Thank you for helping keep our platform safe.`,
            type: 'SYSTEM_UPDATE',
          },
        });
      }
    }

    // Create notification for employer before deletion
    if (job.company.user) {
      await prisma.notification.create({
        data: {
          userId: job.company.user.id,
          title: 'Job Post Deleted',
          message: `Your job post "${job.title}" has been permanently deleted. Reason: ${reason}. Please contact support if you have questions.`,
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
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspensionReason: reason.trim(),
        isActive: false,
      },
      include: {
        company: true,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: 'SUSPEND_EMPLOYER',
        targetType: 'EMPLOYER',
        targetId: parseInt(userId),
        reason: reason.trim(),
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

      await prisma.report.update({
        where: { id: parseInt(reportId) },
        data: {
          status: 'RESOLVED',
          reviewedBy: adminUser?.id || null,
          reviewedAt: new Date(),
          reviewNotes: `Employer account suspended: ${reason}`,
        },
      });
    }

    // Create notification for employer
    await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        title: 'Account Suspended',
        message: `Your account has been suspended. Reason: ${reason}. Please contact support for assistance.`,
        type: 'SYSTEM_UPDATE',
      },
    });

    // Deactivate all active jobs from this employer
    if (user.company) {
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
          suspensionReason: `Employer account suspended: ${reason}`,
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

    const report = await prisma.report.update({
      where: { id: parseInt(reportId) },
      data: {
        status: 'DISMISSED',
        reviewedBy: adminUser?.id || null,
        reviewedAt: new Date(),
        reviewNotes: reason.trim(),
      },
      include: {
        user: true,
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminEmail: adminEmail!,
        actionType: 'DISMISS_REPORT',
        targetType: 'REPORT',
        targetId: parseInt(reportId),
        reason: reason.trim(),
      },
    });

    // Notify the reporter
    await prisma.notification.create({
      data: {
        userId: report.userId,
        title: 'Report Reviewed',
        message: `Your report has been reviewed. After investigation, we found no violation of our policies. Thank you for your vigilance.`,
        type: 'SYSTEM_UPDATE',
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
