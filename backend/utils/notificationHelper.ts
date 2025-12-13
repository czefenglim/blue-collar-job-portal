import { createAndSendNotification } from '../controllers/notificationController';
import { NotificationType } from '@prisma/client';

// Job match notification
export const sendJobMatchNotification = async (
  userId: number,
  jobTitle: string,
  companyName: string,
  jobSlug: string
) => {
  await createAndSendNotification(
    userId,
    'New Job Match! 🎯',
    `${jobTitle} at ${companyName} matches your preferences`,
    NotificationType.JOB_MATCH,
    `/JobDetailsScreen/${jobSlug}`,
    { jobSlug, jobTitle, companyName }
  );
};

// Application submitted notification (for employer)
export const sendNewApplicationNotification = async (
  employerId: number,
  applicantName: string,
  jobTitle: string,
  applicationId: number
) => {
  console.log('📤 sendNewApplicationNotification called');
  console.log('📤 Employer ID:', employerId);
  console.log('📤 Applicant:', applicantName);
  console.log('📤 Job:', jobTitle);

  await createAndSendNotification(
    employerId,
    'New Application Received 📋',
    `${applicantName} applied for ${jobTitle}`,
    NotificationType.APPLICATION_UPDATE,
    `/(employer-hidden)/applicant-details/${applicationId}`,
    { applicationId, applicantName, jobTitle }
  );
};

// Application status update (for job seeker)
export const sendApplicationStatusNotification = async (
  userId: number,
  jobTitle: string,
  status: string,
  applicationId: number
) => {
  let title = '';
  let message = '';

  switch (status) {
    case 'PENDING':
      title = 'Application Submitted ✅';
      message = `Your application for ${jobTitle} has been submitted`;
      break;
    case 'REVIEWING':
      title = 'Application Under Review 👀';
      message = `Your application for ${jobTitle} is being reviewed`;
      break;
    case 'SHORTLISTED':
      title = "You've Been Shortlisted! 🎉";
      message = `Great news! You're shortlisted for ${jobTitle}`;
      break;
    case 'INTERVIEW_SCHEDULED':
      title = 'Interview Scheduled 📅';
      message = `You have an interview for ${jobTitle}`;
      break;
    case 'INTERVIEWED':
      title = 'Interview Completed ✅';
      message = `Your interview for ${jobTitle} has been recorded`;
      break;
    case 'REJECTED':
      title = 'Application Update 📝';
      message = `Update on your application for ${jobTitle}`;
      break;
    case 'HIRED':
      title = 'Congratulations! 🎊';
      message = `You've been hired for ${jobTitle}!`;
      break;
    case 'WITHDRAWN':
      title = 'Application Withdrawn';
      message = `Your application for ${jobTitle} has been withdrawn`;
      break;
  }

  await createAndSendNotification(
    userId,
    title,
    message,
    NotificationType.APPLICATION_UPDATE,
    `/(tabs)/AppliedJobScreen`,
    { applicationId, jobTitle, status }
  );
};

// Profile completion reminder
export const sendProfileCompletionReminder = async (
  userId: number,
  completionPercentage: number
) => {
  await createAndSendNotification(
    userId,
    'Complete Your Profile 👤',
    `Your profile is ${completionPercentage}% complete. Finish it to get better job matches!`,
    NotificationType.PROFILE_UPDATE,
    '/ProfileScreen',
    { completionPercentage }
  );
};

// New message notification
export const sendNewMessageNotification = async (
  userId: number,
  senderName: string,
  messagePreview: string,
  conversationId: number
) => {
  await createAndSendNotification(
    userId,
    `New Message from ${senderName} 💬`,
    messagePreview,
    NotificationType.NEW_MESSAGE,
    `/(shared)/chat/${conversationId}`,
    { conversationId, senderName }
  );
};

// Job post approved (for employer)
export const sendJobApprovedNotification = async (
  employerId: number,
  jobTitle: string,
  jobId: number
) => {
  await createAndSendNotification(
    employerId,
    'Job Post Approved ✅',
    `Your job post "${jobTitle}" has been approved and is now live!`,
    NotificationType.SYSTEM_UPDATE,
    `/(employer-hidden)/job-post-details/${jobId}`,
    { jobId, jobTitle }
  );
};

// Job post rejected (for employer)
export const sendJobRejectedNotification = async (
  employerId: number,
  jobTitle: string,
  reason: string,
  jobId: number
) => {
  await createAndSendNotification(
    employerId,
    'Job Post Needs Attention ⚠️',
    `Your job post "${jobTitle}" needs revision: ${reason}`,
    NotificationType.SYSTEM_UPDATE,
    `/(employer-hidden)/job-post-details/${jobId}`,
    { jobId, jobTitle, reason }
  );
};

// Job about to expire
export const sendJobExpirationWarning = async (
  employerId: number,
  jobTitle: string,
  daysLeft: number,
  jobId: number
) => {
  await createAndSendNotification(
    employerId,
    'Job Post Expiring Soon ⏰',
    `Your job post "${jobTitle}" expires in ${daysLeft} days`,
    NotificationType.SYSTEM_UPDATE,
    `/(employer-hidden)/job-post-details/${jobId}`,
    { jobId, jobTitle, daysLeft }
  );
};

// Report resolved notification
export const sendReportResolvedNotification = async (
  userId: number,
  reportType: string,
  resolution: string,
  reportId: number
) => {
  await createAndSendNotification(
    userId,
    'Report Resolved ✅',
    `Your ${reportType} report has been resolved: ${resolution}`,
    NotificationType.SYSTEM_UPDATE,
    `/(user-hidden)/report-history`,
    { reportId, reportType, resolution }
  );
};

// Account suspended notification
export const sendAccountSuspendedNotification = async (
  userId: number,
  reason: string
) => {
  await createAndSendNotification(
    userId,
    'Account Suspended ⚠️',
    `Your account has been suspended. Reason: ${reason}`,
    NotificationType.SYSTEM_UPDATE,
    '/ProfileScreen',
    { reason }
  );
};

// Appeal accepted notification (for employer)
export const sendAppealAcceptedNotification = async (
  employerId: number,
  reportId: number,
  jobTitle: string
) => {
  await createAndSendNotification(
    employerId,
    'Appeal Accepted ✅',
    `Your appeal has been accepted. ${jobTitle} has been restored.`,
    NotificationType.SYSTEM_UPDATE,
    `/(employer-hidden)/reports/${reportId}/page`,
    { reportId, jobTitle }
  );
};

// Appeal rejected notification (for employer)
export const sendAppealRejectedNotification = async (
  employerId: number,
  reportId: number,
  reason: string
) => {
  await createAndSendNotification(
    employerId,
    'Appeal Decision ❌',
    `Your appeal has been rejected. ${reason}`,
    NotificationType.SYSTEM_UPDATE,
    `/(employer-hidden)/reports/${reportId}/page`,
    { reportId, reason }
  );
};
