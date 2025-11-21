// src/services/recruitmentPredictionts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PredictionInput {
  industryId: number;
  state: string;
  city: string;
  jobType: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: number[];
}

interface PredictionResult {
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: {
    industry: string;
    location: string;
    salary: string;
    demand: string;
  };
  tips: string[];
  similarJobsCount: number;
}

export class RecruitmentPredictionService {
  /**
   * Predict recruitment time based on job parameters and historical data
   */
  static async predictRecruitmentTime(
    input: PredictionInput
  ): Promise<PredictionResult> {
    // Base prediction values (in days)
    let baseMin = 5;
    let baseMax = 10;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    const factors = {
      industry: 'neutral',
      location: 'neutral',
      salary: 'neutral',
      demand: 'neutral',
    };

    const tips: string[] = [];

    try {
      // 1. Get historical data for similar jobs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

      const similarJobs = await prisma.job.findMany({
        where: {
          industryId: input.industryId,
          state: input.state,
          approvalStatus: 'APPROVED',
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        include: {
          applications: {
            where: {
              status: 'HIRED',
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

      // 2. Calculate average time to hire from historical data
      if (similarJobs.length >= 5) {
        const jobsWithHires = similarJobs.filter(
          (job) => job.applications.length > 0
        );

        if (jobsWithHires.length > 0) {
          const avgDaysToHire =
            jobsWithHires.reduce((sum, job) => {
              const hiredApp = job.applications[0];
              if (hiredApp) {
                const days = Math.ceil(
                  (hiredApp.updatedAt.getTime() - job.createdAt.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return sum + days;
              }
              return sum;
            }, 0) / jobsWithHires.length;

          baseMin = Math.max(2, Math.floor(avgDaysToHire * 0.7));
          baseMax = Math.ceil(avgDaysToHire * 1.3);
          confidence = 'HIGH';
        }
      }

      // 3. Industry-based adjustments
      const industryAdjustments: Record<
        string,
        { modifier: number; speed: string }
      > = {
        Construction: { modifier: 0.8, speed: 'faster' },
        Manufacturing: { modifier: 0.85, speed: 'faster' },
        'Food & Beverage': { modifier: 0.75, speed: 'faster' },
        Retail: { modifier: 0.9, speed: 'faster' },
        'Cleaning Services': { modifier: 0.7, speed: 'faster' },
        Security: { modifier: 0.85, speed: 'faster' },
        'Logistics & Delivery': { modifier: 0.8, speed: 'faster' },
        Healthcare: { modifier: 1.2, speed: 'slower' },
        'IT & Technology': { modifier: 1.3, speed: 'slower' },
        Education: { modifier: 1.25, speed: 'slower' },
      };

      const industry = await prisma.industry.findUnique({
        where: { id: input.industryId },
      });

      if (industry && industryAdjustments[industry.name]) {
        const adj = industryAdjustments[industry.name];
        baseMin = Math.round(baseMin * adj.modifier);
        baseMax = Math.round(baseMax * adj.modifier);
        factors.industry = adj.speed;

        if (adj.speed === 'faster') {
          tips.push(`${industry.name} jobs typically fill quickly in Malaysia`);
        } else {
          tips.push(
            `${industry.name} jobs may take longer to fill - consider expanding requirements`
          );
        }
      }

      // 4. Location-based adjustments
      const highDemandStates = ['Selangor', 'Kuala Lumpur', 'Penang', 'Johor'];
      const lowDemandStates = ['Perlis', 'Kelantan', 'Terengganu', 'Pahang'];

      if (highDemandStates.includes(input.state)) {
        baseMin = Math.round(baseMin * 0.85);
        baseMax = Math.round(baseMax * 0.9);
        factors.location = 'high demand area';
        tips.push(`${input.state} has high job seeker activity`);
      } else if (lowDemandStates.includes(input.state)) {
        baseMin = Math.round(baseMin * 1.2);
        baseMax = Math.round(baseMax * 1.3);
        factors.location = 'lower demand area';
        tips.push(
          `Consider offering transport allowance to attract candidates from nearby areas`
        );
      }

      // 5. Salary competitiveness check
      if (input.salaryMin && input.salaryMax) {
        const avgSalary = (input.salaryMin + input.salaryMax) / 2;

        // Get average salary for similar jobs
        const salaryData = await prisma.job.aggregate({
          where: {
            industryId: input.industryId,
            state: input.state,
            approvalStatus: 'APPROVED',
            salaryMin: { not: null },
            salaryMax: { not: null },
          },
          _avg: {
            salaryMin: true,
            salaryMax: true,
          },
        });

        if (salaryData._avg.salaryMin && salaryData._avg.salaryMax) {
          const marketAvg =
            (salaryData._avg.salaryMin + salaryData._avg.salaryMax) / 2;

          if (avgSalary >= marketAvg * 1.15) {
            baseMin = Math.round(baseMin * 0.8);
            baseMax = Math.round(baseMax * 0.85);
            factors.salary = 'above market';
            tips.push('Your salary is competitive - expect good response');
          } else if (avgSalary <= marketAvg * 0.85) {
            baseMin = Math.round(baseMin * 1.3);
            baseMax = Math.round(baseMax * 1.4);
            factors.salary = 'below market';
            tips.push(
              `Consider increasing salary to RM ${Math.round(
                marketAvg
              )} for faster hiring`
            );
          } else {
            factors.salary = 'market rate';
          }
        }
      }

      // 6. Experience level adjustments
      const experienceModifiers: Record<string, number> = {
        ENTRY_LEVEL: 0.8,
        JUNIOR: 0.9,
        MID_LEVEL: 1.0,
        SENIOR: 1.3,
        EXPERT: 1.5,
      };

      if (experienceModifiers[input.experienceLevel]) {
        const modifier = experienceModifiers[input.experienceLevel];
        baseMin = Math.round(baseMin * modifier);
        baseMax = Math.round(baseMax * modifier);

        if (modifier > 1.2) {
          tips.push(
            'Senior positions take longer - consider using Featured listing'
          );
        }
      }

      // 7. Job type adjustments
      if (input.jobType === 'PART_TIME' || input.jobType === 'FREELANCE') {
        baseMin = Math.round(baseMin * 0.7);
        baseMax = Math.round(baseMax * 0.8);
        tips.push('Part-time and freelance positions typically fill faster');
      }

      // 8. Check current demand (active job seekers)
      const activeJobSeekers = await prisma.user.count({
        where: {
          role: 'JOB_SEEKER',
          isActive: true,
          profile: {
            industries: {
              some: {
                industryId: input.industryId,
              },
            },
          },
        },
      });

      if (activeJobSeekers > 100) {
        factors.demand = 'high';
        baseMin = Math.max(2, baseMin - 1);
        baseMax = Math.max(3, baseMax - 2);
      } else if (activeJobSeekers < 20) {
        factors.demand = 'low';
        baseMin = baseMin + 2;
        baseMax = baseMax + 3;
        tips.push(
          'Limited candidates in this category - consider broadening requirements'
        );
      }

      // Ensure minimum values
      baseMin = Math.max(2, baseMin);
      baseMax = Math.max(baseMin + 2, baseMax);

      // Set confidence based on data availability
      if (similarJobs.length < 3) {
        confidence = 'LOW';
      } else if (similarJobs.length >= 10) {
        confidence = 'HIGH';
      }

      return {
        estimatedDaysMin: baseMin,
        estimatedDaysMax: baseMax,
        confidence,
        factors,
        tips: tips.slice(0, 3), // Max 3 tips
        similarJobsCount: similarJobs.length,
      };
    } catch (error) {
      console.error('Error predicting recruitment time:', error);

      // Return default prediction on error
      return {
        estimatedDaysMin: 5,
        estimatedDaysMax: 10,
        confidence: 'LOW',
        factors: {
          industry: 'unknown',
          location: 'unknown',
          salary: 'unknown',
          demand: 'unknown',
        },
        tips: ['Post your job to start receiving applications'],
        similarJobsCount: 0,
      };
    }
  }
}
