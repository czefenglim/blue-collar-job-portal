// src/controllers/chatController.ts

import { Request, Response } from 'express';
import { AuthRequest } from '../types/user';
import * as chatService from '../services/chatService';
import {
  uploadChatAttachment,
  isAllowedFileType,
  MAX_FILE_SIZE,
  isImageFile,
} from '../services/s3Service';
import { MessageType } from '@prisma/client';

// ============================================
// CONVERSATION ENDPOINTS
// ============================================

/**
 * Create a new conversation (Employer only)
 * POST /api/chat/conversations
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { applicationId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required',
      });
    }

    const conversation = await chatService.createConversation(
      userId,
      parseInt(applicationId)
    );

    return res.status(201).json({
      success: true,
      data: conversation,
      message: 'Conversation created successfully',
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create conversation',
    });
  }
};

/**
 * Get all conversations for the current user
 * GET /api/chat/conversations
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const result = await chatService.getUserConversations(userId, page, limit);

    return res.status(200).json({
      success: true,
      data: result.conversations,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch conversations',
    });
  }
};

/**
 * Get a single conversation by ID
 * GET /api/chat/conversations/:id
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const conversation = await chatService.getConversationById(
      parseInt(id),
      userId
    );

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return res.status(404).json({
      success: false,
      message: error.message || 'Conversation not found',
    });
  }
};

/**
 * Get conversation by application ID
 * GET /api/chat/conversations/application/:applicationId
 */
export const getConversationByApplication = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { applicationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const conversation = await chatService.getConversationByApplicationId(
      parseInt(applicationId),
      userId
    );

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Error fetching conversation by application:', error);
    return res.status(404).json({
      success: false,
      message: error.message || 'Conversation not found',
    });
  }
};

/**
 * Check if conversation exists for an application
 * GET /api/chat/conversations/exists/:applicationId
 */
export const checkConversationExists = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { applicationId } = req.params;

    const exists = await chatService.conversationExists(
      parseInt(applicationId)
    );

    return res.status(200).json({
      success: true,
      data: { exists },
    });
  } catch (error: any) {
    console.error('Error checking conversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check conversation',
    });
  }
};

// ============================================
// MESSAGE ENDPOINTS
// ============================================

/**
 * Get messages for a conversation
 * GET /api/chat/conversations/:id/messages
 */
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const result = await chatService.getMessages(
      parseInt(id),
      userId,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch messages',
    });
  }
};

/**
 * Send a text message
 * POST /api/chat/conversations/:id/messages
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const message = await chatService.sendMessage(
      parseInt(id),
      userId,
      content.trim()
    );

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to send message',
    });
  }
};

/**
 * Send a message with attachment
 * POST /api/chat/conversations/:id/messages/attachment
 */
export const sendAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const file = req.file;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
      });
    }

    // Validate file type
    if (!isAllowedFileType(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'File type not allowed',
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit',
      });
    }

    // Upload to S3
    const uploadResult = await uploadChatAttachment(
      file.buffer,
      file.originalname,
      file.mimetype,
      parseInt(id)
    );

    // Determine message type
    const messageType = isImageFile(file.mimetype)
      ? MessageType.IMAGE
      : MessageType.FILE;

    // Send message with attachment
    const message = await chatService.sendMessage(
      parseInt(id),
      userId,
      content || '',
      messageType,
      {
        url: uploadResult.url,
        name: uploadResult.fileName,
        size: uploadResult.fileSize,
        type: uploadResult.mimeType,
      }
    );

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error sending attachment:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to send attachment',
    });
  }
};

/**
 * Mark messages as read
 * PUT /api/chat/conversations/:id/read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await chatService.markMessagesAsRead(parseInt(id), userId);

    return res.status(200).json({
      success: true,
      message: `${count} messages marked as read`,
      data: { count },
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark messages as read',
    });
  }
};

/**
 * Edit a message
 * PUT /api/chat/messages/:messageId
 */
export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const message = await chatService.editMessage(
      parseInt(messageId),
      userId,
      content.trim()
    );

    return res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error editing message:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to edit message',
    });
  }
};

/**
 * Delete a message
 * DELETE /api/chat/messages/:messageId
 */
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await chatService.deleteMessage(parseInt(messageId), userId);

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete message',
    });
  }
};

/**
 * Get total unread message count
 * GET /api/chat/unread-count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await chatService.getTotalUnreadCount(userId);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
};
