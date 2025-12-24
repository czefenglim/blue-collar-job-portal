import express from 'express';
import {
  getOverviewStats,
  getJobPostRanking,
  getTrendData,
  getLanguageUsage,
  getShortageAnalysis,
  getHighlights,
} from '../controllers/statisticController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// All statistics routes should be protected and restricted to admins
router.use(adminAuthMiddleware);

router.get('/overview', getOverviewStats);
router.get('/ranking', getJobPostRanking);
router.get('/trends', getTrendData);
router.get('/language', getLanguageUsage);
router.get('/shortage', getShortageAnalysis);
router.get('/highlights', getHighlights);

export default router;
