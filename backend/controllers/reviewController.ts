import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translateText } from '../services/googleTranslation';
import { AdminAuthRequest } from '../types/admin';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role?: string;
  };
}

// Create a review
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      companyId,
      rating,
      title,
      comment,
      isAnonymous,
      comment_ms,
      comment_ta,
      comment_zh,
    } = req.body;

    // Validation
    if (!companyId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and rating are required',
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (title && title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 200 characters or less',
      });
    }

    if (comment && comment.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be 2000 characters or less',
      });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: parseInt(companyId) },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Check if user already reviewed this company
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: parseInt(companyId),
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this company',
      });
    }

    // Create review
    const c_ms =
      comment_ms ?? (comment ? await translateText(comment, 'ms') : null);
    const c_ta =
      comment_ta ?? (comment ? await translateText(comment, 'ta') : null);
    const c_zh =
      comment_zh ?? (comment ? await translateText(comment, 'zh') : null);
    const c_en = comment ? await translateText(comment, 'en') : null;
    const review = await prisma.review.create({
      data: {
        userId,
        companyId: parseInt(companyId),
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        comment_ms: c_ms ?? undefined,
        comment_ta: c_ta ?? undefined,
        comment_zh: c_zh ?? undefined,
        comment_en: c_en ?? undefined,
        isAnonymous: isAnonymous || false,
        isVisible: true,
        isApproved: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message,
    });
  }
};

// Get reviews for a company
export const getCompanyReviews = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const {
      page = '1',
      limit = '10',
      sort = 'newest', // newest, highest, lowest
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'highest') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'lowest') {
      orderBy = { rating: 'asc' };
    }

    // Get reviews
    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where: {
          companyId: parseInt(companyId),
          isVisible: true,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.review.count({
        where: {
          companyId: parseInt(companyId),
          isVisible: true,
        },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          companyId: parseInt(companyId),
          isVisible: true,
        },
        _count: {
          rating: true,
        },
      }),
    ]);

    // Calculate average rating
    const aggregateResult = await prisma.review.aggregate({
      where: {
        companyId: parseInt(companyId),
        isVisible: true,
      },
      _avg: {
        rating: true,
      },
    });

    const averageRating = aggregateResult._avg.rating || 0;

    // Format rating counts
    const ratingCounts = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    stats.forEach((stat) => {
      ratingCounts[stat.rating as keyof typeof ratingCounts] =
        stat._count.rating;
    });

    // Format reviews (handle anonymous)
    const formattedReviews = reviews.map((review) => ({
      ...review,
      user: review.isAnonymous
        ? { id: null, fullName: 'Anonymous' }
        : review.user,
    }));

    return res.status(200).json({
      success: true,
      data: {
        reviews: formattedReviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: total,
        ratingCounts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// Update own review
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { reviewId } = req.params;
    const { rating, title, comment, isAnonymous } = req.body;

    // Find review
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check ownership
    if (review.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reviews',
      });
    }

    // Validation
    if (rating && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (title && title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 200 characters or less',
      });
    }

    if (comment && comment.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be 2000 characters or less',
      });
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        rating: rating || review.rating,
        title: title?.trim() || review.title,
        comment: comment?.trim() || review.comment,
        isAnonymous:
          isAnonymous !== undefined ? isAnonymous : review.isAnonymous,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
    });
  }
};

// Delete own review
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { reviewId } = req.params;

    // Find review
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check ownership
    if (review.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews',
      });
    }

    // Delete review
    await prisma.review.delete({
      where: { id: parseInt(reviewId) },
    });

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message,
    });
  }
};

// Get user's own review for a company
export const getUserReviewForCompany = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const { companyId } = req.params;

    const review = await prisma.review.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: parseInt(companyId),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Error fetching user review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error: error.message,
    });
  }
};

// Get user's all reviews
export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// Get reviews for employer's company
export const getEmployerCompanyReviews = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;
    const {
      page = '1',
      limit = '20',
      sort = 'newest',
      rating,
      startDate,
      endDate,
    } = req.query;

    // Get employer's company
    const company = await prisma.company.findUnique({
      where: { userId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build where clause
    const where: any = {
      companyId: company.id,
      // isVisible: true, // Allow employers to see all reviews, including hidden ones
    };

    if (rating) {
      where.rating = parseInt(rating as string);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Build sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'highest') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'lowest') {
      orderBy = { rating: 'asc' };
    }

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ['rating'],
        where: {
          companyId: company.id,
          isVisible: true,
        },
        _count: {
          rating: true,
        },
      }),
    ]);

    // Calculate average rating
    const aggregateResult = await prisma.review.aggregate({
      where: {
        companyId: company.id,
        isVisible: true,
      },
      _avg: {
        rating: true,
      },
    });

    const averageRating = aggregateResult._avg.rating || 0;

    // Format rating counts
    const ratingCounts = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    stats.forEach((stat) => {
      ratingCounts[stat.rating as keyof typeof ratingCounts] =
        stat._count.rating;
    });

    // Format reviews (handle anonymous)
    const formattedReviews = reviews.map((review) => ({
      ...review,
      user: review.isAnonymous
        ? { id: null, fullName: 'Anonymous' }
        : review.user,
    }));

    return res.status(200).json({
      success: true,
      data: {
        reviews: formattedReviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: total,
        ratingCounts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching employer reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// Reply to a review (Employer)
export const replyToReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { reviewId } = req.params;
    const { reply } = req.body;

    // Validation
    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply text is required',
      });
    }

    if (reply.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Reply must be 1000 characters or less',
      });
    }

    // Get employer's company
    const company = await prisma.company.findUnique({
      where: { userId },
      include: { subscription: true }, // ✅ ADD THIS
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // ✅ ADD THIS PERMISSION CHECK BEFORE CHECKING REVIEW
    if (!company.subscription?.canReplyToReviews) {
      return res.status(403).json({
        success: false,
        message: 'Upgrade to Pro or Max plan to reply to reviews',
        code: 'FEATURE_RESTRICTED',
        planType: company.subscription?.planType || 'FREE',
      });
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Get review
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if review belongs to employer's company
    if (review.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only reply to reviews for your company',
      });
    }

    // Update review with reply
    const r_ms = await translateText(reply.trim(), 'ms');
    const r_ta = await translateText(reply.trim(), 'ta');
    const r_zh = await translateText(reply.trim(), 'zh');
    const r_en = await translateText(reply.trim(), 'en');
    const updatedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        employerReply: reply.trim(),
        employerReply_ms: r_ms ?? undefined,
        employerReply_ta: r_ta ?? undefined,
        employerReply_zh: r_zh ?? undefined,
        employerReply_en: r_en ?? undefined,
        repliedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Reply posted successfully',
      data: updatedReview,
    });
  } catch (error: any) {
    console.error('Error replying to review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to post reply',
      error: error.message,
    });
  }
};

// Flag a review (Employer)
export const flagReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { reviewId } = req.params;
    const { reason } = req.body;

    // Validation
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Flag reason is required',
      });
    }

    // Get employer's company
    const company = await prisma.company.findUnique({
      where: { userId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Get review
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if review belongs to employer's company
    if (review.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only flag reviews for your company',
      });
    }

    // Flag review
    const f_ms = await translateText(reason.trim(), 'ms');
    const f_ta = await translateText(reason.trim(), 'ta');
    const f_zh = await translateText(reason.trim(), 'zh');
    const f_en = await translateText(reason.trim(), 'en');
    const flaggedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        isFlagged: true,
        flaggedAt: new Date(),
        flagReason: reason.trim(),
        flagReason_ms: f_ms ?? undefined,
        flagReason_ta: f_ta ?? undefined,
        flagReason_zh: f_zh ?? undefined,
        flagReason_en: f_en ?? undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Review flagged for admin review',
      data: flaggedReview,
    });
  } catch (error: any) {
    console.error('Error flagging review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to flag review',
      error: error.message,
    });
  }
};

// Get employer's company stats (for dashboard)
export const getEmployerCompanyStats = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.userId;

    // Get employer's company
    const company = await prisma.company.findUnique({
      where: { userId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const [aggregateStats, ratingDistribution, recentReviews] =
      await Promise.all([
        prisma.review.aggregate({
          where: {
            companyId: company.id,
            isVisible: true,
          },
          _avg: {
            rating: true,
          },
          _count: {
            id: true,
          },
        }),
        prisma.review.groupBy({
          by: ['rating'],
          where: {
            companyId: company.id,
            isVisible: true,
          },
          _count: {
            rating: true,
          },
        }),
        prisma.review.findMany({
          where: {
            companyId: company.id,
            isVisible: true,
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const averageRating = aggregateStats._avg.rating || 0;
    const totalReviews = aggregateStats._count.id;

    // Format rating distribution
    const ratingCounts = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingDistribution.forEach((stat) => {
      ratingCounts[stat.rating as keyof typeof ratingCounts] =
        stat._count.rating;
    });

    // Format recent reviews
    const formattedRecentReviews = recentReviews.map((review) => ({
      ...review,
      user: review.isAnonymous
        ? { id: null, fullName: 'Anonymous' }
        : review.user,
    }));

    return res.status(200).json({
      success: true,
      data: {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        ratingCounts,
        recentReviews: formattedRecentReviews,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company stats',
      error: error.message,
    });
  }
};

// ===================================================================
// ADMIN FUNCTIONS
// ===================================================================

// Get all reviews (Admin)
// Get all reviews (Admin)
export const getAllReviewsAdmin = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      rating,
      visibility,
      flagged,
      companyId,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build where clause
    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        {
          user: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          company: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (rating) {
      where.rating = parseInt(rating as string);
    }

    if (visibility === 'visible') {
      where.isVisible = true;
    } else if (visibility === 'hidden') {
      where.isVisible = false;
    }

    if (flagged === 'true') {
      where.isFlagged = true;
    }

    if (companyId) {
      where.companyId = parseInt(companyId as string);
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.review.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching all reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// Moderate review visibility (Admin)
export const moderateReview = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { isVisible, adminNotes } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        isVisible: isVisible !== undefined ? isVisible : review.isVisible,
        isFlagged: false, // Clear flag when moderated
      },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminEmail: req.adminEmail!, // UPDATED
        actionType: isVisible ? 'RESOLVE_REPORT' : 'DISMISS_REPORT',
        targetType: 'REVIEW',
        targetId: parseInt(reviewId),
        notes: adminNotes || `Review ${isVisible ? 'approved' : 'hidden'}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Review moderated successfully',
      data: updatedReview,
    });
  } catch (error: any) {
    console.error('Error moderating review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to moderate review',
      error: error.message,
    });
  }
};

// Delete review permanently (Admin)
export const deleteReviewAdmin = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Delete review
    await prisma.review.delete({
      where: { id: parseInt(reviewId) },
    });

    // Log admin action
    const reasonText = reason || 'Inappropriate content';
    const r_ms = await translateText(reasonText, 'ms');
    const r_ta = await translateText(reasonText, 'ta');
    const r_zh = await translateText(reasonText, 'zh');
    await prisma.adminAction.create({
      data: {
        adminEmail: req.adminEmail!, // UPDATED
        actionType: 'DELETE_JOB', // Reuse enum or add DELETE_REVIEW
        targetType: 'REVIEW',
        targetId: parseInt(reviewId),
        reason: reasonText,
        reason_ms: r_ms ?? undefined,
        reason_ta: r_ta ?? undefined,
        reason_zh: r_zh ?? undefined,
        notes: 'Review permanently deleted',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message,
    });
  }
};

// Get review statistics (Admin)
export const getReviewStatsAdmin = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const [
      totalReviews,
      visibleReviews,
      hiddenReviews,
      flaggedReviews,
      averageRating,
      topRatedCompanies,
      lowestRatedCompanies,
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { isVisible: true } }),
      prisma.review.count({ where: { isVisible: false } }),
      prisma.review.count({ where: { isFlagged: true } }),
      prisma.review.aggregate({
        where: { isVisible: true },
        _avg: { rating: true },
      }),
      // Top 5 rated companies
      prisma.company.findMany({
        include: {
          reviews: {
            where: { isVisible: true },
          },
        },
        take: 100,
      }),
      // Bottom 5 rated companies
      prisma.company.findMany({
        include: {
          reviews: {
            where: { isVisible: true },
          },
        },
        take: 100,
      }),
    ]);

    // Calculate company ratings
    const companiesWithRatings = topRatedCompanies
      .map((company) => {
        const reviews = company.reviews;
        if (reviews.length === 0) return null;

        const avgRating =
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        return {
          id: company.id,
          name: company.name,
          averageRating: parseFloat(avgRating.toFixed(1)),
          totalReviews: reviews.length,
        };
      })
      .filter((c) => c !== null);

    const topRated = companiesWithRatings
      .sort((a, b) => b!.averageRating - a!.averageRating)
      .slice(0, 5);

    const lowestRated = companiesWithRatings
      .sort((a, b) => a!.averageRating - b!.averageRating)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        totalReviews,
        visibleReviews,
        hiddenReviews,
        flaggedReviews,
        averageRating: averageRating._avg.rating
          ? parseFloat(averageRating._avg.rating.toFixed(1))
          : 0,
        topRatedCompanies: topRated,
        lowestRatedCompanies: lowestRated,
      },
    });
  } catch (error: any) {
    console.error('Error fetching review stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch review statistics',
      error: error.message,
    });
  }
};