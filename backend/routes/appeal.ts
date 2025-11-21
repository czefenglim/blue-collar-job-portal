import express from 'express';
import {
  getEmployerReports,
  getEmployerReportById,
  submitAppeal,
  getAllAppeals,
  reviewAppeal,
  upload,
} from '../controllers/appealController';
import authMiddleware from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// Employer routes
router.get('/employer/my-reports', authMiddleware, getEmployerReports);
router.get('/employer/my-reports/:id', authMiddleware, getEmployerReportById);
router.post(
  '/employer/appeal',
  authMiddleware,
  upload.array('evidence', 5),
  submitAppeal
);

// Admin routes
router.get('/admin/appeals', adminAuthMiddleware, getAllAppeals);
router.put('/admin/appeals/:id/review', adminAuthMiddleware, reviewAppeal);

export default router;
