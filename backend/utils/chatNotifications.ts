// src/utils/chatNotifications.ts

import { createAndSendNotification } from '../controllers/notificationController';
import { NotificationType } from '@prisma/client';

/**
 * Send notification when employer starts a new conversation
 */
export const sendChatStartedNotification = async (
  jobSeekerId: number,
  employerName: string,
  companyName: string,
  jobTitle: string,
  conversationId: number
) => {
  await createAndSendNotification(
    jobSeekerId,
    `New Message from ${companyName} 💬`,
    `${employerName} wants to discuss your application for ${jobTitle}`,
    NotificationType.NEW_MESSAGE,
    `/(user-hidden)/chat/${conversationId}`,
    { conversationId, employerName, companyName, jobTitle }
  );
};

/**
 * Send notification for new message (employer to job seeker)
 */
export const sendNewChatMessageToJobSeeker = async (
  jobSeekerId: number,
  employerName: string,
  companyName: string,
  messagePreview: string,
  conversationId: number
) => {
  // Truncate message preview
  const preview =
    messagePreview.length > 50
      ? messagePreview.substring(0, 47) + '...'
      : messagePreview;

  await createAndSendNotification(
    jobSeekerId,
    `Message from ${companyName} 💬`,
    preview,
    NotificationType.NEW_MESSAGE,
    `/(user-hidden)/chat/${conversationId}`,
    { conversationId, employerName, companyName, messagePreview: preview }
  );
};

/**
 * Send notification for new message (job seeker to employer)
 */
export const sendNewChatMessageToEmployer = async (
  employerId: number,
  jobSeekerName: string,
  jobTitle: string,
  messagePreview: string,
  conversationId: number
) => {
  // Truncate message preview
  const preview =
    messagePreview.length > 50
      ? messagePreview.substring(0, 47) + '...'
      : messagePreview;

  await createAndSendNotification(
    employerId,
    `Reply from ${jobSeekerName} 💬`,
    `Re: ${jobTitle} - ${preview}`,
    NotificationType.NEW_MESSAGE,
    `/(employer)/chat/${conversationId}`,
    { conversationId, jobSeekerName, jobTitle, messagePreview: preview }
  );
};

/**
 * Send notification for file/image attachment
 */
export const sendAttachmentNotification = async (
  receiverId: number,
  senderName: string,
  attachmentType: string,
  conversationId: number,
  isEmployerReceiver: boolean
) => {
  const attachmentLabel = attachmentType.startsWith('image/')
    ? 'image'
    : 'file';

  await createAndSendNotification(
    receiverId,
    `${senderName} sent a ${attachmentLabel} 📎`,
    `Tap to view the ${attachmentLabel}`,
    NotificationType.NEW_MESSAGE,
    isEmployerReceiver
      ? `/(employer)/chat/${conversationId}`
      : `/(user-hidden)/chat/${conversationId}`,
    { conversationId, senderName, attachmentType }
  );
};

/**
 * Send notification for unread messages reminder
 */
export const sendUnreadMessagesReminder = async (
  userId: number,
  unreadCount: number,
  senderName: string,
  conversationId: number,
  isEmployer: boolean
) => {
  await createAndSendNotification(
    userId,
    `${unreadCount} unread messages 💬`,
    `You have unread messages from ${senderName}`,
    NotificationType.NEW_MESSAGE,
    isEmployer
      ? `/(employer)/chat/${conversationId}`
      : `/(user-hidden)/chat/${conversationId}`,
    { conversationId, unreadCount, senderName }
  );
};
