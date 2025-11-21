// import { Request, Response } from 'express';
// import { PrismaClient, ApplicationStatus } from '@prisma/client';

// import {
//   sendApplicationStatusNotification,
//   sendNewApplicationNotification,
// } from '../utils/notificationHelper';
// import { AuthRequest } from '../types/user';

// const prisma = new PrismaClient();

// // Apply for a job
// export const applyForJob = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.user?.userId;
//     const { jobId, coverLetter, resumeUrl } = req.body;

//     // Validate input
//     if (!jobId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Job ID is required',
//       });
//     }

//     // Check if job exists and is active
//     const job = await prisma.job.findUnique({
//       where: { id: parseInt(jobId) },
//       include: {
//         company: {
//           include: { user: true },
//         },
//       },
//     });

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: 'Job not found',
//       });
//     }

//     if (!job.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: 'This job is no longer accepting applications',
//       });
//     }

//     // Check if application deadline has passed
//     if (job.applicationDeadline && new Date() > job.applicationDeadline) {
//       return res.status(400).json({
//         success: false,
//         message: 'Application deadline has passed',
//       });
//     }

//     // Check if user has already applied
//     const existingApplication = await prisma.jobApplication.findUnique({
//       where: {
//         userId_jobId: {
//           userId,
//           jobId: parseInt(jobId),
//         },
//       },
//     });

//     if (existingApplication) {
//       return res.status(400).json({
//         success: false,
//         message: 'You have already applied for this job',
//       });
//     }

//     // Create application
//     const application = await prisma.jobApplication.create({
//       data: {
//         userId,
//         jobId: parseInt(jobId),
//         coverLetter,
//         resumeUrl,
//         status: ApplicationStatus.PENDING,
//       },
//     });

//     // Update job application count
//     await prisma.job.update({
//       where: { id: parseInt(jobId) },
//       data: {
//         applicationCount: {
//           increment: 1,
//         },
//       },
//     });

//     // Get applicant details
//     const applicant = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { fullName: true },
//     });

//     // Send notification to employer
//     if (job.company?.user) {
//       await sendNewApplicationNotification(
//         job.company.user.id,
//         applicant?.fullName || 'A candidate',
//         job.title,
//         application.id
//       );
//     }

//     return res.status(201).json({
//       success: true,
//       message: 'Application submitted successfully',
//       data: application,
//     });
//   } catch (error) {
//     console.error('Error applying for job:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to submit application',
//     });
//   }
// };

// // Get user's applications
// export const getMyApplications = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user.id;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const status = req.query.status as string;
//     const skip = (page - 1) * limit;

//     const where: any = { userId };
//     if (status) {
//       where.status = status;
//     }

//     const [applications, total] = await Promise.all([
//       prisma.jobApplication.findMany({
//         where,
//         include: {
//           job: {
//             include: {
//               company: true,
//               industry: true,
//             },
//           },
//         },
//         orderBy: { appliedAt: 'desc' },
//         skip,
//         take: limit,
//       }),
//       prisma.jobApplication.count({ where }),
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: applications,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching applications:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch applications',
//     });
//   }
// };

// // Get single application details
// export const getApplicationById = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user.id;
//     const { id } = req.params;

//     const application = await prisma.jobApplication.findFirst({
//       where: {
//         id: parseInt(id),
//         userId,
//       },
//       include: {
//         job: {
//           include: {
//             company: true,
//             industry: true,
//           },
//         },
//       },
//     });

//     if (!application) {
//       return res.status(404).json({
//         success: false,
//         message: 'Application not found',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: application,
//     });
//   } catch (error) {
//     console.error('Error fetching application:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch application',
//     });
//   }
// };

// // Withdraw application
// export const withdrawApplication = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user.id;
//     const { id } = req.params;

//     const application = await prisma.jobApplication.findFirst({
//       where: {
//         id: parseInt(id),
//         userId,
//       },
//     });

//     if (!application) {
//       return res.status(404).json({
//         success: false,
//         message: 'Application not found',
//       });
//     }

//     // Check if application can be withdrawn
//     if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cannot withdraw this application',
//       });
//     }

//     const updatedApplication = await prisma.jobApplication.update({
//       where: { id: parseInt(id) },
//       data: {
//         status: ApplicationStatus.WITHDRAWN,
//       },
//     });

//     // Decrement job application count
//     await prisma.job.update({
//       where: { id: application.jobId },
//       data: {
//         applicationCount: {
//           decrement: 1,
//         },
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Application withdrawn successfully',
//       data: updatedApplication,
//     });
//   } catch (error) {
//     console.error('Error withdrawing application:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to withdraw application',
//     });
//   }
// };

// // ==========================================
// // EMPLOYER ENDPOINTS
// // ==========================================

// // Get applications for employer's jobs
// export const getJobApplications = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user.id;
//     const { jobId } = req.params;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const status = req.query.status as string;
//     const skip = (page - 1) * limit;

//     // Verify job belongs to employer
//     const job = await prisma.job.findFirst({
//       where: {
//         id: parseInt(jobId),
//         company: {
//           userId,
//         },
//       },
//     });

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: 'Job not found or access denied',
//       });
//     }

//     const where: any = { jobId: parseInt(jobId) };
//     if (status) {
//       where.status = status;
//     }

//     const [applications, total] = await Promise.all([
//       prisma.jobApplication.findMany({
//         where,
//         include: {
//           user: {
//             select: {
//               id: true,
//               fullName: true,
//               email: true,
//               phoneNumber: true,
//               profile: {
//                 select: {
//                   experienceYears: true,
//                   resumeUrl: true,
//                   profilePicture: true,
//                   skills: true,
//                   industries: {
//                     include: {
//                       industry: true,
//                     },
//                   },
//                 },
//               },
//             },
//           },
//           job: {
//             select: {
//               id: true,
//               title: true,
//             },
//           },
//         },
//         orderBy: { appliedAt: 'desc' },
//         skip,
//         take: limit,
//       }),
//       prisma.jobApplication.count({ where }),
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: applications,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching job applications:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch job applications',
//     });
//   }
// };

// // Update application status (employer)
// export const updateApplicationStatus = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user.id;
//     const { id } = req.params;
//     const { status, employerNote, interviewDate } = req.body;

//     // Validate status
//     const validStatuses = [
//       'PENDING',
//       'REVIEWING',
//       'SHORTLISTED',
//       'INTERVIEW_SCHEDULED',
//       'INTERVIEWED',
//       'REJECTED',
//       'HIRED',
//     ];

//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status',
//       });
//     }

//     // Get application and verify access
//     const application = await prisma.jobApplication.findUnique({
//       where: { id: parseInt(id) },
//       include: {
//         job: {
//           include: {
//             company: true,
//           },
//         },
//         user: true,
//       },
//     });

//     if (!application) {
//       return res.status(404).json({
//         success: false,
//         message: 'Application not found',
//       });
//     }

//     // Verify employer owns this job
//     if (application.job.company.userId !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied',
//       });
//     }

//     // Update application
//     const updateData: any = {
//       status,
//     };

//     if (employerNote) {
//       updateData.employerNote = employerNote;
//     }

//     if (interviewDate) {
//       updateData.interviewDate = new Date(interviewDate);
//     }

//     const updatedApplication = await prisma.jobApplication.update({
//       where: { id: parseInt(id) },
//       data: updateData,
//     });

//     // Send notification to job seeker
//     await sendApplicationStatusNotification(
//       application.userId,
//       application.job.title,
//       status,
//       application.id
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Application status updated',
//       data: updatedApplication,
//     });
//   } catch (error) {
//     console.error('Error updating application status:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to update application status',
//     });
//   }
// };

// // Get all applications for employer (across all jobs)
// export const getAllEmployerApplications = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const userId = (req as any).user.id;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const status = req.query.status as string;
//     const skip = (page - 1) * limit;

//     // Get employer's company
//     const company = await prisma.company.findUnique({
//       where: { userId },
//     });

//     if (!company) {
//       return res.status(404).json({
//         success: false,
//         message: 'Company not found',
//       });
//     }

//     const where: any = {
//       job: {
//         companyId: company.id,
//       },
//     };

//     if (status) {
//       where.status = status;
//     }

//     const [applications, total] = await Promise.all([
//       prisma.jobApplication.findMany({
//         where,
//         include: {
//           user: {
//             select: {
//               id: true,
//               fullName: true,
//               email: true,
//               phoneNumber: true,
//               profile: {
//                 select: {
//                   experienceYears: true,
//                   resumeUrl: true,
//                   profilePicture: true,
//                 },
//               },
//             },
//           },
//           job: {
//             select: {
//               id: true,
//               title: true,
//               slug: true,
//             },
//           },
//         },
//         orderBy: { appliedAt: 'desc' },
//         skip,
//         take: limit,
//       }),
//       prisma.jobApplication.count({ where }),
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: applications,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching employer applications:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to fetch applications',
//     });
//   }
// };
