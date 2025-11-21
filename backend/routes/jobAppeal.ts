// src/routes/appeal.routes.ts

import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import {
  submitJobAppeal,
  reviewJobAppeal,
  getAllAppeals,
  getAppealById,
} from '../controllers/jobAppealController';

const router = express.Router();

// Configure multer for file uploads (evidence documents)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only PDF, images, and Word documents are allowed.'
        )
      );
    }
  },
});

// ✅ EMPLOYER ROUTES
/**
 * @route   POST /api/employer/jobs/:jobId/appeal
 * @desc    Submit an appeal for a rejected job
 * @access  Employer only
 */
router.post(
  '/employer/jobs/:jobId/appeal',
  authMiddleware,
  upload.array('evidence', 5), // Max 5 evidence files
  submitJobAppeal
);

// ✅ ADMIN ROUTES
/**
 * @route   GET /api/admin/appeals
 * @desc    Get all job appeals with filters
 * @access  Admin only
 */
router.get('/admin/appeals', adminAuthMiddleware, getAllAppeals);

/**
 * @route   GET /api/admin/appeals/:appealId
 * @desc    Get a single appeal by ID
 * @access  Admin only
 */
router.get('/admin/appeals/:appealId', adminAuthMiddleware, getAppealById);

/**
 * @route   PATCH /api/admin/appeals/:appealId/review
 * @desc    Review an appeal (approve or reject)
 * @access  Admin only
 */
router.patch(
  '/admin/appeals/:appealId/review',
  adminAuthMiddleware,
  reviewJobAppeal
);

export default router;
