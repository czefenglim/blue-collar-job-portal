// src/services/admin.service.ts

import { PrismaClient } from '@prisma/client';
import { UserFilters, JobFilters, DashboardAnalytics } from '../types/admin';
import {
  getSignedDownloadUrl,
  generatePresignedUrlsForEvidence,
} from './s3Service';
import { labelEnum, SupportedLang } from '../utils/enumLabels';

const prisma = new PrismaClient();

export class AdminService {
  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getUsers(filters: UserFilters, lang: SupportedLang = 'en') {
    const { role, status, search, page = 1, limit = 20 } = filters;

    const skip = (page - 1) * limit;

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

    const total = await prisma.user.count({ where });

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
            logo: true, // ✅ Include logo
            isVerified: true,
          },
        },
        profile: {
          select: {
            id: true,
            profileCompleted: true,
            profilePicture: true, // ✅ Include profile picture
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

    // ✅ Generate signed URLs for logos and profile pictures
    const usersWithSignedUrls = await Promise.all(
      users.map(async (user) => {
        const userData: any = { ...user };

        // Generate signed URL for company logo
        if (userData.company?.logo) {
          try {
            const signedLogoUrl = await getSignedDownloadUrl(
              userData.company.logo,
              3600
            );
            userData.company.logo = signedLogoUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for company logo:',
              error
            );
            userData.company.logo = null;
          }
        }

        // Generate signed URL for profile picture
        if (userData.profile?.profilePicture) {
          try {
            const signedProfileUrl = await getSignedDownloadUrl(
              userData.profile.profilePicture,
              3600
            );
            userData.profile.profilePicture = signedProfileUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for profile picture:',
              error
            );
            userData.profile.profilePicture = null;
          }
        }

        // ✅ Attach localized status label
        userData.statusLabel = labelEnum('UserStatus', user.status, lang);

        return userData;
      })
    );

    return {
      users: usersWithSignedUrls,
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

  async getJobs(filters: JobFilters, lang: SupportedLang = 'en') {
    const { approvalStatus, isActive, search, page = 1, limit = 20 } = filters;

    const skip = (page - 1) * limit;

    const where: any = {
      company: {
        verificationStatus: 'APPROVED',
      },
    };

    if (approvalStatus) {
      if (approvalStatus.includes(',')) {
        where.approvalStatus = {
          in: approvalStatus.split(',') as Array<
            | 'PENDING'
            | 'APPROVED'
            | 'REJECTED_AI'
            | 'REJECTED_FINAL'
            | 'APPEALED'
            | 'SUSPENDED'
          >,
        };
      } else {
        where.approvalStatus = approvalStatus as
          | 'PENDING'
          | 'APPROVED'
          | 'REJECTED_AI'
          | 'REJECTED_FINAL'
          | 'APPEALED'
          | 'SUSPENDED';
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
            verificationStatus: 'APPROVED',
          },
        },
      ];
    }

    const total = await prisma.job.count({ where });

    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        city: true,
        state: true,
        jobType: true,
        workingHours: true,
        experienceLevel: true,
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
            slug: true,
            name: true,
            name_ms: true,
            name_ta: true,
            name_zh: true,
          },
        },
        _count: {
          select: {
            applications: true,
            appeals: true, // ✅ Include appeal count
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // ✅ Generate signed URLs for company logos
    const jobsWithSignedUrls = await Promise.all(
      jobs.map(async (job) => {
        const jobData: any = { ...job };

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

        // ✅ Localize industry.name
        if (jobData.industry) {
          const localizedIndustryName =
            (jobData.industry as any)[`name_${lang}`] || jobData.industry.name;
          jobData.industry = {
            id: jobData.industry.id,
            slug: (jobData.industry as any).slug,
            name: localizedIndustryName,
          } as any;
        }

        // ✅ Attach localized enum labels
        jobData.jobTypeLabel = labelEnum(
          'JobType',
          jobData.jobType,
          lang
        ) as any;
        jobData.workingHoursLabel = labelEnum(
          'WorkingHours',
          jobData.workingHours,
          lang
        ) as any;
        jobData.experienceLevelLabel = labelEnum(
          'ExperienceLevel',
          jobData.experienceLevel,
          lang
        ) as any;
        jobData.salaryTypeLabel = labelEnum(
          'SalaryType',
          jobData.salaryType,
          lang
        ) as any;

        return jobData;
      })
    );

    return {
      jobs: jobsWithSignedUrls,
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
            logo: true, // ✅ Include logo
          },
        },
      },
    });

    // ✅ Generate signed URL for company logo
    if (job.company?.logo) {
      try {
        const signedLogoUrl = await getSignedDownloadUrl(
          job.company.logo,
          3600
        );
        job.company.logo = signedLogoUrl;
      } catch (error) {
        console.error('Error generating signed URL for company logo:', error);
        job.company.logo = null;
      }
    }

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

  async getJobById(jobId: number, lang: SupportedLang = 'en') {
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
            slug: true,
            name: true,
            name_ms: true,
            name_ta: true,
            name_zh: true,
          },
        },
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
            createdAt: 'desc',
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

    // ✅ Generate signed URL for company logo
    if (job.company?.logo) {
      try {
        const signedLogoUrl = await getSignedDownloadUrl(
          job.company.logo,
          3600
        );
        job.company.logo = signedLogoUrl;
      } catch (error) {
        console.error('Error generating signed URL for company logo:', error);
        job.company.logo = null;
      }
    }

    // ✅ Generate signed URLs for appeal evidence
    if (job.appeals && job.appeals.length > 0) {
      for (const appeal of job.appeals) {
        if (appeal.evidence) {
          try {
            const evidenceKeys = JSON.parse(appeal.evidence as string);
            if (Array.isArray(evidenceKeys) && evidenceKeys.length > 0) {
              const signedUrls = await generatePresignedUrlsForEvidence(
                appeal.evidence
              );
              (appeal as any).evidenceUrls = signedUrls;
            }
          } catch (error) {
            console.error(
              'Error generating signed URLs for appeal evidence:',
              error
            );
          }
        }
      }
    }

    // ✅ Attach localized enum labels for job details
    // ✅ Localize industry.name
    if ((job as any).industry) {
      const ind = (job as any).industry;
      const localizedIndustryName = ind[`name_${lang}`] || ind.name;
      (job as any).industry = {
        id: ind.id,
        slug: ind.slug,
        name: localizedIndustryName,
      };
    }

    (job as any).jobTypeLabel = labelEnum(
      'JobType',
      (job as any).jobType,
      lang
    );
    (job as any).workingHoursLabel = labelEnum(
      'WorkingHours',
      (job as any).workingHours,
      lang
    );
    (job as any).experienceLevelLabel = labelEnum(
      'ExperienceLevel',
      (job as any).experienceLevel,
      lang
    );
    (job as any).salaryTypeLabel = labelEnum(
      'SalaryType',
      (job as any).salaryType,
      lang
    );

    return job;
  }
}

export const adminService = new AdminService();
