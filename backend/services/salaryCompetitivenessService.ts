import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SalaryAnalysis {
  competitiveness: 'EXCELLENT' | 'COMPETITIVE' | 'BELOW_AVERAGE' | 'LOW';
  percentile: number; // 0-100
  industryAverage: {
    min: number;
    max: number;
    median: number;
  };
  stateAverage: {
    min: number;
    max: number;
    median: number;
  };
  comparison: {
    vsIndustry: number; // percentage difference
    vsState: number;
    vsOverall: number;
  };
  recommendation: string;
  warnings: string[];
  tips: string[];
  dataSource: {
    industryJobsCount: number;
    stateJobsCount: number;
    totalJobsAnalyzed: number;
  };
}

// Helper function to calculate statistics from salary data
function calculateSalaryStats(
  jobs: { salaryMin: number | null; salaryMax: number | null }[]
): {
  min: number;
  max: number;
  median: number;
  count: number;
} {
  const validJobs = jobs.filter(
    (j) => j.salaryMin !== null && j.salaryMax !== null
  );

  if (validJobs.length === 0) {
    return { min: 0, max: 0, median: 0, count: 0 };
  }

  const mins = validJobs.map((j) => j.salaryMin!).sort((a, b) => a - b);
  const maxes = validJobs.map((j) => j.salaryMax!).sort((a, b) => a - b);
  const averages = validJobs
    .map((j) => (j.salaryMin! + j.salaryMax!) / 2)
    .sort((a, b) => a - b);

  const medianIndex = Math.floor(averages.length / 2);
  const median =
    averages.length % 2 === 0
      ? (averages[medianIndex - 1] + averages[medianIndex]) / 2
      : averages[medianIndex];

  return {
    min: Math.round(mins.reduce((sum, v) => sum + v, 0) / mins.length),
    max: Math.round(maxes.reduce((sum, v) => sum + v, 0) / maxes.length),
    median: Math.round(median),
    count: validJobs.length,
  };
}

export class SalaryCompetitivenessService {
  /**
   * Analyze salary competitiveness for a job posting based on database data
   */
  static async analyzeSalary(params: {
    industryId: number;
    state: string;
    experienceLevel: string;
    salaryMin?: number;
    salaryMax?: number;
    jobType?: string;
  }): Promise<SalaryAnalysis> {
    const {
      industryId,
      state,
      experienceLevel,
      salaryMin,
      salaryMax,
      jobType,
    } = params;

    // Get jobs from same industry (approved jobs with salary data)
    const industryJobs = await prisma.job.findMany({
      where: {
        industryId,
        approvalStatus: 'APPROVED',
        salaryMin: { not: null },
        salaryMax: { not: null },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
      },
    });

    // Get jobs from same state (approved jobs with salary data)
    const stateJobs = await prisma.job.findMany({
      where: {
        state,
        approvalStatus: 'APPROVED',
        salaryMin: { not: null },
        salaryMax: { not: null },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
      },
    });

    // Get jobs matching both industry and state (most relevant comparison)
    const exactMatchJobs = await prisma.job.findMany({
      where: {
        industryId,
        state,
        approvalStatus: 'APPROVED',
        salaryMin: { not: null },
        salaryMax: { not: null },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
      },
    });

    // Get jobs with same experience level in the state
    const experienceMatchJobs = await prisma.job.findMany({
      where: {
        state,
        experienceLevel: experienceLevel as any,
        approvalStatus: 'APPROVED',
        salaryMin: { not: null },
        salaryMax: { not: null },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
      },
    });

    // Calculate statistics
    const industryStats = calculateSalaryStats(industryJobs);
    const stateStats = calculateSalaryStats(stateJobs);
    const exactMatchStats = calculateSalaryStats(exactMatchJobs);
    const experienceStats = calculateSalaryStats(experienceMatchJobs);

    // Use the most relevant data available
    // Priority: exact match > experience match in state > state > industry
    let primaryStats = exactMatchStats;
    let dataSourceDescription = 'exact match (industry + state)';

    if (exactMatchStats.count < 3) {
      if (experienceStats.count >= 3) {
        primaryStats = experienceStats;
        dataSourceDescription = 'experience level match in state';
      } else if (stateStats.count >= 3) {
        primaryStats = stateStats;
        dataSourceDescription = 'state average';
      } else if (industryStats.count >= 3) {
        primaryStats = industryStats;
        dataSourceDescription = 'industry average';
      }
    }

    // Fallback if no data available
    if (primaryStats.count === 0) {
      // Get all approved jobs as last resort
      const allJobs = await prisma.job.findMany({
        where: {
          approvalStatus: 'APPROVED',
          salaryMin: { not: null },
          salaryMax: { not: null },
        },
        select: {
          salaryMin: true,
          salaryMax: true,
        },
        take: 100,
      });

      primaryStats = calculateSalaryStats(allJobs);
      dataSourceDescription = 'all jobs (limited data)';

      // If still no data, use minimum wage as baseline
      if (primaryStats.count === 0) {
        primaryStats = {
          min: 1500,
          max: 3000,
          median: 2000,
          count: 0,
        };
        dataSourceDescription = 'default baseline (no job data available)';
      }
    }

    // Calculate industry average (use industry stats or primary if not enough)
    const industryAverage =
      industryStats.count >= 3
        ? {
            min: industryStats.min,
            max: industryStats.max,
            median: industryStats.median,
          }
        : {
            min: primaryStats.min,
            max: primaryStats.max,
            median: primaryStats.median,
          };

    // Calculate state average (use exact match or state stats)
    const stateAverage = {
      min: primaryStats.min,
      max: primaryStats.max,
      median: primaryStats.median,
    };

    // Calculate offered salary average
    const offeredMin = salaryMin || 0;
    const offeredMax = salaryMax || offeredMin;
    const offeredAvg = (offeredMin + offeredMax) / 2;

    // Calculate comparisons
    const vsIndustry =
      industryAverage.median > 0
        ? ((offeredAvg - industryAverage.median) / industryAverage.median) * 100
        : 0;

    const vsState =
      stateAverage.median > 0
        ? ((offeredAvg - stateAverage.median) / stateAverage.median) * 100
        : 0;

    const overallMedian = (industryAverage.median + stateAverage.median) / 2;
    const vsOverall =
      overallMedian > 0
        ? ((offeredAvg - overallMedian) / overallMedian) * 100
        : 0;

    // Calculate percentile based on actual job data
    let percentile = 50;
    if (exactMatchJobs.length > 0 || stateJobs.length > 0) {
      const comparisonJobs =
        exactMatchJobs.length >= 3 ? exactMatchJobs : stateJobs;
      const salaryAverages = comparisonJobs
        .map((j) => (j.salaryMin! + j.salaryMax!) / 2)
        .sort((a, b) => a - b);

      const belowCount = salaryAverages.filter((s) => s < offeredAvg).length;
      percentile = Math.round((belowCount / salaryAverages.length) * 100);
    } else {
      // Estimate percentile based on comparison
      percentile = Math.max(0, Math.min(100, 50 + vsOverall / 2));
    }

    // Determine competitiveness
    let competitiveness: 'EXCELLENT' | 'COMPETITIVE' | 'BELOW_AVERAGE' | 'LOW';
    if (vsOverall >= 15) {
      competitiveness = 'EXCELLENT';
    } else if (vsOverall >= -5) {
      competitiveness = 'COMPETITIVE';
    } else if (vsOverall >= -20) {
      competitiveness = 'BELOW_AVERAGE';
    } else {
      competitiveness = 'LOW';
    }

    // Generate warnings
    const warnings: string[] = [];

    if (vsOverall < -20) {
      warnings.push(
        `Salary is ${Math.abs(Math.round(vsOverall))}% below market average`
      );
    }

    if (offeredMin < 1500) {
      warnings.push('Salary is below Malaysia minimum wage (RM1,500)');
    }

    if (offeredMax > offeredMin * 2) {
      warnings.push('Large salary range may deter qualified candidates');
    }

    if (
      (state === 'Kuala Lumpur' || state === 'Selangor') &&
      stateAverage.median > 0
    ) {
      if (offeredAvg < stateAverage.median * 0.85) {
        warnings.push(`Salary may be too low for ${state} cost of living`);
      }
    }

    // Part-time adjustment warning
    if (jobType === 'PART_TIME' && offeredMax > 3000) {
      if (industryAverage.max > 0 && offeredMax > industryAverage.max * 0.8) {
        warnings.push(
          'Part-time salary seems unusually high - verify accuracy'
        );
      }
    }

    // Limited data warning
    if (primaryStats.count < 5) {
      warnings.push(
        `Limited comparison data available (${primaryStats.count} similar jobs found)`
      );
    }

    // Generate tips
    const tips: string[] = [];

    if (competitiveness === 'EXCELLENT') {
      tips.push('Your competitive salary will attract quality candidates');
      tips.push('Consider highlighting this in your job description');
    } else if (competitiveness === 'COMPETITIVE') {
      tips.push('Salary is fair for the market');
      tips.push('Emphasize benefits and growth opportunities');
    } else if (competitiveness === 'BELOW_AVERAGE') {
      const suggestedIncrease = Math.round(
        (stateAverage.median - offeredAvg) * 0.5
      );
      if (suggestedIncrease > 0) {
        tips.push(
          `Consider increasing salary by RM${suggestedIncrease} to be more competitive`
        );
      }
      tips.push('Highlight non-monetary benefits (EPF, SOCSO, training)');
      tips.push('Be flexible with experience requirements');
    } else {
      tips.push(`Recommended minimum: RM${stateAverage.min.toLocaleString()}`);
      tips.push(`Market average: RM${stateAverage.median.toLocaleString()}`);
      tips.push('Low salary may result in fewer quality applications');
    }

    // Generate recommendation
    let recommendation = '';
    if (competitiveness === 'EXCELLENT') {
      recommendation = `Excellent salary offer! You should attract top candidates quickly. (Based on ${dataSourceDescription})`;
    } else if (competitiveness === 'COMPETITIVE') {
      recommendation = `Your salary is competitive with the market. Good candidate pool expected. (Based on ${dataSourceDescription})`;
    } else if (competitiveness === 'BELOW_AVERAGE') {
      recommendation = `Your salary is below average. Consider offering RM${stateAverage.median.toLocaleString()} to attract better candidates. (Based on ${dataSourceDescription})`;
    } else {
      recommendation = `Your salary is significantly below market rate. We recommend at least RM${stateAverage.min.toLocaleString()} for this role. (Based on ${dataSourceDescription})`;
    }

    return {
      competitiveness,
      percentile: Math.round(percentile),
      industryAverage,
      stateAverage,
      comparison: {
        vsIndustry: Math.round(vsIndustry),
        vsState: Math.round(vsState),
        vsOverall: Math.round(vsOverall),
      },
      recommendation,
      warnings,
      tips,
      dataSource: {
        industryJobsCount: industryStats.count,
        stateJobsCount: stateStats.count,
        totalJobsAnalyzed: exactMatchStats.count || primaryStats.count,
      },
    };
  }

  /**
   * Get color for competitiveness level
   */
  static getCompetitivenessColor(
    level: 'EXCELLENT' | 'COMPETITIVE' | 'BELOW_AVERAGE' | 'LOW'
  ): string {
    switch (level) {
      case 'EXCELLENT':
        return '#10B981'; // Green
      case 'COMPETITIVE':
        return '#3B82F6'; // Blue
      case 'BELOW_AVERAGE':
        return '#F59E0B'; // Amber
      case 'LOW':
        return '#EF4444'; // Red
    }
  }
}
