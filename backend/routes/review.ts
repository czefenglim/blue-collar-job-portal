import express from 'express';
import {
  createReview,
  getCompanyReviews,
  updateReview,
  deleteReview,
  getUserReviewForCompany,
  getUserReviews,
  // Employer routes
  getEmployerCompanyReviews,
  replyToReview,
  flagReview,
  getEmployerCompanyStats,
  // Admin routes
  getAllReviewsAdmin,
  moderateReview,
  deleteReviewAdmin,
  getReviewStatsAdmin,
} from '../controllers/reviewController';
import authMiddleware from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// Public routes
router.get('/companies/:companyId/reviews', getCompanyReviews);

// Authenticated job seeker routes
router.post('/', authMiddleware, createReview);

router.get(
  '/my-reviews',
  authMiddleware,

  getUserReviews
);

router.get(
  '/companies/:companyId/my-review',
  authMiddleware,
  getUserReviewForCompany
);

router.patch('/:reviewId', authMiddleware, updateReview);

router.delete('/:reviewId', authMiddleware, deleteReview);

// Employer routes
router.get(
  '/employer/company-reviews',
  authMiddleware,
  getEmployerCompanyReviews
);

router.get('/employer/stats', authMiddleware, getEmployerCompanyStats);

router.post('/:reviewId/reply', authMiddleware, replyToReview);

router.post('/:reviewId/flag', authMiddleware, flagReview);

// Admin routes
router.get('/admin/all', adminAuthMiddleware, getAllReviewsAdmin);

router.get(
  '/admin/stats',
  adminAuthMiddleware,

  getReviewStatsAdmin
);

router.patch(
  '/admin/:reviewId/moderate',
  adminAuthMiddleware,

  moderateReview
);

router.delete('/admin/:reviewId', adminAuthMiddleware, deleteReviewAdmin);

export default router;
