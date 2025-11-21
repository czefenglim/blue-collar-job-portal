// src/services/chatService.ts

import { PrismaClient, MessageType, UserRole } from '@prisma/client';
import {
  sendChatStartedNotification,
  sendNewChatMessageToJobSeeker,
  sendNewChatMessageToEmployer,
  sendAttachmentNotification,
} from '../utils/chatNotifications';

const prisma = new PrismaClient();

// ============================================
// CONVERSATION SERVICES
// ============================================

/**
 * Create a new conversation (Employer only)
 */
export const createConversation = async (
  employerId: number,
  applicationId: number
) => {
  // Verify user is an employer
  const employer = await prisma.user.findUnique({
    where: { id: employerId },
    include: {
      company: true,
    },
  });

  if (!employer || employer.role !== UserRole.EMPLOYER) {
    throw new Error('Only employers can start conversations');
  }

  // Get the application and verify ownership
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: {
          company: true,
        },
      },
      user: true,
    },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  // Verify employer owns this job
  if (application.job.company.userId !== employerId) {
    throw new Error('You do not have permission to access this application');
  }

  // Check if conversation already exists
  const existingConversation = await prisma.conversation.findUnique({
    where: { applicationId },
  });

  if (existingConversation) {
    return existingConversation;
  }

  // Create new conversation
  const conversation = await prisma.conversation.create({
    data: {
      applicationId,
      employerId,
      jobSeekerId: application.userId,
      jobId: application.jobId,
    },
    include: {
      employer: {
        select: {
          id: true,
          fullName: true,
          company: {
            select: {
              name: true,
              logo: true,
            },
          },
        },
      },
      jobSeeker: {
        select: {
          id: true,
          fullName: true,
          profile: {
            select: {
              profilePicture: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Send notification to job seeker
  await sendChatStartedNotification(
    application.userId,
    employer.fullName,
    employer.company?.name || 'Company',
    application.job.title,
    conversation.id
  );

  return conversation;
};

/**
 * Get conversation by ID with permission check
 */
export const getConversationById = async (
  conversationId: number,
  userId: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      employer: {
        select: {
          id: true,
          fullName: true,
          company: {
            select: {
              name: true,
              logo: true,
            },
          },
        },
      },
      jobSeeker: {
        select: {
          id: true,
          fullName: true,
          profile: {
            select: {
              profilePicture: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      application: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify user belongs to this conversation
  if (
    conversation.employerId !== userId &&
    conversation.jobSeekerId !== userId
  ) {
    throw new Error('You do not have access to this conversation');
  }

  return conversation;
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (
  userId: number,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isEmployer = user.role === UserRole.EMPLOYER;

  const whereClause = isEmployer
    ? { employerId: userId }
    : { jobSeekerId: userId };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        ...whereClause,
        isActive: true,
      },
      include: {
        employer: {
          select: {
            id: true,
            fullName: true,
            company: {
              select: {
                name: true,
                logo: true,
              },
            },
          },
        },
        jobSeeker: {
          select: {
            id: true,
            fullName: true,
            profile: {
              select: {
                profilePicture: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            messageType: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.conversation.count({
      where: {
        ...whereClause,
        isActive: true,
      },
    }),
  ]);

  // Add unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          isRead: false,
          isDeleted: false,
        },
      });

      return {
        ...conv,
        unreadCount,
        lastMessage: conv.messages[0] || null,
      };
    })
  );

  return {
    conversations: conversationsWithUnread,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get conversation by application ID
 */
export const getConversationByApplicationId = async (
  applicationId: number,
  userId: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { applicationId },
    include: {
      employer: {
        select: {
          id: true,
          fullName: true,
          company: {
            select: {
              name: true,
              logo: true,
            },
          },
        },
      },
      jobSeeker: {
        select: {
          id: true,
          fullName: true,
          profile: {
            select: {
              profilePicture: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Verify user belongs to this conversation
  if (
    conversation.employerId !== userId &&
    conversation.jobSeekerId !== userId
  ) {
    throw new Error('You do not have access to this conversation');
  }

  return conversation;
};

// ============================================
// MESSAGE SERVICES
// ============================================

/**
 * Send a message
 */
export const sendMessage = async (
  conversationId: number,
  senderId: number,
  content: string,
  messageType: MessageType = MessageType.TEXT,
  attachment?: {
    url: string;
    name: string;
    size: number;
    type: string;
  }
) => {
  // Get conversation and verify access
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      employer: {
        select: {
          id: true,
          fullName: true,
          company: {
            select: {
              name: true,
            },
          },
        },
      },
      jobSeeker: {
        select: {
          id: true,
          fullName: true,
        },
      },
      job: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify sender belongs to conversation
  if (
    conversation.employerId !== senderId &&
    conversation.jobSeekerId !== senderId
  ) {
    throw new Error(
      'You do not have permission to send messages in this conversation'
    );
  }

  // Create message
  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId,
      content,
      messageType,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentSize: attachment?.size,
      attachmentType: attachment?.type,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  // Send notification to receiver
  const isEmployerSender = senderId === conversation.employerId;
  const receiverId = isEmployerSender
    ? conversation.jobSeekerId
    : conversation.employerId;

  if (messageType === MessageType.TEXT) {
    if (isEmployerSender) {
      await sendNewChatMessageToJobSeeker(
        receiverId,
        conversation.employer.fullName,
        conversation.employer.company?.name || 'Company',
        content,
        conversationId
      );
    } else {
      await sendNewChatMessageToEmployer(
        receiverId,
        conversation.jobSeeker.fullName,
        conversation.job.title,
        content,
        conversationId
      );
    }
  } else if (
    messageType === MessageType.IMAGE ||
    messageType === MessageType.FILE
  ) {
    const senderName = isEmployerSender
      ? conversation.employer.fullName
      : conversation.jobSeeker.fullName;

    await sendAttachmentNotification(
      receiverId,
      senderName,
      attachment?.type || 'file',
      conversationId,
      !isEmployerSender
    );
  }

  return message;
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (
  conversationId: number,
  userId: number,
  page: number = 1,
  limit: number = 50
) => {
  // Verify user has access
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (
    conversation.employerId !== userId &&
    conversation.jobSeekerId !== userId
  ) {
    throw new Error('You do not have access to this conversation');
  }

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.chatMessage.count({
      where: {
        conversationId,
        isDeleted: false,
      },
    }),
  ]);

  return {
    messages: messages.reverse(), // Return in chronological order
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: number,
  userId: number
) => {
  // Verify user has access
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (
    conversation.employerId !== userId &&
    conversation.jobSeekerId !== userId
  ) {
    throw new Error('You do not have access to this conversation');
  }

  // Mark all messages from the other user as read
  const result = await prisma.chatMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result.count;
};

/**
 * Edit a message
 */
export const editMessage = async (
  messageId: number,
  userId: number,
  newContent: string
) => {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can edit their message
  if (message.senderId !== userId) {
    throw new Error('You can only edit your own messages');
  }

  // Cannot edit deleted messages
  if (message.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }

  // Cannot edit attachment messages (only text)
  if (message.messageType !== MessageType.TEXT) {
    throw new Error('Can only edit text messages');
  }

  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  return updatedMessage;
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (messageId: number, userId: number) => {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can delete their message
  if (message.senderId !== userId) {
    throw new Error('You can only delete your own messages');
  }

  const deletedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      content: null, // Clear content for privacy
      attachmentUrl: null,
    },
  });

  return deletedMessage;
};

/**
 * Get total unread count for user
 */
export const getTotalUnreadCount = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isEmployer = user.role === UserRole.EMPLOYER;

  const count = await prisma.chatMessage.count({
    where: {
      conversation: isEmployer
        ? { employerId: userId }
        : { jobSeekerId: userId },
      senderId: { not: userId },
      isRead: false,
      isDeleted: false,
    },
  });

  return count;
};

/**
 * Check if conversation exists for an application
 */
export const conversationExists = async (applicationId: number) => {
  const conversation = await prisma.conversation.findUnique({
    where: { applicationId },
  });

  return !!conversation;
};
