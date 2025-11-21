import express from 'express';
import {
  getJobForReview,
  suspendJob,
  deleteJob,
  suspendEmployer,
  dismissReport,
  getAdminActionHistory,
} from '../controllers/adminActionController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// All routes require admin authentication
router.use(adminAuthMiddleware);

// Job review and actions
router.get('/jobs/:jobId/review', getJobForReview);
router.post('/jobs/:jobId/suspend', suspendJob);
router.post('/jobs/:jobId/delete', deleteJob);

// Employer actions
router.post('/employers/:userId/suspend', suspendEmployer);

// Report actions
router.post('/reports/:reportId/dismiss', dismissReport);

// Admin action history
router.get('/actions/history', getAdminActionHistory);

export default router;
