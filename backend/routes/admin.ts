// src/routes/admin.routes.ts

import express from 'express';
import { body } from 'express-validator';
import { adminController } from '../controllers/adminController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (No auth required)
// ==========================================

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  adminController.login
);

// ==========================================
// PROTECTED ROUTES (Admin auth required)
// ==========================================

// Apply admin auth middleware to all routes below
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get dashboard analytics
 * @access  Admin only
 */
router.get('/analytics', adminController.getDashboardAnalytics);

// ==========================================
// USER MANAGEMENT
// ==========================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Admin only
 * @query   role, status, search, page, limit
 */
router.get('/users', adminController.getUsers);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Update user status (activate/suspend/delete)
 * @access  Admin only
 */
router.patch('/users/:userId/status', adminController.updateUserStatus);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
router.delete('/users/:userId', adminController.deleteUser);

// ==========================================
// JOB MANAGEMENT
// ==========================================

/**
 * @route   GET /api/admin/jobs/counts
 * @desc    Get job counts for dashboard tabs
 * @access  Admin only
 */
router.get('/jobs/counts', adminController.getJobCounts);

/**
 * @route   GET /api/admin/jobs
 * @desc    Get all jobs with filters
 * @access  Admin only
 * @query   approvalStatus, isActive, search, page, limit
 */
router.get('/jobs', adminController.getJobs);

/**
 * @route   GET /api/admin/jobs/:id
 * @desc    Get single job details by ID
 * @access  Admin only
 */
router.get('/jobs/:id', adminController.getJobById);

/**
 * @route   PATCH /api/admin/jobs/:id
 * @desc    Approve or reject job
 * @access  Admin only
 */
router.patch('/jobs/:jobId', adminController.updateJobApproval);

// ==========================================
// COMPANY MANAGEMENT (with Trust Scores)
// ==========================================

/**
 * @route   GET /api/admin/companies/pending
 * @desc    Get all pending companies for verification
 * @access  Admin only
 * @query   page, limit
 */
router.get('/companies/pending', adminController.getPendingCompanies);

/**
 * @route   GET /api/admin/companies
 * @desc    Get all companies with trust scores and filters
 * @access  Admin only
 * @query   verificationStatus, search, page, limit, sortBy, sortOrder
 */
router.get('/companies', adminController.getCompanies);

/**
 * @route   GET /api/admin/companies/:companyId
 * @desc    Get company details with full trust score breakdown
 * @access  Admin only
 */
router.get('/companies/:companyId', adminController.getCompanyDetails);

/**
 * @route   GET /api/admin/companies/:companyId/trust-score
 * @desc    Get trust score for a specific company
 * @access  Admin only
 */
router.get(
  '/companies/:companyId/trust-score',
  adminController.getCompanyTrustScore
);

/**
 * @route   POST /api/admin/companies/:companyId/approve
 * @desc    Approve company verification
 * @access  Admin only
 */
router.post('/companies/:companyId/approve', adminController.approveCompany);

/**
 * @route   POST /api/admin/companies/:companyId/reject
 * @desc    Reject company verification
 * @access  Admin only
 * @body    { reason: string }
 */
router.post(
  '/companies/:companyId/reject',
  [body('reason').notEmpty().withMessage('Rejection reason is required')],
  adminController.rejectCompany
);

/**
 * @route   PATCH /api/admin/companies/:companyId/disable
 * @desc    Disable company (set verification to DISABLED, suspend jobs & employer)
 * @access  Admin only
 * @body    { reason?: string }
 */
router.patch('/companies/:companyId/disable', adminController.disableCompany);

/**
 * @route   PATCH /api/admin/companies/:companyId/enable
 * @desc    Re-enable a disabled company
 * @access  Admin only
 * @body    { setAsApproved?: boolean }
 */
router.patch('/companies/:companyId/enable', adminController.enableCompany);

export default router;
