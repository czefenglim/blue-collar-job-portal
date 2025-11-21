import express from 'express';
import {
  createReport,
  getUserReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  getAllReports,
  upload,
} from '../controllers/reportController';
import authMiddleware from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
// import { isAdmin } from '../middleware/roleCheck';

const router = express.Router();

// User routes
router.post(
  '/',
  authMiddleware,
  upload.array('evidence', 5), // Allow up to 5 files
  createReport
);
router.get('/my-reports', authMiddleware, getUserReports);
router.get('/:id', authMiddleware, getReportById);
router.delete('/:id', authMiddleware, deleteReport);

// Admin routes
router.get('/', adminAuthMiddleware, getAllReports);
router.patch('/:id/status', adminAuthMiddleware, updateReportStatus);

export default router;
