// src/services/admin.service.ts

import { PrismaClient } from '@prisma/client';
import { UserFilters, JobFilters, DashboardAnalytics } from '../types/admin';

const prisma = new PrismaClient();

export class AdminService {
  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getUsers(filters: UserFilters) {
    const { role, status, search, page = 1, limit = 20 } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        status: true,
        isActive: true,
        isEmailVerified: true,
        suspendedAt: true,
        suspensionReason: true,
        lastLoginAt: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
        profile: {
          select: {
            id: true,
            profileCompleted: true,
          },
        },
        _count: {
          select: {
            applications: true,
            createdJobs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(
    userId: number,
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED',
    reason?: string
  ) {
    const updateData: any = {
      status,
    };

    if (status === 'SUSPENDED') {
      updateData.suspendedAt = new Date();
      updateData.suspensionReason = reason;
      updateData.isActive = false;
    } else if (status === 'ACTIVE') {
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
      updateData.isActive = true;
    } else if (status === 'DELETED') {
      updateData.isActive = false;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        isActive: true,
      },
    });

    return user;
  }

  async deleteUser(userId: number) {
    // Soft delete - mark as DELETED
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        isActive: false,
      },
    });

    return user;
  }

  // ==========================================
  // JOB MANAGEMENT
  // ==========================================

  async getJobs(filters: JobFilters) {
    const { approvalStatus, isActive, search, page = 1, limit = 20 } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // ✅ Only get jobs from verified companies
      company: {
        verificationStatus: 'APPROVED',
      },
    };

    if (approvalStatus) {
      if (approvalStatus.includes(',')) {
        // multiple values
        where.approvalStatus = {
          in: approvalStatus.split(',') as Array<
            | 'PENDING'
            | 'APPROVED'
            | 'REJECTED_AI'
            | 'REJECTED_FINAL'
            | 'APPEALED'
          >,
        };
      } else {
        // single value
        where.approvalStatus = approvalStatus as
          | 'PENDING'
          | 'APPROVED'
          | 'REJECTED_AI'
          | 'REJECTED_FINAL'
          | 'APPEALED';
      }
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          company: {
            name: { contains: search, mode: 'insensitive' },
            verificationStatus: 'APPROVED', // ✅ Maintain filter in OR clause
          },
        },
      ];
    }

    // Get total count
    const total = await prisma.job.count({ where });

    // Get jobs
    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        city: true,
        state: true,
        jobType: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        approvalStatus: true,
        isActive: true,
        viewCount: true,
        applicationCount: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            isVerified: true,
          },
        },
        industry: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateJobApproval(
    jobId: number,
    approvalStatus: 'APPROVED' | 'REJECTED_FINAL',
    reason?: string
  ) {
    const updateData: any = {
      approvalStatus,
    };

    if (approvalStatus === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.isActive = true;
      updateData.rejectionReason = null;
    } else if (approvalStatus === 'REJECTED_FINAL') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = reason;
      updateData.isActive = false;
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    return job;
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    // Get date 7 days ago for recent activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Total users by role
    const [totalJobSeekers, totalEmployers] = await Promise.all([
      prisma.user.count({
        where: {
          role: 'JOB_SEEKER',
          status: { not: 'DELETED' },
        },
      }),
      prisma.user.count({
        where: {
          role: 'EMPLOYER',
          status: { not: 'DELETED' },
        },
      }),
    ]);

    // Total jobs by status
    const [totalJobs, pendingJobs, approvedJobs, rejectedJobs] =
      await Promise.all([
        prisma.job.count(),
        prisma.job.count({ where: { approvalStatus: 'PENDING' } }),
        prisma.job.count({ where: { approvalStatus: 'APPROVED' } }),
        prisma.job.count({
          where: { approvalStatus: { in: ['REJECTED_FINAL', 'REJECTED_AI'] } },
        }),
      ]);

    // Recent activity (last 7 days)
    const [newUsers, newJobs, newApplications] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          status: { not: 'DELETED' },
        },
      }),
      prisma.job.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.jobApplication.count({
        where: {
          appliedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // Review statistics
    const [
      totalReviews,
      averageRating,
      flaggedReviews,
      visibleReviews,
      hiddenReviews,
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.aggregate({
        where: { isVisible: true },
        _avg: { rating: true },
      }),
      prisma.review.count({ where: { isFlagged: true } }),
      prisma.review.count({ where: { isVisible: true } }),
      prisma.review.count({ where: { isVisible: false } }),
    ]);

    return {
      totalJobSeekers,
      totalEmployers,
      totalJobs: {
        total: totalJobs,
        pending: pendingJobs,
        approved: approvedJobs,
        rejected: rejectedJobs,
      },
      recentActivity: {
        newUsers,
        newJobs,
        newApplications,
      },
      reviewStats: {
        totalReviews,
        averageRating: averageRating._avg.rating
          ? parseFloat(averageRating._avg.rating.toFixed(1))
          : 0,
        flaggedReviews,
        visibleReviews,
        hiddenReviews,
      },
    };
  }

  async getJobById(jobId: number) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            isVerified: true,
            email: true,
            phone: true,
            website: true,
          },
        },
        industry: {
          select: {
            id: true,
            name: true,
          },
        },
        // ✅ NEW: Include appeals
        appeals: {
          select: {
            id: true,
            explanation: true,
            evidence: true,
            status: true,
            createdAt: true,
            reviewedAt: true,
            reviewNotes: true,
          },
          orderBy: {
            createdAt: 'desc', // Most recent appeal first
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  }
}

export const adminService = new AdminService();
