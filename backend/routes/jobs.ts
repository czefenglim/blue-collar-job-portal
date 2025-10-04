import express from 'express';
import {
  getAllJobs,
  getJobBySlug,
  toggleSaveJob,
  getSavedJobs,
  applyToJob,
  getUserApplications,
} from '../controllers/jobController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all jobs with filters
router.get('/', getAllJobs);

// Get single job by slug
router.get('/:slug', getJobBySlug);

// Save/Unsave a job
router.post('/:id/save', toggleSaveJob);

// Get saved jobs
router.get('/saved/list', getSavedJobs);

// Apply to a job
router.post('/:id/apply', applyToJob);

// Get user's applications
router.get('/applications/list', getUserApplications);

export default router;
