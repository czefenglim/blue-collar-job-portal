import express from 'express';
import {
  createCompany,
  submitVerification,
  createFirstJob,
  getEmployerProfile,
  getIndustries,
  updateCompanyProfile,
  getOnboardingStatus,
  completeOnboarding,
  getDashboardStats,
  getEmployerJobs,
  toggleJobStatus,
  getApplicants, // ✅ MISSING
  getApplicantDetail, // ✅ MISSING
  shortlistApplicant, // ✅ MISSING
  rejectApplicant,
  getVerificationStatus,
  resubmitCompany,
  uploadVerificationDocument,
  uploadCompanyLogo, // ✅ MISSING
} from '../controllers/employerController';
import authMiddleware from '../middleware/authMiddleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// ===================================================================
// ONBOARDING ROUTES
// ===================================================================

router.post(
  '/uploadCompanyLogo',
  authMiddleware,
  upload.single('logo'),
  uploadCompanyLogo.bind(uploadCompanyLogo)
);

// ✅ Add verification document upload route
router.post(
  '/uploadVerificationDocument',
  authMiddleware,
  upload.single('document'),
  uploadVerificationDocument.bind(uploadVerificationDocument)
);
/**
 * @route   POST /api/employer/company
 * @desc    Create company profile (Step 2)
 * @access  Private
 */
router.post('/company', authMiddleware, createCompany);

/**
 * @route   POST /api/employer/verification
 * @desc    Submit verification details (Step 3)
 * @access  Private
 */
router.post('/verification', authMiddleware, submitVerification);

/**
 * @route   POST /api/employer/first-job
 * @desc    Create first job post (Step 4)
 * @access  Private
 */
router.post('/first-job', authMiddleware, createFirstJob);

/**
 * @route   GET /api/employer/onboarding/:companyId
 * @desc    Check onboarding status
 * @access  Private
 */
router.get('/onboarding/:companyId', authMiddleware, getOnboardingStatus);

/**
 * @route   PATCH /api/employer/company/:companyId/complete-onboarding
 * @desc    Mark onboarding as complete
 * @access  Private
 */
router.patch(
  '/company/:companyId/complete-onboarding',
  authMiddleware,
  completeOnboarding
);

// ===================================================================
// PROFILE ROUTES
// ===================================================================

/**
 * @route   GET /api/employer/profile
 * @desc    Get employer profile (uses JWT token)
 * @access  Private
 */
router.get('/profile', authMiddleware, getEmployerProfile);

/**
 * @route   PATCH /api/employer/profile
 * @desc    Update company profile (uses JWT token)
 * @access  Private
 */
router.patch('/profile', authMiddleware, updateCompanyProfile);

/**
 * @route   PATCH /api/employer/company/:companyId
 * @desc    Update company profile by ID (legacy)
 * @access  Private
 */
router.patch('/company/:companyId', authMiddleware, updateCompanyProfile);

// ===================================================================
// DASHBOARD ROUTES
// ===================================================================

/**
 * @route   GET /api/employer/dashboard
 * @desc    Get employer dashboard statistics
 * @access  Private
 */
router.get('/dashboard', authMiddleware, getDashboardStats);

// ===================================================================
// JOBS ROUTES
// ===================================================================

/**
 * @route   GET /api/employer/jobs
 * @desc    Get all jobs for the employer's company
 * @access  Private
 */
router.get('/jobs', authMiddleware, getEmployerJobs);

/**
 * @route   PATCH /api/employer/jobs/:jobId/toggle-status
 * @desc    Toggle job status (active/closed)
 * @access  Private
 */
router.patch('/jobs/:jobId/toggle-status', authMiddleware, toggleJobStatus);

// ===================================================================
// APPLICANTS ROUTES (MISSING FROM YOUR FILE!)
// ===================================================================

/**
 * @route   GET /api/employer/applicants
 * @desc    Get all applicants for company jobs (paginated)
 * @access  Private
 */
router.get('/applicants', authMiddleware, getApplicants);

/**
 * @route   GET /api/employer/applicants/:applicationId
 * @desc    Get single applicant detail
 * @access  Private
 */
router.get('/applicants/:applicationId', authMiddleware, getApplicantDetail);

/**
 * @route   PATCH /api/employer/applicants/:applicationId/shortlist
 * @desc    Shortlist an applicant
 * @access  Private
 */
router.patch(
  '/applicants/:applicationId/shortlist',
  authMiddleware,
  shortlistApplicant
);

/**
 * @route   PATCH /api/employer/applicants/:applicationId/reject
 * @desc    Reject an applicant
 * @access  Private
 */
router.patch(
  '/applicants/:applicationId/reject',
  authMiddleware,
  rejectApplicant
);

/**
 * @route   GET /api/employer/verification/status
 * @desc    Get company verification status
 * @access  Private
 */
router.get('/verification/status', authMiddleware, getVerificationStatus);

/**
 * @route   POST /api/employer/verification/resubmit
 * @desc    Resubmit company for verification after rejection
 * @access  Private
 */
router.post('/verification/resubmit', authMiddleware, resubmitCompany);

// ===================================================================
// OTHER ROUTES
// ===================================================================

/**
 * @route   GET /api/employer/industries
 * @desc    Get all industries (used as job categories)
 * @access  Private (or Public if you want)
 */
router.get('/industries', authMiddleware, getIndustries);

export default router;
