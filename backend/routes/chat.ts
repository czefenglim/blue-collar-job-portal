// src/routes/chatRoutes.ts

import { Router } from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import * as chatController from '../controllers/chatController';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// All routes require authentication
router.use(authMiddleware);

// ============================================
// CONVERSATION ROUTES
// ============================================

// Get all conversations for current user
router.get('/conversations', chatController.getConversations);

// Create a new conversation (Employer only)
router.post('/conversations', chatController.createConversation);

// Get conversation by ID
router.get('/conversations/:id', chatController.getConversation);

// Get conversation by application ID
router.get(
  '/conversations/application/:applicationId',
  chatController.getConversationByApplication
);

// Check if conversation exists for application
router.get(
  '/conversations/exists/:applicationId',
  chatController.checkConversationExists
);

// ============================================
// MESSAGE ROUTES
// ============================================

// Get messages for a conversation
router.get('/conversations/:id/messages', chatController.getMessages);

// Send a text message
router.post('/conversations/:id/messages', chatController.sendMessage);

// Send a message with attachment
router.post(
  '/conversations/:id/messages/attachment',
  upload.single('file'),
  chatController.sendAttachment
);

// Mark messages as read
router.put('/conversations/:id/read', chatController.markAsRead);

// Edit a message
router.put('/messages/:messageId', chatController.editMessage);

// Delete a message
router.delete('/messages/:messageId', chatController.deleteMessage);

// ============================================
// UTILITY ROUTES
// ============================================

// Get total unread message count
router.get('/unread-count', chatController.getUnreadCount);

export default router;
