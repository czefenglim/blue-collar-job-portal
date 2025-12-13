import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateAIResponse, TOOLS } from '../services/aiAssistantService';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export const handleChat = async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const userId = req.user?.userId;
    // Assume role is fetched or passed. ideally we get it from user profile if not in token
    // For now, let's fetch user role from DB to be safe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. First call to AI
    let aiResponse = await generateAIResponse(userId, user.role, message);

    // 2. Check if AI wants to use a tool
    if (aiResponse.tool) {
      console.log(`Executing tool: ${aiResponse.tool}`);
      const toolResult = await executeTool(
        userId,
        user.role,
        aiResponse.tool,
        aiResponse.params
      );

      // 3. Feed result back to AI
      aiResponse = await generateAIResponse(userId, user.role, message, {
        tool: aiResponse.tool,
        result: toolResult,
      });
    }

    // Normalize response for frontend
    // The AI service returns { response: string, actions: [] }
    // The frontend expects { text: string, buttons: [] }
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
  params: any
) {
  try {
    switch (toolName) {
      case TOOLS.SEARCH_JOBS:
        const where: any = { isActive: true, approvalStatus: 'APPROVED' };
        if (params.keyword) {
          where.OR = [
            { title: { contains: params.keyword, mode: 'insensitive' } },
            {
              company: {
                name: { contains: params.keyword, mode: 'insensitive' },
              },
            },
          ];
        }
        if (params.location) {
          where.OR = [
            ...(where.OR || []),
            { city: { contains: params.location, mode: 'insensitive' } },
            { state: { contains: params.location, mode: 'insensitive' } },
          ];
        }
        if (params.jobType) where.jobType = params.jobType;

        const jobs = await prisma.job.findMany({
          where,
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

      case TOOLS.GET_MY_APPLICATIONS:
        if (role !== 'JOB_SEEKER')
          return 'Error: Only job seekers can view applications.';

        const appWhere: any = { userId };
        if (params.status) appWhere.status = params.status;
        if (params.keyword) {
          appWhere.job = {
            OR: [
              { title: { contains: params.keyword, mode: 'insensitive' } },
              {
                company: {
                  name: { contains: params.keyword, mode: 'insensitive' },
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
        return apps.map((a) => ({
          id: a.id,
          job: a.job.title,
          slug: a.job.slug,
          company: a.job.company.name,
          status: a.status,
        }));

      case TOOLS.GET_SAVED_JOBS:
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
        return saved.map((s) => ({
          id: s.id,
          job: s.job.title,
          company: s.job.company.name,
          slug: s.job.slug,
        }));

      case TOOLS.GET_EMPLOYER_JOBS:
        if (role !== 'EMPLOYER')
          return 'Error: Only employers can view posted jobs.';
        // Need to find company first
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

      case TOOLS.GET_JOB_APPLICATIONS:
        if (role !== 'EMPLOYER')
          return 'Error: Only employers can view applicants.';
        if (!params.jobId) return 'Error: Job ID is required.';

        // Verify ownership
        const job = await prisma.job.findFirst({
          where: { id: params.jobId, company: { userId } },
        });
        if (!job) return 'Error: Job not found or access denied.';

        const applicants = await prisma.jobApplication.findMany({
          where: {
            jobId: params.jobId,
            ...(params.status ? { status: params.status } : {}),
          },
          take: 5,
          include: { user: { select: { fullName: true } } },
        });
        return applicants.map((a) => ({
          id: a.id,
          name: a.user.fullName,
          status: a.status,
        }));

      default:
        return 'Error: Unknown tool.';
    }
  } catch (error: any) {
    console.error('Tool Execution Error:', error);
    return `Error executing tool: ${error.message}`;
  }
}

