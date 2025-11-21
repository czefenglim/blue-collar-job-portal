import { Request, Response } from 'express';
import { ApplicantQualityService } from '../services/applicantQualityService';
import { SalaryCompetitivenessService } from '../services/salaryCompetitivenessService';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

/**
 * Get quality score for a specific application
 * GET /api/employer/applicants/:id/quality-score
 */
export const getApplicantQualityScore = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const applicationId = parseInt(req.params.id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID',
      });
    }

    const qualityScore = await ApplicantQualityService.calculateQualityScore(
      applicationId
    );

    return res.status(200).json({
      success: true,
      data: qualityScore,
    });
  } catch (error: any) {
    console.error('Error calculating quality score:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate quality score',
    });
  }
};

/**
 * Get quality scores for all applicants of a job
 * GET /api/employer/jobs/:jobId/applicant-scores
 */
export const getJobApplicantScores = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID',
      });
    }

    const scores = await ApplicantQualityService.getQualityScoresForJob(jobId);

    // Convert Map to object for JSON response
    const scoresObject: Record<number, any> = {};
    scores.forEach((value, key) => {
      scoresObject[key] = value;
    });

    return res.status(200).json({
      success: true,
      data: scoresObject,
    });
  } catch (error: any) {
    console.error('Error getting applicant scores:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get applicant scores',
    });
  }
};

/**
 * Analyze salary competitiveness
 * POST /api/jobs/analyze-salary
 */
export const analyzeSalaryCompetitiveness = async (
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
      experienceLevel,
      salaryMin,
      salaryMax,
      jobType,
    } = req.body;

    // Validate required fields
    if (!industryId || !state || !experienceLevel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: industryId, state, experienceLevel',
      });
    }

    const analysis = await SalaryCompetitivenessService.analyzeSalary({
      industryId,
      state,
      experienceLevel,
      salaryMin,
      salaryMax,
      jobType,
    });

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('Error analyzing salary:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze salary',
    });
  }
};
