import { Request, Response } from 'express';
import {
  PrismaClient,
  Prisma,
  ApprovalStatus,
  ApplicationStatus,
  UserRole,
  NotificationType,
  JobType,
  ExperienceLevel,
} from '@prisma/client';
import { AuthRequest, SupportedLang } from '../types/common';
import {
  JobWithDetails,
  CreateJobRequest,
  UpdateJobRequest,
} from '../types/job';
import {
  JobApplication,
  CreateApplicationRequest,
  JobApplicationWithDetails,
} from '../types/application';
import { UserProfile } from '../types/user';
import { translateJobs } from '../workers/translationWorker';
import { translateText } from '../services/googleTranslation';
import slugify from 'slugify';
import {
  sendJobApprovedNotification,
  sendJobRejectedNotification,
  sendJobMatchNotification,
  sendApplicationStatusNotification,
  sendNewApplicationNotification,
} from '../utils/notificationHelper';
import { geocodeAddress, calculateDistance } from '../utils/geocoding';
import { AIJobVerificationService } from '../services/aiJobVerification';
import { labelEnum } from '../utils/enumLabels';
import { AdminAuthRequest } from '../types/admin';
import { RecruitmentPredictionService } from '../services/recruitmentPrediction';
import { getSignedDownloadUrl } from '../services/s3Service';
import { JobWhereInput, JobApplicationWhereInput } from '../types/input';
import { VerificationResult } from '../types/ai';

const prisma = new PrismaClient();

// Helper to resolve provided translations or auto-translate from base language
async function resolveTranslations(
  base?: string | null,
  ms?: string | null,
  ta?: string | null,
  zh?: string | null
) {
  const needsTranslate = (v?: string | null) => !v || v.trim() === '';
  const [enVal, msVal, taVal, zhVal] = await Promise.all([
    base ? translateText(base, 'en') : null,
    needsTranslate(ms) && base ? translateText(base, 'ms') : ms || null,
    needsTranslate(ta) && base ? translateText(base, 'ta') : ta || null,
    needsTranslate(zh) && base ? translateText(base, 'zh') : zh || null,
  ]);
  return { en: enVal, ms: msVal, ta: taVal, zh: zhVal };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

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
      lang = 'en',
      distance,
      userLat,
      userLon,
    } = req.query;

    const userId = req.user!.userId;

    const where: Prisma.JobWhereInput = {
      isActive: true,
      approvalStatus: 'APPROVED',
    };

    if (keyword && typeof keyword === 'string') {
      where.OR = [
        { title: { contains: keyword } },
        {
          company: {
            name: { contains: keyword },
          },
        },
      ];
    }

    if (industry && typeof industry === 'string') {
      where.industry = { slug: industry };
    }

    if (location && typeof location === 'string') {
      where.OR = [
        { city: { contains: location } },
        { state: { contains: location } },
      ];
    }

    if (jobType && typeof jobType === 'string')
      where.jobType = jobType as JobType;
    if (experienceLevel && typeof experienceLevel === 'string')
      where.experienceLevel = experienceLevel as ExperienceLevel;

    if (salaryMin || salaryMax) {
      where.AND = where.AND || [];
      if (salaryMin && typeof salaryMin === 'string') {
        where.AND = Array.isArray(where.AND)
          ? where.AND
          : where.AND
          ? [where.AND]
          : [];
        (where.AND as Prisma.JobWhereInput[]).push({
          salaryMax: { gte: parseInt(salaryMin) },
        });
      }
      if (salaryMax && typeof salaryMax === 'string') {
        where.AND = Array.isArray(where.AND)
          ? where.AND
          : where.AND
          ? [where.AND]
          : [];
        (where.AND as Prisma.JobWhereInput[]).push({
          salaryMin: { lte: parseInt(salaryMax) },
        });
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    let jobs = (await prisma.job.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, logo: true, city: true, state: true },
        },
        industry: {
          select: { id: true, name: true, slug: true },
        },
        savedJobs: {
          where: {
            userId,
            job: {
              isActive: true,
              approvalStatus: 'APPROVED',
            },
          },
          select: { id: true },
        },
        reports: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: distance ? undefined : take,
    })) as unknown as JobWithDetails[];

    // FILTER BY DISTANCE IF PROVIDED
    if (distance && userLat && userLon) {
      const maxDistance = parseFloat(distance as string);
      const userLatitude = parseFloat(userLat as string);
      const userLongitude = parseFloat(userLon as string);

      console.log(
        `Filtering jobs within ${maxDistance}km of (${userLatitude}, ${userLongitude})`
      );

      jobs = jobs.filter((job) => {
        if (job.latitude == null || job.longitude == null) {
          return false;
        }

        const dist = calculateDistance(
          userLatitude,
          userLongitude,
          job.latitude as number,
          job.longitude as number
        );

        return dist <= maxDistance;
      });

      jobs = jobs.slice(skip, skip + take);
    }

    // ✅ Generate signed URLs for company logos
    const jobsWithSignedUrls = await Promise.all(
      jobs.map(async (job) => {
        const jobData = { ...job };

        if (jobData.company?.logo) {
          try {
            const signedLogoUrl = await getSignedDownloadUrl(
              jobData.company.logo,
              3600
            );
            jobData.company.logo = signedLogoUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for company logo:',
              error
            );
            jobData.company.logo = null;
          }
        }

        return jobData;
      })
    );

    // Map data to translated version
    const jobsWithTranslatedFields = jobsWithSignedUrls.map((job) => {
      const currentLang = (lang as SupportedLang) || 'en';
      const title = (job[`title_${currentLang}`] as string) || job.title;
      const description =
        (job[`description_${currentLang}`] as string) || job.description;
      const requirements =
        (job[`requirements_${currentLang}`] as string) || job.requirements;
      const benefits =
        (job[`benefits_${currentLang}`] as string) || job.benefits;

      return {
        ...job,
        title,
        description,
        requirements,
        benefits,
        jobTypeLabel: labelEnum('JobType', job.jobType, currentLang),
        workingHoursLabel: labelEnum(
          'WorkingHours',
          job.workingHours,
          currentLang
        ),
        experienceLevelLabel: labelEnum(
          'ExperienceLevel',
          job.experienceLevel,
          currentLang
        ),
        isSaved: job.savedJobs ? job.savedJobs.length > 0 : false,
        isReported: job.reports ? job.reports.length > 0 : false,
        savedJobs: undefined,
      };
    });

    const total = distance ? jobs.length : await prisma.job.count({ where });

    res.json({
      success: true,
      data: jobsWithTranslatedFields,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: getErrorMessage(error),
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
    const { lang = 'en' } = req.query;
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
            name_ms: true,
            name_ta: true,
            name_zh: true,
            description_ms: true,
            description_ta: true,
            description_zh: true,
          },
        },
        industry: {
          select: {
            id: true,
            name: true,
            slug: true,
            name_en: true,
            name_ms: true,
            name_ta: true,
            name_zh: true,
          },
        },
        savedJobs: { where: { userId }, select: { id: true } },
        reports: {
          where: { userId },
          select: { id: true },
        },
        applications: {
          where: { userId },
          select: { id: true, status: true, appliedAt: true },
        },
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { viewCount: { increment: 1 } },
    });

    // Generate signed URL for company logo
    let signedLogoUrl = job.company?.logo || null;

    if (job.company?.logo) {
      try {
        signedLogoUrl = await getSignedDownloadUrl(job.company.logo, 3600);
        console.log(
          '✅ Signed URL generated for job details:',
          signedLogoUrl.substring(0, 100)
        );
      } catch (error) {
        console.error('Error generating signed URL for company logo:', error);
        signedLogoUrl = null;
      }
    }

    // Replace with translated fields
    const jobData = job as unknown as JobWithDetails;
    const currentLang = (lang as SupportedLang) || 'en';

    const jobWithTranslated = {
      ...jobData,
      // Job translations
      title: jobData[`title_${currentLang}`] || jobData.title,
      description: jobData[`description_${currentLang}`] || jobData.description,
      requirements:
        jobData[`requirements_${currentLang}`] || jobData.requirements,
      benefits: jobData[`benefits_${currentLang}`] || jobData.benefits,

      // Enum label translations
      jobTypeLabel: labelEnum('JobType', jobData.jobType, currentLang),
      workingHoursLabel: labelEnum(
        'WorkingHours',
        jobData.workingHours,
        currentLang
      ),
      experienceLevelLabel: labelEnum(
        'ExperienceLevel',
        jobData.experienceLevel,
        currentLang
      ),

      // Company translations
      company: {
        id: jobData.company.id,
        website: jobData.company.website,
        city: jobData.company.city,
        state: jobData.company.state,
        // ✅ ADDED: Translate company size
        companySize: jobData.company.companySize,
        companySizeLabel: labelEnum(
          'CompanySize',
          jobData.company.companySize,
          currentLang
        ),
        logo: signedLogoUrl,
        name: jobData.company[`name_${currentLang}`] || jobData.company.name,
        description:
          jobData.company[`description_${currentLang}`] ||
          jobData.company.description,
      },

      // Industry translation
      industry: {
        id: jobData.industry.id,
        slug: jobData.industry.slug,
        name: jobData.industry[`name_${currentLang}`] || jobData.industry.name,
      },

      // Application status
      isSaved: jobData.savedJobs ? jobData.savedJobs.length > 0 : false,
      isReported: jobData.reports ? jobData.reports.length > 0 : false,
      hasApplied: jobData.applications
        ? jobData.applications.length > 0
        : false,
      applicationStatus:
        jobData.applications && jobData.applications[0]
          ? jobData.applications[0].status
          : null,
      savedJobs: undefined,
      applications: undefined,
    };

    console.log('📦 Job details response:', {
      lang: lang,
      title: jobWithTranslated.title,
      companyName: jobWithTranslated.company.name,
      companySizeLabel: jobWithTranslated.company.companySizeLabel,
      companyDescPreview: jobWithTranslated.company.description?.substring(
        0,
        50
      ),
      industryName: jobWithTranslated.industry.name,
      hasLogo: !!jobWithTranslated.company.logo,
    });

    res.json({ success: true, data: jobWithTranslated });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job details',
      error: getErrorMessage(error),
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
  } catch (error) {
    console.error('Error toggling save job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save/unsave job',
      error: getErrorMessage(error),
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
    const { page = '1', limit = '20', lang = 'en' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const savedJobs = await prisma.savedJob.findMany({
      where: { userId },
      include: {
        job: {
          include: {
            company: {
              select: { id: true, name: true, logo: true },
            },
            industry: {
              select: {
                id: true,
                name: true,
                slug: true,
                name_en: true,
                name_ms: true,
                name_ta: true,
                name_zh: true,
              },
            },
          },
        },
      },
      orderBy: { savedAt: 'desc' },
      skip,
      take,
    });

    // ✅ Add translation support and generate signed URLs
    const jobs = await Promise.all(
      savedJobs.map(async (saved: any) => {
        const jobData = saved.job as unknown as JobWithDetails;
        const currentLang = (lang as SupportedLang) || 'en';

        // Generate signed URL for company logo
        if (jobData.company?.logo) {
          try {
            const signedLogoUrl = await getSignedDownloadUrl(
              jobData.company.logo,
              3600
            );
            jobData.company.logo = signedLogoUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for company logo:',
              error
            );
            jobData.company.logo = null;
          }
        }

        const translatedJob = {
          ...jobData,
          title: (jobData[`title_${currentLang}`] as string) || jobData.title,
          description:
            (jobData[`description_${currentLang}`] as string) ||
            jobData.description,
          requirements:
            (jobData[`requirements_${currentLang}`] as string) ||
            jobData.requirements,
          benefits:
            (jobData[`benefits_${currentLang}`] as string) || jobData.benefits,
          jobTypeLabel: labelEnum('JobType', jobData.jobType, currentLang),
          workingHoursLabel: labelEnum(
            'WorkingHours',
            jobData.workingHours,
            currentLang
          ),
          experienceLevelLabel: labelEnum(
            'ExperienceLevel',
            jobData.experienceLevel,
            currentLang
          ),
          industry: {
            id: jobData.industry.id,
            slug: jobData.industry.slug,
            name:
              jobData.industry[`name_${currentLang}`] || jobData.industry.name,
          },
        };

        return {
          ...translatedJob,
          isSaved: true,
          savedAt: saved.savedAt,
        };
      })
    );

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
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved jobs',
      error: getErrorMessage(error),
    });
  }
};

export const applyToJob = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const { coverLetter, resumeUrl } = req.body as CreateApplicationRequest;

    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: {
          include: { user: true },
        },
      },
    });

    if (!job || !job.isActive) {
      res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
      });
      return;
    }

    // Check if application deadline has passed
    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      res.status(400).json({
        success: false,
        message: 'Application deadline has passed',
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

    // Determine resume key to store with application (prefer client-provided, else from profile by preferred language)
    let resumeRef: string | null = null;
    if (resumeUrl && typeof resumeUrl === 'string') {
      resumeRef = resumeUrl.startsWith('http') ? null : resumeUrl;
    }
    if (!resumeRef) {
      const applicant = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      const preferred = applicant?.preferredLanguage || 'ENGLISH';
      const p = applicant?.profile as unknown as UserProfile;
      const langMap: Record<string, string> = {
        ENGLISH: 'en',
        MALAY: 'ms',
        CHINESE: 'zh',
        TAMIL: 'ta',
      };
      const pl = langMap[preferred] || 'en';
      if (p) {
        resumeRef =
          (pl === 'ms' && p.resumeUrl_ms) ||
          (pl === 'zh' && p.resumeUrl_zh) ||
          (pl === 'ta' && p.resumeUrl_ta) ||
          p.resumeUrl_en ||
          p.resumeUrl_uploaded ||
          null;
      }
    }

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        userId,
        jobId,
        coverLetter,
        resumeUrl: resumeRef ?? undefined,
        status: ApplicationStatus.PENDING,
      },
    });

    // Increment application count
    await prisma.job.update({
      where: { id: jobId },
      data: { applicationCount: { increment: 1 } },
    });

    // Get applicant details
    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    // Send notification to employer
    if (job.company?.user) {
      await sendNewApplicationNotification(
        job.company.user.id,
        applicant?.fullName || 'A candidate',
        job.title,
        application.id
      );
    }

    // Send notification to applicant (confirmation)
    await sendApplicationStatusNotification(
      userId,
      job.title,
      'PENDING',
      application.id
    );

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: getErrorMessage(error),
    });
  }
};

export const getUserApplications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { status, page = '1', limit = '20', lang = 'en' } = req.query;

    const where: Prisma.JobApplicationWhereInput = { userId };
    if (status && typeof status === 'string') {
      where.status = status as ApplicationStatus;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const applications = await prisma.jobApplication.findMany({
      where,
      include: {
        job: {
          include: {
            company: {
              select: { id: true, name: true, logo: true },
            },
            industry: {
              select: {
                id: true,
                name: true,
                slug: true,
                name_en: true,
                name_ms: true,
                name_ta: true,
                name_zh: true,
              },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      skip,
      take,
    });

    // ✅ Add translation support and generate signed URLs
    const applicationsWithTranslatedJobs = await Promise.all(
      applications.map(async (app: any) => {
        const jobData = app.job as unknown as JobWithDetails;
        const currentLang = (lang as SupportedLang) || 'en';

        // Generate signed URL for company logo
        if (jobData.company?.logo) {
          try {
            const signedLogoUrl = await getSignedDownloadUrl(
              jobData.company.logo,
              3600
            );
            jobData.company.logo = signedLogoUrl;
          } catch (error) {
            console.error(
              'Error generating signed URL for company logo:',
              error
            );
            jobData.company.logo = null;
          }
        }

        const translatedJob = {
          ...jobData,
          title: jobData[`title_${currentLang}`] || jobData.title,
          description:
            jobData[`description_${currentLang}`] || jobData.description,
          requirements:
            jobData[`requirements_${currentLang}`] || jobData.requirements,
          benefits: jobData[`benefits_${currentLang}`] || jobData.benefits,
          jobTypeLabel: labelEnum('JobType', jobData.jobType, currentLang),
          workingHoursLabel: labelEnum(
            'WorkingHours',
            jobData.workingHours,
            currentLang
          ),
          experienceLevelLabel: labelEnum(
            'ExperienceLevel',
            jobData.experienceLevel,
            currentLang
          ),
          industry: {
            id: jobData.industry.id,
            slug: jobData.industry.slug,
            name:
              jobData.industry[`name_${currentLang}`] || jobData.industry.name,
          },
        };

        return {
          ...app,
          job: translatedJob,
        };
      })
    );

    const total = await prisma.jobApplication.count({ where });

    res.json({
      success: true,
      data: applicationsWithTranslatedJobs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: getErrorMessage(error),
    });
  }
};

export const createJob = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      title,
      description,
      requirements,
      benefits,
      industryId,
      jobType,
      workingHours,
      experienceLevel,
      skills,
      city,
      state,
      postcode,
      address,
      isRemote,
      salaryMin,
      salaryMax,
      salaryType,
      applicationDeadline,
      startDate,
    } = req.body as CreateJobRequest;

    // Optional pre-translated fields from client
    const {
      title_ms,
      title_ta,
      title_zh,
      description_ms,
      description_ta,
      description_zh,
      requirements_ms,
      requirements_ta,
      requirements_zh,
      benefits_ms,
      benefits_ta,
      benefits_zh,
    } = req.body;

    // VALIDATE REQUIRED FIELDS
    if (!title || !description || !industryId || !city || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // GET USER'S COMPANY
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found. Please complete company profile first.',
      });
    }

    const company = user.company;

    // ✅ CHECK COMPANY VERIFICATION STATUS
    if (!company.isVerified || company.verificationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message:
          'Your company must be verified before posting jobs. Please wait for admin approval.',
      });
    }

    // VERIFY INDUSTRY
    const industry = await prisma.industry.findUnique({
      where: { id: industryId },
    });

    if (!industry) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found',
      });
    }

    // ✅ RUN AI VERIFICATION WITH COHERE
    console.log('🤖 Starting AI verification for job post...');

    const verificationResult: VerificationResult =
      await AIJobVerificationService.verifyJob({
        title,
        description,
        requirements,
        benefits,
        salaryMin,
        salaryMax,
        salaryType,
        city,
        state,
        industryId,
        companyId: company.id,
      });

    console.log('🤖 AI Verification Complete:', {
      riskScore: verificationResult.riskScore,
      autoApprove: verificationResult.autoApprove,
      flags: verificationResult.flags,
    });

    // ✅ DETERMINE APPROVAL STATUS BASED ON AI RESULT
    let approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED_AI' = 'PENDING';
    let rejectionReason: string | null = null;

    if (verificationResult.autoApprove) {
      approvalStatus = 'APPROVED';
      console.log('✅ Job auto-approved by AI');
    } else if (verificationResult.riskScore > 70) {
      // ✅ Auto-reject high-risk jobs with REJECTED_AI status
      approvalStatus = 'REJECTED_AI';
      rejectionReason = `Auto-rejected by AI verification (Risk Score: ${verificationResult.riskScore}/100):\n\n${verificationResult.flagReason}`;
      console.log('❌ Job auto-rejected by AI (high risk)');
    } else {
      // Flag for human review
      approvalStatus = 'PENDING';
      console.log('⚠️ Job flagged for human review');
    }

    // GEOCODE JOB LOCATION
    let coordinates: { latitude: number; longitude: number } | null = null;

    if (address || city || state || postcode) {
      console.log(`📍 Geocoding job location: ${city}, ${state}`);

      const geocodingResult = await geocodeAddress(
        address ?? '',
        city || undefined,
        state || undefined,
        postcode ?? undefined
      );

      if (geocodingResult) {
        coordinates = {
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude,
        };
        console.log(
          `✅ Job geocoding successful: ${JSON.stringify(coordinates)}`
        );
      } else {
        console.warn(`⚠️ Job geocoding failed, continuing without coordinates`);
      }
    }

    // Resolve translations for core fields
    const titleTr = await resolveTranslations(
      title,
      title_ms,
      title_ta,
      title_zh
    );
    const descTr = await resolveTranslations(
      description,
      description_ms,
      description_ta,
      description_zh
    );
    const reqTr = await resolveTranslations(
      requirements || null,
      requirements_ms,
      requirements_ta,
      requirements_zh
    );
    const benTr = await resolveTranslations(
      benefits || null,
      benefits_ms,
      benefits_ta,
      benefits_zh
    );

    // GENERATE SLUG FROM ENGLISH TRANSLATION ONLY (title_en)
    // Ensure we end up with an ASCII slug that contains alphanumeric characters.
    const normalizeSlug = (s: string) =>
      s.replace(/-+/g, '-').replace(/^\-+|\-+$/g, '');
    const hasAlphaNum = (s: string) => /[a-z0-9]/.test(s);

    const englishTitle = (titleTr?.en ?? null) as string | null;
    let slugCandidate = englishTitle
      ? normalizeSlug(slugify(englishTitle, { lower: true, strict: true }))
      : '';
    if (!hasAlphaNum(slugCandidate)) {
      // Guaranteed fallback with numeric content if English translation is missing or unusable
      slugCandidate = `job-${company.id}-${Date.now()}`;
    }

    // Ensure uniqueness by checking once and appending a timestamp if needed
    const existingJob = await prisma.job.findUnique({
      where: { slug: slugCandidate },
    });
    const slug = existingJob ? `${slugCandidate}-${Date.now()}` : slugCandidate;

    // ✅ CREATE JOB WITH AI VERIFICATION DATA
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        title: title.trim(),
        title_ms: titleTr.ms ?? undefined,
        title_ta: titleTr.ta ?? undefined,
        title_zh: titleTr.zh ?? undefined,
        title_en: titleTr.en ?? undefined,
        slug,
        description: description.trim(),
        description_ms: descTr.ms ?? undefined,
        description_ta: descTr.ta ?? undefined,
        description_zh: descTr.zh ?? undefined,
        description_en: descTr.en ?? undefined,
        requirements: requirements?.trim(),
        requirements_ms: reqTr.ms ?? undefined,
        requirements_ta: reqTr.ta ?? undefined,
        requirements_zh: reqTr.zh ?? undefined,
        requirements_en: reqTr.en ?? undefined,
        benefits: benefits?.trim(),
        benefits_ms: benTr.ms ?? undefined,
        benefits_ta: benTr.ta ?? undefined,
        benefits_zh: benTr.zh ?? undefined,
        benefits_en: benTr.en ?? undefined,
        industryId,
        jobType,
        workingHours,
        experienceLevel,
        skills: skills,
        city: city.trim(),
        state,
        postcode: postcode?.trim(),
        address: address?.trim(),
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        isRemote: isRemote || false,
        salaryMin,
        salaryMax,
        salaryType,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : null,
        startDate: startDate ? new Date(startDate) : null,

        // ✅ SET APPROVAL STATUS FROM AI (using REJECTED_AI instead of REJECTED)
        approvalStatus,
        isActive: approvalStatus === 'APPROVED', // Only active if auto-approved
        approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
        rejectedAt: approvalStatus === 'REJECTED_AI' ? new Date() : null,
        rejectionReason,

        isFeatured: false,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        industry: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Trigger translations in background for job fields
    translateJobs().catch((err) =>
      console.error('Translation error for job:', err)
    );

    // ✅ SEND NOTIFICATIONS BASED ON APPROVAL STATUS
    if (approvalStatus === 'APPROVED') {
      // Notify employer
      await sendJobApprovedNotification(userId, job.title, job.id);

      // Find matching job seekers and notify them
      const matchingUsers = await findMatchingJobSeekers(job);
      for (const matchUser of matchingUsers) {
        await sendJobMatchNotification(
          matchUser.id,
          job.title,
          job.company.name,
          job.slug
        );
      }

      console.log(
        `✅ Job approved and notifications sent to ${matchingUsers.length} matching users`
      );
    } else if (approvalStatus === 'REJECTED_AI') {
      // ✅ Notify employer with appeal option (with translations)
      const notifMsg = `Your job post "${job.title}" was rejected by our automated review. You can appeal this decision if you believe this is a legitimate job posting.`;
      const n_ms = await translateText(notifMsg, 'ms');
      const n_ta = await translateText(notifMsg, 'ta');
      const n_zh = await translateText(notifMsg, 'zh');
      await prisma.notification.create({
        data: {
          userId,
          title: 'Job Post Rejected by AI',
          message: notifMsg,
          message_en: notifMsg,
          message_ms: n_ms ?? undefined,
          message_ta: n_ta ?? undefined,
          message_zh: n_zh ?? undefined,
          type: 'SYSTEM_UPDATE',
          actionUrl: `/(employer-hidden)/job-post-details/${job.id}`,
        },
      });
      console.log(
        '❌ Job rejected by AI, employer notified with appeal option'
      );
    } else {
      // Pending - notify that it's under review (with translations)
      const notifMsg = `Your job post "${job.title}" is being reviewed by our team. You'll be notified once it's approved.`;
      const n_ms = await translateText(notifMsg, 'ms');
      const n_ta = await translateText(notifMsg, 'ta');
      const n_zh = await translateText(notifMsg, 'zh');
      await prisma.notification.create({
        data: {
          userId,
          title: 'Job Post Under Review',
          message: notifMsg,
          message_en: notifMsg,
          message_ms: n_ms ?? undefined,
          message_ta: n_ta ?? undefined,
          message_zh: n_zh ?? undefined,
          type: 'SYSTEM_UPDATE',
          actionUrl: `/(employer-hidden)/job-post-details/${job.id}`,
        },
      });
      console.log('⚠️ Job pending review, employer notified');
    }

    // TRIGGER BACKGROUND TRANSLATION (Optional)
    if (translateJobs && approvalStatus === 'APPROVED') {
      translateJobs().catch((err) =>
        console.error('Translation error for job:', err)
      );
    }

    // ✅ RETURN SUCCESS WITH AI VERIFICATION INFO
    return res.status(201).json({
      success: true,
      message:
        approvalStatus === 'APPROVED'
          ? 'Job post created and approved automatically by AI!'
          : approvalStatus === 'REJECTED_AI'
          ? 'Job post rejected by AI verification. You can appeal this decision from your job posts page.'
          : 'Job post created and is pending human review.',
      data: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        jobType: job.jobType,
        workingHours: job.workingHours,
        experienceLevel: job.experienceLevel,
        city: job.city,
        state: job.state,
        isRemote: job.isRemote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryType: job.salaryType,
        isActive: job.isActive,
        approvalStatus: job.approvalStatus,
        latitude: job.latitude,
        longitude: job.longitude,
        geocoded: coordinates !== null,
        industry: job.industry,
        company: job.company,
        createdAt: job.createdAt,

        // ✅ AI VERIFICATION INFO
        aiVerification: {
          riskScore: verificationResult.riskScore,
          flags: verificationResult.flags,
          autoApproved: verificationResult.autoApprove,
          summary:
            AIJobVerificationService.generateVerificationSummary(
              verificationResult
            ),
          canAppeal: approvalStatus === 'REJECTED_AI', // ✅ NEW: Indicate if employer can appeal
        },
      },
    });
  } catch (error) {
    console.error('❌ Error creating job:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Internal server error',
    });
  }
};

// ===================================================================
// PATCH: Update Job Post
// ===================================================================
export const updateJob = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Check if job exists and belongs to company
    const existingJob = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
    });

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (existingJob.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job',
      });
    }

    // ✅ CHECK: Cannot edit REJECTED_FINAL jobs
    if (existingJob.approvalStatus === 'REJECTED_FINAL') {
      return res.status(403).json({
        success: false,
        message: 'This job has been permanently rejected and cannot be edited.',
      });
    }

    const {
      title,
      description,
      requirements,
      benefits,
      industryId,
      jobType,
      workingHours,
      experienceLevel,
      skills,
      city,
      state,
      postcode,
      address,
      isRemote,
      salaryMin,
      salaryMax,
      salaryType,
      applicationDeadline,
      startDate,
    } = req.body as UpdateJobRequest;

    // Validate salary range if provided
    if (salaryMin && salaryMax && salaryMin > salaryMax) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot exceed maximum salary',
      });
    }

    // ✅ DETERMINE IF AI VERIFICATION IS NEEDED
    // Run AI verification if job was previously rejected by AI
    const needsAIVerification = existingJob.approvalStatus === 'REJECTED_AI';

    let approvalStatus = existingJob.approvalStatus;
    let rejectionReason = existingJob.rejectionReason;
    let isActive = existingJob.isActive;
    let approvedAt = existingJob.approvedAt;
    let rejectedAt = existingJob.rejectedAt;
    let verificationResult: VerificationResult | null = null;

    if (needsAIVerification) {
      console.log('🤖 Running AI verification for edited job...');

      verificationResult = await AIJobVerificationService.verifyJob({
        title: title || existingJob.title,
        description: description || existingJob.description,
        requirements: requirements || existingJob.requirements || undefined,
        benefits: benefits || existingJob.benefits || undefined,
        salaryMin: salaryMin ?? existingJob.salaryMin ?? undefined,
        salaryMax: salaryMax ?? existingJob.salaryMax ?? undefined,
        salaryType: salaryType || existingJob.salaryType || undefined,
        city: city || existingJob.city,
        state: state || existingJob.state,
        industryId: industryId || existingJob.industryId,
        companyId: user.company.id,
      });

      console.log('🤖 AI Verification Complete:', {
        riskScore: verificationResult.riskScore,
        autoApprove: verificationResult.autoApprove,
        flags: verificationResult.flags,
      });

      // Determine new approval status based on AI result
      if (verificationResult.autoApprove) {
        approvalStatus = 'APPROVED';
        rejectionReason = null;
        isActive = true;
        approvedAt = new Date();
        rejectedAt = null;
        console.log('✅ Edited job auto-approved by AI');
      } else if (verificationResult.riskScore > 70) {
        // Still high risk - keep as REJECTED_AI
        approvalStatus = 'REJECTED_AI';
        rejectionReason = `Auto-rejected by AI verification (Risk Score: ${verificationResult.riskScore}/100):\n\n${verificationResult.flagReason}`;
        isActive = false;
        approvedAt = null;
        rejectedAt = new Date();
        console.log('❌ Edited job still rejected by AI (high risk)');
      } else {
        // Flag for human review
        approvalStatus = 'PENDING';
        rejectionReason = null;
        isActive = false;
        approvedAt = null;
        rejectedAt = null;
        console.log('⚠️ Edited job flagged for human review');
      }
    }

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: parseInt(jobId) },
      data: {
        title: title?.trim(),
        description: description?.trim(),
        requirements: requirements?.trim(),
        benefits: benefits?.trim(),
        industryId,
        jobType,
        workingHours,
        experienceLevel,
        skills,
        city: city?.trim(),
        state,
        postcode: postcode?.trim(),
        address: address?.trim(),
        isRemote,
        salaryMin,
        salaryMax,
        salaryType,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        updatedBy: userId,
        // ✅ Update approval status if AI verification was run
        ...(needsAIVerification && {
          approvalStatus,
          rejectionReason,
          isActive,
          approvedAt,
          rejectedAt,
        }),
      },
      include: {
        industry: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    // ✅ SEND NOTIFICATIONS BASED ON NEW STATUS
    if (needsAIVerification) {
      if (approvalStatus === 'APPROVED') {
        // Notify employer
        await prisma.notification.create({
          data: {
            userId,
            title: 'Job Post Approved!',
            message: `Great news! Your edited job post "${updatedJob.title}" has been approved by our automated review and is now live.`,
            message_en: `Great news! Your edited job post "${updatedJob.title}" has been approved by our automated review and is now live.`,
            type: NotificationType.SYSTEM_UPDATE,
            actionUrl: `/(employer-hidden)/job-post-details/${updatedJob.id}`,
          },
        });

        // Find matching job seekers and notify them
        const matchingUsers = await prisma.user.findMany({
          where: {
            role: UserRole.JOB_SEEKER,
            isActive: true,
            profile: {
              industries: {
                some: {
                  industryId: updatedJob.industryId,
                },
              },
            },
          },
          take: 50,
        });

        for (const matchUser of matchingUsers) {
          await sendJobMatchNotification(
            matchUser.id,
            updatedJob.title,
            updatedJob.company.name,
            updatedJob.slug
          );
        }

        console.log(
          `✅ Job approved and notifications sent to ${matchingUsers.length} matching users`
        );
      } else if (approvalStatus === 'REJECTED_AI') {
        // Notify employer - still rejected (with translations)
        const notifMsg = `Your edited job post "${updatedJob.title}" was reviewed again but still requires modifications. Please review the feedback and make further changes.`;
        const n_ms = await translateText(notifMsg, 'ms');
        const n_ta = await translateText(notifMsg, 'ta');
        const n_zh = await translateText(notifMsg, 'zh');
        await prisma.notification.create({
          data: {
            userId,
            title: 'Job Post Still Needs Changes',
            message: notifMsg,
            message_en: notifMsg,
            message_ms: n_ms ?? undefined,
            message_ta: n_ta ?? undefined,
            message_zh: n_zh ?? undefined,
            type: NotificationType.SYSTEM_UPDATE,
            actionUrl: `/(employer-hidden)/job-post-details/${updatedJob.id}`,
          },
        });
        console.log('❌ Job still rejected, employer notified');
      } else if (approvalStatus === 'PENDING') {
        // Notify employer - pending human review (with translations)
        const notifMsg = `Your edited job post "${updatedJob.title}" is being reviewed by our team. You'll be notified once it's approved.`;
        const n_ms = await translateText(notifMsg, 'ms');
        const n_ta = await translateText(notifMsg, 'ta');
        const n_zh = await translateText(notifMsg, 'zh');
        await prisma.notification.create({
          data: {
            userId,
            title: 'Job Post Under Review',
            message: notifMsg,
            message_en: notifMsg,
            message_ms: n_ms ?? undefined,
            message_ta: n_ta ?? undefined,
            message_zh: n_zh ?? undefined,
            type: 'SYSTEM_UPDATE',
            actionUrl: `/(employer-hidden)/job-post-details/${updatedJob.id}`,
          },
        });
        console.log('⚠️ Job pending human review, employer notified');
      }
    }

    // Trigger translation only if approved
    if (approvalStatus === 'APPROVED' && translateJobs) {
      await translateJobs().catch((err) =>
        console.error('Translation error:', err)
      );
    }

    // ✅ BUILD RESPONSE MESSAGE
    let message = 'Job updated successfully';
    if (needsAIVerification) {
      if (approvalStatus === 'APPROVED') {
        message = 'Job updated and approved! Your job post is now live.';
      } else if (approvalStatus === 'REJECTED_AI') {
        message =
          'Job updated but still rejected by AI. Please review the feedback and make further changes.';
      } else if (approvalStatus === 'PENDING') {
        message = 'Job updated and is now pending human review.';
      }
    }

    return res.status(200).json({
      success: true,
      message,
      data: {
        ...updatedJob,
        // ✅ Include AI verification info if it was run
        ...(needsAIVerification &&
          verificationResult && {
            aiVerification: {
              riskScore: verificationResult.riskScore,
              flags: verificationResult.flags,
              autoApproved: verificationResult.autoApprove,
              summary:
                AIJobVerificationService.generateVerificationSummary(
                  verificationResult
                ),
              canAppeal: approvalStatus === 'REJECTED_AI',
            },
          }),
      },
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Failed to update job',
    });
  }
};

// ===================================================================
// GET: Single Job Detail (for editing)
// ===================================================================
export const getJobById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { jobId } = req.params;
    const { lang = 'en' } = req.query;
    const currentLang = (lang as SupportedLang) || 'en';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
      include: {
        industry: {
          select: {
            id: true,
            name: true,
            name_en: true,
            name_ms: true,
            name_ta: true,
            name_zh: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            city: true,
            state: true,
            companySize: true,
            name_ms: true,
            name_ta: true,
            name_zh: true,
            description: true,
            description_ms: true,
            description_ta: true,
            description_zh: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Verify ownership
    if (job.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this job',
      });
    }

    // Generate signed URL for company logo
    if (job.company?.logo) {
      try {
        const signedLogoUrl = await getSignedDownloadUrl(
          job.company.logo,
          3600
        );
        job.company.logo = signedLogoUrl;
      } catch (error) {
        console.error('Error generating signed URL for company logo:', error);
        job.company.logo = null;
      }
    }

    const jobData = job as unknown as JobWithDetails;

    const translatedJob = {
      ...jobData,
      title: jobData[`title_${currentLang}`] || jobData.title,
      description: jobData[`description_${currentLang}`] || jobData.description,
      requirements:
        jobData[`requirements_${currentLang}`] || jobData.requirements,
      benefits: jobData[`benefits_${currentLang}`] || jobData.benefits,

      jobTypeLabel: labelEnum('JobType', jobData.jobType, currentLang),
      workingHoursLabel: labelEnum(
        'WorkingHours',
        jobData.workingHours,
        currentLang
      ),
      experienceLevelLabel: labelEnum(
        'ExperienceLevel',
        jobData.experienceLevel,
        currentLang
      ),
      salaryTypeLabel: labelEnum('SalaryType', jobData.salaryType, currentLang),

      company: {
        id: jobData.company.id,
        city: jobData.company.city,
        state: jobData.company.state,
        logo: jobData.company.logo,
        companySize: jobData.company.companySize,
        companySizeLabel: labelEnum(
          'CompanySize',
          jobData.company.companySize,
          currentLang
        ),
        name: jobData.company[`name_${currentLang}`] || jobData.company.name,
        description:
          jobData.company[`description_${currentLang}`] ||
          jobData.company.description,
      },

      industry: {
        id: jobData.industry.id,
        name: jobData.industry[`name_${currentLang}`] || jobData.industry.name,
      },
    };

    return res.status(200).json({
      success: true,
      data: translatedJob,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Failed to fetch job details',
    });
  }
};

// ===================================================================
// DELETE: Delete Job Post
// ===================================================================
export const deleteJob = async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user || !user.company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Get the job and verify ownership
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (job.companyId !== user.company.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this job',
      });
    }

    // Delete the job (cascade will handle related records)
    await prisma.job.delete({
      where: { id: parseInt(jobId) },
    });

    return res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Internal server error',
    });
  }
};

export const approveJob = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminEmail = req.adminEmail; // ✅ Use AdminAuthRequest field

    if (!adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Admin email not found',
      });
    }

    // ✅ Verify job exists and get current status
    const existingJob = await prisma.job.findUnique({
      where: { id: parseInt(id) },
      select: { approvalStatus: true },
    });

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // ✅ Check if job is in a valid state to be approved
    if (existingJob.approvalStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Job is already approved',
      });
    }

    // ✅ Update job to approved status
    const job = await prisma.job.update({
      where: { id: parseInt(id) },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        isActive: true,
        rejectionReason: null, // Clear any previous rejection reason
      },
      include: {
        company: {
          include: { user: true },
        },
        industry: true,
      },
    });

    // ✅ Log admin action
    await prisma.adminAction.create({
      data: {
        adminEmail,
        actionType: 'APPROVE_COMPANY', // Note: Might want to add 'APPROVE_JOB' to enum
        targetType: 'JOB',
        targetId: job.id,
        notes: `Job "${job.title}" approved`,
      },
    });

    // ✅ Send notification to employer
    if (job.company?.user) {
      await sendJobApprovedNotification(job.company.user.id, job.title, job.id);
    }

    // ✅ Find matching job seekers and notify them
    const matchingUsers = await findMatchingJobSeekers(job);
    for (const user of matchingUsers) {
      await sendJobMatchNotification(
        user.id,
        job.title,
        job.company.name,
        job.slug
      );
    }

    console.log(`✅ Job #${job.id} approved by admin: ${adminEmail}`);
    console.log(`📧 Notified ${matchingUsers.length} matching job seekers`);

    return res.status(200).json({
      success: true,
      message: 'Job approved successfully',
      data: {
        id: job.id,
        title: job.title,
        approvalStatus: job.approvalStatus,
        approvedAt: job.approvedAt,
        isActive: job.isActive,
        notifiedUsers: matchingUsers.length,
      },
    });
  } catch (error) {
    console.error('❌ Error approving job:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Failed to approve job',
    });
  }
};

/**
 * ✅ Admin rejects a job post
 * PUT /api/admin/jobs/:id/reject
 */
export const rejectJob = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminEmail = req.adminEmail; // ✅ Use AdminAuthRequest field

    if (!adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Admin email not found',
      });
    }

    // ✅ Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required (minimum 10 characters)',
      });
    }

    // ✅ Verify job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: parseInt(id) },
      select: { approvalStatus: true, title: true },
    });

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // ✅ Check if job is already in final rejection state
    if (existingJob.approvalStatus === 'REJECTED_FINAL') {
      return res.status(400).json({
        success: false,
        message: 'Job is already in final rejection state',
      });
    }

    // ✅ Update job to rejected status
    const job = await prisma.job.update({
      where: { id: parseInt(id) },
      data: {
        approvalStatus: 'REJECTED_FINAL',
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
        isActive: false,
      },
      include: {
        company: {
          include: { user: true },
        },
      },
    });

    // ✅ Log admin action
    const rejReason = rejectionReason.trim();
    const rr_ms = await translateText(rejReason, 'ms');
    const rr_ta = await translateText(rejReason, 'ta');
    const rr_zh = await translateText(rejReason, 'zh');
    await prisma.adminAction.create({
      data: {
        adminEmail,
        actionType: 'REJECT_COMPANY', // Note: Might want to add 'REJECT_JOB' to enum
        targetType: 'JOB',
        targetId: job.id,
        reason: rejReason,
        reason_en: rejReason,
        reason_ms: rr_ms ?? undefined,
        reason_ta: rr_ta ?? undefined,
        reason_zh: rr_zh ?? undefined,
        notes: `Job "${job.title}" rejected`,
      },
    });

    // ✅ Send notification to employer
    if (job.company?.user) {
      await sendJobRejectedNotification(
        job.company.user.id,
        job.title,
        rejectionReason,
        job.id
      );
    }

    console.log(`❌ Job #${job.id} rejected by admin: ${adminEmail}`);
    console.log(`📧 Employer notified of rejection`);

    return res.status(200).json({
      success: true,
      message: 'Job rejected successfully',
      data: {
        id: job.id,
        title: job.title,
        approvalStatus: job.approvalStatus,
        rejectedAt: job.rejectedAt,
        rejectionReason: job.rejectionReason,
        isActive: job.isActive,
      },
    });
  } catch (error) {
    console.error('❌ Error rejecting job:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Failed to reject job',
    });
  }
};

/**
 * Get recruitment time prediction
 * POST /api/jobs/predict-recruitment-time
 */
export const predictRecruitmentTime = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      industryId,
      state,
      city,
      jobType,
      experienceLevel,
      salaryMin,
      salaryMax,
      skills,
    } = req.body;

    // Validate required fields
    if (!industryId || !state || !city || !jobType || !experienceLevel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for prediction',
      });
    }

    const prediction =
      await RecruitmentPredictionService.predictRecruitmentTime({
        industryId,
        state,
        city,
        jobType,
        experienceLevel,
        salaryMin,
        salaryMax,
        skills,
      });

    return res.status(200).json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Error predicting recruitment time:', error);
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error) || 'Failed to predict recruitment time',
    });
  }
};

// Helper function to find matching job seekers
const findMatchingJobSeekers = async (job: { industryId: number }) => {
  const users = await prisma.user.findMany({
    where: {
      role: UserRole.JOB_SEEKER,
      isActive: true,
      profile: {
        industries: {
          some: {
            industryId: job.industryId,
          },
        },
      },
    },
    take: 50, // Limit to prevent spam
  });

  return users;
};

// After generating signed logo, return with enum labels for UI
