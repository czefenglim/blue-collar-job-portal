import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { sendJobExpirationWarning } from '../utils/notificationHelper';

const prisma = new PrismaClient();

// Run this daily to check for expiring jobs
export const checkExpiringJobs = async () => {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringJobs = await prisma.job.findMany({
      where: {
        isActive: true,
        applicationDeadline: {
          gte: new Date(),
          lte: threeDaysFromNow,
        },
      },
      include: {
        company: {
          include: { user: true },
        },
      },
    });

    for (const job of expiringJobs) {
      if (job.company?.user) {
        const daysLeft = Math.ceil(
          (job.applicationDeadline!.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );

        await sendJobExpirationWarning(
          job.company.user.id,
          job.title,
          daysLeft,
          job.id
        );
      }
    }

    console.log(`Sent expiration warnings for ${expiringJobs.length} jobs`);
  } catch (error) {
    console.error('Error checking expiring jobs:', error);
  }
};

// Schedule the job to run daily at 9 AM
cron.schedule('0 9 * * *', checkExpiringJobs);
