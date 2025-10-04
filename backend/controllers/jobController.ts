import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

// Get all jobs with optional filters
export const getAllJobs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      keyword,
      industry,
      location,
      jobType,
      experienceLevel,
      salaryMin,
      salaryMax,
      page = '1',
      limit = '20',
    } = req.query;

    const userId = req.user!.userId;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    // Keyword search (title or company name)
    if (keyword && typeof keyword === 'string') {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { company: { name: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    // Industry filter
    if (industry && typeof industry === 'string') {
      where.industry = {
        slug: industry,
      };
    }

    // Location filter
    if (location && typeof location === 'string') {
      where.OR = [
        { city: { contains: location, mode: 'insensitive' } },
        { state: { contains: location, mode: 'insensitive' } },
      ];
    }

    // Job type filter
    if (jobType && typeof jobType === 'string') {
      where.jobType = jobType;
    }

    // Experience level filter
    if (experienceLevel && typeof experienceLevel === 'string') {
      where.experienceLevel = experienceLevel;
    }

    // Salary filter
    if (salaryMin || salaryMax) {
      where.AND = where.AND || [];
      if (salaryMin && typeof salaryMin === 'string') {
        where.AND.push({ salaryMax: { gte: parseInt(salaryMin) } });
      }
      if (salaryMax && typeof salaryMax === 'string') {
        where.AND.push({ salaryMin: { lte: parseInt(salaryMax) } });
      }
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Fetch jobs with saved status for current user
    const jobs = await prisma.job.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            city: true,
            state: true,
          },
        },
        industry: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        savedJobs: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    // Transform data to include isSaved flag
    const jobsWithSavedStatus = jobs.map((job) => ({
      ...job,
      isSaved: job.savedJobs.length > 0,
      savedJobs: undefined,
    }));

    // Get total count for pagination
    const total = await prisma.job.count({ where });

    res.json({
      success: true,
      data: jobsWithSavedStatus,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message,
    });
  }
};

// Get single job by slug
export const getJobBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    const userId = req.user!.userId;

    const job = await prisma.job.findUnique({
      where: { slug },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true,
            website: true,
            city: true,
            state: true,
            companySize: true,
          },
        },
        industry: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        savedJobs: {
          where: { userId },
          select: { id: true },
        },
        applications: {
          where: { userId },
          select: {
            id: true,
            status: true,
            appliedAt: true,
          },
        },
      },
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    // Increment view count
    await prisma.job.update({
      where: { id: job.id },
      data: { viewCount: { increment: 1 } },
    });

    // Transform response
    const jobWithStatus = {
      ...job,
      isSaved: job.savedJobs.length > 0,
      hasApplied: job.applications.length > 0,
      applicationStatus: job.applications[0]?.status || null,
      savedJobs: undefined,
      applications: undefined,
    };

    res.json({
      success: true,
      data: jobWithStatus,
    });
  } catch (error: any) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job details',
      error: error.message,
    });
  }
};

// Toggle save/unsave job
export const toggleSaveJob = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user!.userId;

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    // Check if already saved
    const existingSave = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    let isSaved: boolean;

    if (existingSave) {
      // Unsave the job
      await prisma.savedJob.delete({
        where: { id: existingSave.id },
      });
      isSaved = false;
    } else {
      // Save the job
      await prisma.savedJob.create({
        data: {
          userId,
          jobId,
        },
      });
      isSaved = true;
    }

    res.json({
      success: true,
      message: isSaved ? 'Job saved successfully' : 'Job unsaved successfully',
      data: { isSaved },
    });
  } catch (error: any) {
    console.error('Error toggling save job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save/unsave job',
      error: error.message,
    });
  }
};

// Get saved jobs
export const getSavedJobs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId },
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            industry: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        savedAt: 'desc',
      },
      skip,
      take,
    });

    const jobs = savedJobs.map((saved) => ({
      ...saved.job,
      isSaved: true,
      savedAt: saved.savedAt,
    }));

    const total = await prisma.savedJob.count({ where: { userId } });

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved jobs',
      error: error.message,
    });
  }
};

// Apply to a job
export const applyToJob = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { coverLetter, resumeUrl } = req.body;

    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || !job.isActive) {
      res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
      });
      return;
    }

    // Check if already applied
    const existingApplication = await prisma.jobApplication.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    if (existingApplication) {
      res.status(400).json({
        success: false,
        message: 'You have already applied to this job',
      });
      return;
    }

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        userId,
        jobId,
        coverLetter,
        resumeUrl,
        status: 'PENDING',
      },
    });

    // Increment application count
    await prisma.job.update({
      where: { id: jobId },
      data: { applicationCount: { increment: 1 } },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        title: 'Application Submitted',
        message: `Your application for ${job.title} has been submitted successfully.`,
        type: 'APPLICATION_UPDATE',
      },
    });

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error: any) {
    console.error('Error applying to job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message,
    });
  }
};

// Get user's applications
export const getUserApplications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { status, page = '1', limit = '20' } = req.query;

    const where: any = { userId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const applications = await prisma.jobApplication.findMany({
      where,
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            industry: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
      skip,
      take,
    });

    const total = await prisma.jobApplication.count({ where });

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message,
    });
  }
};
