// import express from 'express';
// import {
//   applyForJob,
//   getMyApplications,
//   getApplicationById,
//   withdrawApplication,
//   getJobApplications,
//   updateApplicationStatus,
//   getAllEmployerApplications,
// } from '../controllers/applicationController';
// import authMiddleware from '../middleware/authMiddleware';

// const router = express.Router();

// // All routes require authentication
// router.use(authMiddleware);

// // ==========================================
// // JOB SEEKER ROUTES
// // ==========================================

// // Apply for a job
// router.post('/apply', applyForJob);

// // Get my applications
// router.get('/my-applications', getMyApplications);

// // Get single application
// router.get('/my-applications/:id', getApplicationById);

// // Withdraw application
// router.put('/my-applications/:id/withdraw', withdrawApplication);

// // ==========================================
// // EMPLOYER ROUTES
// // ==========================================

// // Get all applications across all jobs
// router.get('/employer/all', getAllEmployerApplications);

// // Get applications for a specific job
// router.get('/employer/job/:jobId', getJobApplications);

// // Update application status
// router.put('/employer/:id/status', updateApplicationStatus);

// export default router;
