import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminAuthRequest } from '../types/admin';

const prisma = new PrismaClient();

export const getOverviewStats = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const totalJobs = await prisma.job.count();
    const pendingJobs = await prisma.job.count({
      where: { approvalStatus: 'PENDING' },
    });
    const approvedJobs = await prisma.job.count({
      where: { approvalStatus: 'APPROVED' },
    });
    const rejectedJobs = await prisma.job.count({
      where: {
        approvalStatus: { in: ['REJECTED_AI', 'REJECTED_FINAL'] },
      },
    });

    res.json({
      success: true,
      data: {
        total: totalJobs,
        pending: pendingJobs,
        approved: approvedJobs,
        rejected: rejectedJobs,
      },
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch overview stats' });
  }
};

export const getJobPostRanking = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const topJobs = await prisma.job.findMany({
      take: 10,
      orderBy: {
        applicationCount: 'desc',
      },
      include: {
        company: {
          select: { name: true },
        },
      },
    });

    const jobsWithTrend = await Promise.all(
      topJobs.map(async (job) => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentApps = await prisma.jobApplication.count({
          where: {
            jobId: job.id,
            appliedAt: {
              gte: sevenDaysAgo,
            },
          },
        });

        let trend = 'stable';
        if (recentApps > 5) trend = 'up';
        else if (recentApps === 0 && job.applicationCount > 10) trend = 'down';

        return {
          id: job.id,
          title: job.title,
          company: job.company.name,
          apps: job.applicationCount,
          trend,
        };
      })
    );

    res.json({
      success: true,
      data: jobsWithTrend,
    });
  } catch (error) {
    console.error('Error fetching job ranking:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch job ranking' });
  }
};

export const getTrendData = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { type, filter, date } = req.query;
    const referenceDate = date ? new Date(date as string) : new Date();

    let startDate: Date;
    let endDate: Date;

    if (filter === 'week') {
      const day = referenceDate.getDay();
      const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(referenceDate);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'month') {
      startDate = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        1
      );
      endDate = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + 1,
        0
      );
    } else {
      startDate = new Date(referenceDate.getFullYear(), 0, 1);
      endDate = new Date(referenceDate.getFullYear(), 11, 31);
    }

    let dataPoints: { label: string; value: number }[] = [];

    if (type === 'job') {
      const jobs = await prisma.job.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          createdAt: true,
        },
      });

      dataPoints = processDataPoints(
        jobs.map((j) => j.createdAt),
        filter as string,
        startDate
      );
    } else {
      const apps = await prisma.jobApplication.findMany({
        where: {
          appliedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          appliedAt: true,
        },
      });

      dataPoints = processDataPoints(
        apps.map((a) => a.appliedAt),
        filter as string,
        startDate
      );
    }

    res.json({
      success: true,
      data: dataPoints,
    });
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch trend data' });
  }
};

function processDataPoints(dates: Date[], filter: string, startDate: Date) {
  const counts: { [key: string]: number } = {};

  if (filter === 'week') {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    labels.forEach((l) => (counts[l] = 0));

    dates.forEach((d) => {
      const dayIndex = d.getDay();
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      counts[labels[adjustedIndex]]++;
    });

    return labels.map((label) => ({ label, value: counts[label] }));
  } else if (filter === 'month') {
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
    labels.forEach((l) => (counts[l] = 0));

    dates.forEach((d) => {
      const dayOfMonth = d.getDate();
      const weekIndex = Math.floor((dayOfMonth - 1) / 7);
      if (weekIndex < 5) counts[labels[weekIndex]]++;
      else counts['Week 5']++;
    });

    return labels.map((label) => ({ label, value: counts[label] }));
  } else {
    const labels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    labels.forEach((l) => (counts[l] = 0));

    dates.forEach((d) => {
      counts[labels[d.getMonth()]]++;
    });

    return labels.map((label) => ({ label, value: counts[label] }));
  }
}

export const getLanguageUsage = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const usage = await prisma.user.groupBy({
      by: ['preferredLanguage'],
      where: {
        role: 'JOB_SEEKER',
      },
      _count: {
        preferredLanguage: true,
      },
    });

    const total = usage.reduce(
      (acc, curr) => acc + curr._count.preferredLanguage,
      0
    );

    const data = usage.map((u) => ({
      lang: u.preferredLanguage,
      pct:
        total > 0 ? Math.round((u._count.preferredLanguage / total) * 100) : 0,
      count: u._count.preferredLanguage,
    }));

    const displayMap: { [key: string]: string } = {
      ENGLISH: 'English',
      CHINESE: 'Mandarin',
      MALAY: 'Malay',
      TAMIL: 'Tamil',
    };

    const colors: { [key: string]: string } = {
      ENGLISH: '#3B82F6',
      MALAY: '#10B981',
      CHINESE: '#F59E0B',
      TAMIL: '#EF4444',
    };

    const formattedData = data
      .map((d) => ({
        ...d,
        lang: displayMap[d.lang] || d.lang,
        color: colors[d.lang] || '#64748B',
      }))
      .sort((a, b) => b.pct - a.pct);

    res.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('Error fetching language usage:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch language usage' });
  }
};

export const getShortageAnalysis = async (
  req: AdminAuthRequest,
  res: Response
) => {
  try {
    const industries = await prisma.industry.findMany({
      include: {
        _count: {
          select: { jobs: true },
        },
        jobs: {
          select: {
            applicationCount: true,
          },
        },
      },
    });

    const analysis = industries
      .map((ind) => {
        const jobCount = ind._count.jobs;
        const appCount = ind.jobs.reduce(
          (sum, job) => sum + job.applicationCount,
          0
        );

        const ratio = jobCount > 0 ? appCount / jobCount : 0;

        let shortage = 'Low';
        if (ratio < 1) shortage = 'High';
        else if (ratio < 3) shortage = 'Medium';
        else shortage = 'Low';

        return {
          type: ind.name,
          jobs: jobCount,
          applicants: appCount,
          shortage,
          ratio: parseFloat(ratio.toFixed(2)),
          trend: 'stable',
        };
      })
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 10);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error fetching shortage analysis:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch shortage analysis' });
  }
};

export const getHighlights = async (req: AdminAuthRequest, res: Response) => {
  try {
    const locations = await prisma.job.groupBy({
      by: ['state'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const employers = await prisma.company.findMany({
      take: 5,
      orderBy: {
        jobs: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    const employersWithHires = await Promise.all(
      employers.map(async (emp) => {
        const totalApps = await prisma.jobApplication.count({
          where: {
            job: {
              companyId: emp.id,
            },
          },
        });

        const hires = await prisma.jobApplication.count({
          where: {
            job: {
              companyId: emp.id,
            },
            status: 'HIRED',
          },
        });

        const rate = totalApps > 0 ? Math.round((hires / totalApps) * 100) : 0;

        return {
          name: emp.name,
          jobs: emp._count.jobs,
          hires,
          rate: `${rate}%`,
          trend: 'stable',
        };
      })
    );

    res.json({
      success: true,
      data: {
        locations: locations.map((l) => ({
          name: l.state,
          value: l._count.id,
        })),
        employers: employersWithHires,
      },
    });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch highlights' });
  }
};
