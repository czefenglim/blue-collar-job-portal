import { Request, Response } from 'express';
import {
  PrismaClient,
  ApplicationStatus,
  ApprovalStatus,
  Prisma,
  JobType,
} from '@prisma/client';
import { generateAIResponse, TOOLS } from '../services/aiAssistantService';
import { AIAction } from '../types/ai';
import {
  JobApplication,
  JobApplicationWithDetails,
} from '../types/application';
import { AuthRequest } from '../types/common';

const prisma = new PrismaClient();



export const handleChat = async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let aiResponse = await generateAIResponse(userId, user.role, message);

    if (aiResponse.tool) {
      const toolResult = await executeTool(
        userId,
        user.role,
        aiResponse.tool,
        aiResponse.params
      );

      aiResponse = await generateAIResponse(userId, user.role, message, {
        tool: aiResponse.tool,
        result: toolResult,
      });
    }

    const normalizedResponse = {
      text:
        aiResponse.response ||
        aiResponse.text ||
        "I'm sorry, I couldn't generate a response.",
      buttons: (aiResponse.actions || []).map((action: any) => ({
        label: action.label,
        action: action.route,
        params: action.params,
      })),
    };

    return res.json({ success: true, data: normalizedResponse });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'AI processing failed',
      error: error.message,
    });
  }
};

async function executeTool(
  userId: number,
  role: string,
  toolName: string,
  params: Record<string, unknown>
) {
  try {
    switch (toolName) {
      case TOOLS.SEARCH_JOBS: {
        const where: Prisma.JobWhereInput = {
          isActive: true,
          approvalStatus: ApprovalStatus.APPROVED,
        };
        if (typeof params.keyword === 'string' && params.keyword.length > 0) {
          where.OR = [
            { title: { contains: params.keyword } },
            {
              company: {
                name: { contains: params.keyword },
              },
            },
          ];
        }
        if (typeof params.location === 'string' && params.location.length > 0) {
          where.OR = [
            ...(where.OR || []),
            { city: { contains: params.location } },
            { state: { contains: params.location } },
          ];
        }
        if (typeof params.jobType === 'string' && params.jobType.length > 0) {
          where.jobType = params.jobType as JobType;
        }

        const jobs = await prisma.job.findMany({
          where: where as any,
          take: 5,
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
            slug: true,
            city: true,
          },
        });
        return jobs;
      }

      case TOOLS.GET_MY_APPLICATIONS: {
        if (role !== 'JOB_SEEKER')
          return 'Error: Only job seekers can view applications.';

        const appWhere: Prisma.JobApplicationWhereInput = { userId };
        if (typeof params.status === 'string' && params.status.length > 0) {
          appWhere.status = params.status as unknown as ApplicationStatus;
        }
        if (typeof params.keyword === 'string' && params.keyword.length > 0) {
          const keyword = params.keyword as string;
          appWhere.job = {
            OR: [
              { title: { contains: keyword } },
              {
                company: {
                  name: { contains: keyword },
                },
              },
            ],
          };
        }

        const apps = await prisma.jobApplication.findMany({
          where: appWhere,
          take: 5,
          include: {
            job: {
              select: {
                title: true,
                company: { select: { name: true } },
                slug: true,
              },
            },
          },
        });
        return apps.map(
          (a: {
            id: number;
            status: ApplicationStatus;
            job: { title: string; slug: string; company: { name: string } };
          }) => ({
            id: a.id,
            job: a.job.title,
            slug: a.job.slug,
            company: a.job.company.name,
            status: a.status,
          })
        );
      }

      case TOOLS.GET_SAVED_JOBS: {
        if (role !== 'JOB_SEEKER')
          return 'Error: Only job seekers can save jobs.';
        const saved = await prisma.savedJob.findMany({
          where: { userId },
          take: 5,
          include: {
            job: {
              select: {
                title: true,
                slug: true,
                company: { select: { name: true } },
              },
            },
          },
        });
        return saved.map(
          (s: {
            id: number;
            job: { title: string; slug: string; company: { name: string } };
          }) => ({
            id: s.id,
            job: s.job.title,
            company: s.job.company.name,
            slug: s.job.slug,
          })
        );
      }

      case TOOLS.GET_EMPLOYER_JOBS: {
        if (role !== 'EMPLOYER')
          return 'Error: Only employers can view posted jobs.';
        const company = await prisma.company.findUnique({ where: { userId } });
        if (!company) return 'Error: No company profile found.';

        const postedJobs = await prisma.job.findMany({
          where: {
            companyId: company.id,
            ...(params.status ? { isActive: params.status === 'active' } : {}),
          },
          take: 5,
          select: {
            id: true,
            title: true,
            applicationCount: true,
            isActive: true,
          },
        });
        return postedJobs;
      }

      case TOOLS.GET_JOB_APPLICATIONS: {
        if (role !== 'EMPLOYER')
          return 'Error: Only employers can view applicants.';
        if (!params.jobId) return 'Error: Job ID is required.';

        const jobId = parseInt(params.jobId as string);
        if (isNaN(jobId)) return 'Error: Invalid Job ID.';

        const job = await prisma.job.findFirst({
          where: { id: jobId, company: { userId } },
        });
        if (!job) return 'Error: Job not found or access denied.';

        const applicants = await prisma.jobApplication.findMany({
          where: {
            jobId: jobId,
            ...(params.status && typeof params.status === 'string'
              ? { status: params.status as ApplicationStatus }
              : {}),
          },
          take: 5,
          include: { user: { select: { fullName: true } } },
        });
        return applicants.map(
          (a: {
            id: number;
            status: ApplicationStatus;
            user: { fullName: string };
          }) => ({
            id: a.id,
            name: a.user.fullName,
            status: a.status,
          })
        );
      }

      default:
        return 'Error: Unknown tool.';
    }
  } catch (error) {
    console.error('Tool Execution Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown tool error';
    return `Error executing tool: ${errorMessage}`;
  }
}
