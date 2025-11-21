import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrustScore {
  score: number; // 0-100
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  breakdown: {
    verificationStatus: number; // 0-25 points
    companyCompleteness: number; // 0-20 points
    jobPostingHistory: number; // 0-20 points
    applicantEngagement: number; // 0-15 points
    reviewScore: number; // 0-10 points
    reportHistory: number; // 0-10 points (deductions)
  };
  factors: {
    isVerified: boolean;
    totalJobsPosted: number;
    approvedJobsCount: number;
    rejectedJobsCount: number;
    totalApplicationsReceived: number;
    averageReviewRating: number;
    totalReviews: number;
    totalReports: number;
    resolvedReports: number;
    accountAge: number; // in days
  };
  warnings: string[];
  strengths: string[];
}

export class EmployerTrustScoreService {
  /**
   * Calculate trust score for a company
   */
  static async calculateTrustScore(companyId: number): Promise<TrustScore> {
    // Get company with all related data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        verification: true,
        jobs: {
          include: {
            applications: true,
            reports: true,
          },
        },
        reviews: true,
        user: true,
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const warnings: string[] = [];
    const strengths: string[] = [];

    // 1. Verification Status (0-25 points)
    let verificationStatus = 0;
    const isVerified =
      company.isVerified || company.verificationStatus === 'APPROVED';

    if (isVerified) {
      verificationStatus = 25;
      strengths.push('Verified company');
    } else if (company.verificationStatus === 'PENDING') {
      verificationStatus = 10;
      warnings.push('Verification pending');
    } else if (company.verificationStatus === 'REJECTED') {
      verificationStatus = 0;
      warnings.push('Verification rejected');
    } else {
      verificationStatus = 5;
      warnings.push('Not verified');
    }

    // 2. Company Profile Completeness (0-20 points)
    let companyCompleteness = 0;

    if (company.name) companyCompleteness += 3;
    if (company.description && company.description.length > 50)
      companyCompleteness += 3;
    if (company.logo) companyCompleteness += 2;
    if (company.email) companyCompleteness += 2;
    if (company.phone) companyCompleteness += 2;
    if (company.address) companyCompleteness += 2;
    if (company.city && company.state) companyCompleteness += 2;
    if (company.website) companyCompleteness += 2;
    if (company.industryId) companyCompleteness += 2;

    if (companyCompleteness >= 18) {
      strengths.push('Complete company profile');
    } else if (companyCompleteness < 10) {
      warnings.push('Incomplete company profile');
    }

    // 3. Job Posting History (0-20 points)
    let jobPostingHistory = 0;
    const totalJobsPosted = company.jobs.length;
    const approvedJobs = company.jobs.filter(
      (j) => j.approvalStatus === 'APPROVED'
    );
    const rejectedJobs = company.jobs.filter(
      (j) =>
        j.approvalStatus === 'REJECTED_AI' ||
        j.approvalStatus === 'REJECTED_FINAL'
    );

    if (totalJobsPosted > 0) {
      const approvalRate = approvedJobs.length / totalJobsPosted;

      // Base points for having jobs
      if (totalJobsPosted >= 10) {
        jobPostingHistory += 8;
      } else if (totalJobsPosted >= 5) {
        jobPostingHistory += 6;
      } else if (totalJobsPosted >= 1) {
        jobPostingHistory += 4;
      }

      // Approval rate bonus
      if (approvalRate >= 0.9) {
        jobPostingHistory += 12;
        strengths.push(
          `High job approval rate (${Math.round(approvalRate * 100)}%)`
        );
      } else if (approvalRate >= 0.7) {
        jobPostingHistory += 8;
      } else if (approvalRate >= 0.5) {
        jobPostingHistory += 4;
        warnings.push(
          `Moderate job approval rate (${Math.round(approvalRate * 100)}%)`
        );
      } else {
        warnings.push(
          `Low job approval rate (${Math.round(approvalRate * 100)}%)`
        );
      }
    } else {
      jobPostingHistory = 5; // Neutral score for new companies
    }

    // 4. Applicant Engagement (0-15 points)
    let applicantEngagement = 0;
    const totalApplications = company.jobs.reduce(
      (sum, job) => sum + job.applications.length,
      0
    );

    if (totalApplications > 0) {
      // Check for response activity (shortlisted, interviewed, hired, rejected)
      const processedApplications = company.jobs.reduce((sum, job) => {
        return (
          sum +
          job.applications.filter(
            (app) => app.status !== 'PENDING' && app.status !== 'WITHDRAWN'
          ).length
        );
      }, 0);

      const responseRate = processedApplications / totalApplications;

      if (responseRate >= 0.8) {
        applicantEngagement = 15;
        strengths.push('Excellent applicant response rate');
      } else if (responseRate >= 0.5) {
        applicantEngagement = 10;
      } else if (responseRate >= 0.3) {
        applicantEngagement = 6;
        warnings.push('Low applicant response rate');
      } else if (totalApplications >= 5) {
        applicantEngagement = 3;
        warnings.push('Very low applicant engagement');
      } else {
        applicantEngagement = 5; // Neutral for few applications
      }
    } else {
      applicantEngagement = 5; // Neutral for new companies
    }

    // 5. Review Score (0-10 points)
    let reviewScore = 0;
    const visibleReviews = company.reviews.filter(
      (r) => r.isVisible && !r.isFlagged
    );
    const totalReviews = visibleReviews.length;

    if (totalReviews > 0) {
      const avgRating =
        visibleReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

      if (avgRating >= 4.5) {
        reviewScore = 10;
        strengths.push(`Excellent reviews (${avgRating.toFixed(1)}/5)`);
      } else if (avgRating >= 4.0) {
        reviewScore = 8;
        strengths.push(`Good reviews (${avgRating.toFixed(1)}/5)`);
      } else if (avgRating >= 3.0) {
        reviewScore = 5;
      } else if (avgRating >= 2.0) {
        reviewScore = 2;
        warnings.push(`Poor reviews (${avgRating.toFixed(1)}/5)`);
      } else {
        reviewScore = 0;
        warnings.push(`Very poor reviews (${avgRating.toFixed(1)}/5)`);
      }
    } else {
      reviewScore = 5; // Neutral for no reviews
    }

    // 6. Report History (0-10 points, deductions)
    let reportHistory = 10; // Start with full points
    const allReports = company.jobs.flatMap((j) => j.reports);
    const totalReports = allReports.length;
    const resolvedReports = allReports.filter(
      (r) => r.status === 'RESOLVED'
    ).length;
    const dismissedReports = allReports.filter(
      (r) => r.status === 'DISMISSED'
    ).length;

    if (totalReports > 0) {
      // Deduct for unresolved reports
      const unresolvedReports =
        totalReports - resolvedReports - dismissedReports;

      if (unresolvedReports >= 5) {
        reportHistory = 0;
        warnings.push(`${unresolvedReports} unresolved reports`);
      } else if (unresolvedReports >= 3) {
        reportHistory = 3;
        warnings.push(`${unresolvedReports} unresolved reports`);
      } else if (unresolvedReports >= 1) {
        reportHistory = 6;
        warnings.push(`${unresolvedReports} pending report(s)`);
      }

      // Bonus for resolved reports (shows responsiveness)
      if (resolvedReports > 0 && unresolvedReports === 0) {
        strengths.push('All reports resolved');
      }
    }

    // Calculate total score
    const totalScore = Math.min(
      100,
      Math.max(
        0,
        verificationStatus +
          companyCompleteness +
          jobPostingHistory +
          applicantEngagement +
          reviewScore +
          reportHistory
      )
    );

    // Determine trust level
    let level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (totalScore >= 80) {
      level = 'EXCELLENT';
    } else if (totalScore >= 60) {
      level = 'GOOD';
    } else if (totalScore >= 40) {
      level = 'FAIR';
    } else {
      level = 'POOR';
    }

    // Calculate account age
    const accountAge = Math.floor(
      (Date.now() - new Date(company.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Calculate average review rating
    const averageReviewRating =
      totalReviews > 0
        ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
      score: Math.round(totalScore),
      level,
      breakdown: {
        verificationStatus,
        companyCompleteness,
        jobPostingHistory,
        applicantEngagement,
        reviewScore,
        reportHistory,
      },
      factors: {
        isVerified,
        totalJobsPosted,
        approvedJobsCount: approvedJobs.length,
        rejectedJobsCount: rejectedJobs.length,
        totalApplicationsReceived: totalApplications,
        averageReviewRating: Math.round(averageReviewRating * 10) / 10,
        totalReviews,
        totalReports,
        resolvedReports,
        accountAge,
      },
      warnings: warnings.slice(0, 5),
      strengths: strengths.slice(0, 5),
    };
  }

  /**
   * Get trust scores for multiple companies
   */
  static async getTrustScoresForCompanies(
    companyIds: number[]
  ): Promise<Map<number, TrustScore>> {
    const scores = new Map<number, TrustScore>();

    for (const companyId of companyIds) {
      try {
        const score = await this.calculateTrustScore(companyId);
        scores.set(companyId, score);
      } catch (error) {
        console.error(
          `Error calculating trust score for company ${companyId}:`,
          error
        );
      }
    }

    return scores;
  }

  /**
   * Get color for trust level
   */
  static getTrustLevelColor(
    level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  ): string {
    switch (level) {
      case 'EXCELLENT':
        return '#10B981'; // Green
      case 'GOOD':
        return '#3B82F6'; // Blue
      case 'FAIR':
        return '#F59E0B'; // Amber
      case 'POOR':
        return '#EF4444'; // Red
    }
  }
}
