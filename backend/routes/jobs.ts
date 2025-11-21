import express from 'express';
import {
  getAllJobs,
  getJobBySlug,
  toggleSaveJob,
  getSavedJobs,
  applyToJob,
  getUserApplications,
  createJob,
  updateJob,
  getJobById,
  deleteJob,
  predictRecruitmentTime,
} from '../controllers/jobController';
import {
  getApplicantQualityScore,
  getJobApplicantScores,
  analyzeSalaryCompetitiveness,
} from '../controllers/intelligenceController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// User routes

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

//Employers routes
// Create a job
router.post('/create', createJob);

// Update a job
router.patch('/update/:jobId', updateJob);

// Get a job by ID
router.get('/getJob/:jobId', getJobById);

router.delete('/delete/:jobId', deleteJob);

// In your routes file
router.post('/predict-recruitment-time', predictRecruitmentTime);

// Quality score routes
router.get(
  '/applicants/:id/quality-score',
  authMiddleware,
  getApplicantQualityScore
);
router.get('applicant-scores/:jobId', authMiddleware, getJobApplicantScores);

// Add to your jobs routes
router.post('/analyze-salary', authMiddleware, analyzeSalaryCompetitiveness);
export default router;
