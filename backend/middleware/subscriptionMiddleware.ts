import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role?: string;
  };
}

/**
 * Middleware to ensure employer has completed initial subscription selection
 * Redirect to pricing page if not completed
 */
export const ensureSubscriptionCompleted = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { userId },
      include: { subscription: true },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Check if company is verified
    if (company.verificationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Company not verified',
        redirectTo: 'pending-verification',
      });
    }

    // Check if initial subscription is completed
    if (!company.hasCompletedInitialSubscription) {
      return res.status(403).json({
        success: false,
        message: 'Please select a subscription plan first',
        redirectTo: 'pricing',
      });
    }

    next();
  } catch (error: any) {
    console.error('Error in subscription middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if employer can post a job based on their plan
 */
export const canCreateJobPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
      include: { subscription: true },
    });

    if (!company || !company.subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription',
        code: 'NO_SUBSCRIPTION',
      });
    }

    const subscription = company.subscription;

    // Count active approved jobs
    const activeJobs = await prisma.job.count({
      where: {
        companyId: company.id,
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    });

    // Check if limit reached
    const limitReached =
      subscription.jobPostLimit !== -1 &&
      activeJobs >= subscription.jobPostLimit;

    if (limitReached) {
      return res.status(403).json({
        success: false,
        message: `You've reached your job posting limit (${subscription.jobPostLimit} posts). Upgrade your plan to post more jobs.`,
        code: 'LIMIT_REACHED',
        data: {
          activeJobs,
          jobPostLimit: subscription.jobPostLimit,
          planType: subscription.planType,
        },
      });
    }

    next();
  } catch (error: any) {
    console.error('Error checking job post limit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify job posting eligibility',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if employer can reply to reviews
 */
export const canReplyToReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
      include: { subscription: true },
    });

    if (!company || !company.subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription',
      });
    }

    if (!company.subscription.canReplyToReviews) {
      return res.status(403).json({
        success: false,
        message: 'Upgrade to Pro or Max plan to reply to reviews',
        code: 'FEATURE_RESTRICTED',
        planType: company.subscription.planType,
      });
    }

    next();
  } catch (error: any) {
    console.error('Error checking review reply permission:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify permissions',
      error: error.message,
    });
  }
};
