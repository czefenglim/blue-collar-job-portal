// src/socket/chatSocket.ts

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient, MessageType } from '@prisma/client';
import * as chatService from '../services/chatService';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

interface JWTPayload {
  userId: number;
  role: string;
}

const activeConversations = new Map<number, Set<number>>();
const userSockets = new Map<number, string>();

export const initializeChatSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET!
      ) as JWTPayload;

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`🔌 User ${userId} connected to chat socket`);

    userSockets.set(userId, socket.id);
    socket.join(`user:${userId}`);

    // ============================================
    // SEND MESSAGE (Socket event handler)
    // ============================================
    socket.on(
      'send_message',
      async (data: {
        conversationId: number;
        content: string;
        messageType?: MessageType;
        attachment?: {
          url: string;
          name: string;
          size: number;
          type: string;
        };
      }) => {
        try {
          const { conversationId, content, messageType, attachment } = data;

          // Send message through service
          const message = await chatService.sendMessage(
            conversationId,
            userId,
            content,
            messageType || MessageType.TEXT,
            attachment
          );

          console.log(
            `📤 Emitting new_message to conversation:${conversationId}`
          );

          // ✅ Broadcast to conversation room (for chat screen)
          io.to(`conversation:${conversationId}`).emit('new_message', message);

          // ✅ Get conversation participants
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
          });

          if (conversation) {
            const receiverId =
              userId === conversation.employerId
                ? conversation.jobSeekerId
                : conversation.employerId;

            // ✅ Emit conversation_updated to BOTH users (for conversation list)
            console.log(
              `📤 Emitting conversation_updated to users: ${userId}, ${receiverId}`
            );

            io.to(`user:${userId}`).emit('conversation_updated', {
              conversationId,
              lastMessage: message,
            });

            io.to(`user:${receiverId}`).emit('conversation_updated', {
              conversationId,
              lastMessage: message,
            });

            // Check if receiver is in conversation for auto-read
            const receiverInConversation = activeConversations
              .get(conversationId)
              ?.has(receiverId);

            if (receiverInConversation) {
              await chatService.markMessagesAsRead(conversationId, receiverId);
              io.to(`conversation:${conversationId}`).emit('messages_read', {
                conversationId,
                readBy: receiverId,
                count: 1,
              });
            }
          }

          console.log(
            `💬 Message sent in conversation ${conversationId} by user ${userId}`
          );
        } catch (error: any) {
          console.error('Error sending message:', error);
          socket.emit('error', {
            message: error.message || 'Failed to send message',
          });
        }
      }
    );

    // ============================================
    // JOIN CONVERSATION
    // ============================================
    socket.on('join_conversation', async (conversationId: number) => {
      try {
        const conversation = await chatService.getConversationById(
          conversationId,
          userId
        );

        if (conversation) {
          socket.join(`conversation:${conversationId}`);

          if (!activeConversations.has(conversationId)) {
            activeConversations.set(conversationId, new Set());
          }
          activeConversations.get(conversationId)!.add(userId);

          const readCount = await chatService.markMessagesAsRead(
            conversationId,
            userId
          );

          if (readCount > 0) {
            socket.to(`conversation:${conversationId}`).emit('messages_read', {
              conversationId,
              readBy: userId,
              count: readCount,
            });
          }

          console.log(
            `📝 User ${userId} joined conversation ${conversationId}`
          );
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ============================================
    // LEAVE CONVERSATION
    // ============================================
    socket.on('leave_conversation', (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);

      if (activeConversations.has(conversationId)) {
        activeConversations.get(conversationId)!.delete(userId);
        if (activeConversations.get(conversationId)!.size === 0) {
          activeConversations.delete(conversationId);
        }
      }

      console.log(`👋 User ${userId} left conversation ${conversationId}`);
    });

    // ============================================
    // TYPING INDICATOR
    // ============================================
    socket.on('typing_start', (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        isTyping: false,
      });
    });

    // ============================================
    // EDIT MESSAGE
    // ============================================
    socket.on(
      'edit_message',
      async (data: { messageId: number; content: string }) => {
        try {
          const { messageId, content } = data;

          const message = await chatService.editMessage(
            messageId,
            userId,
            content
          );

          const fullMessage = await prisma.chatMessage.findUnique({
            where: { id: messageId },
            select: { conversationId: true },
          });

          if (fullMessage) {
            io.to(`conversation:${fullMessage.conversationId}`).emit(
              'message_edited',
              message
            );
          }
        } catch (error: any) {
          console.error('Error editing message:', error);
          socket.emit('error', {
            message: error.message || 'Failed to edit message',
          });
        }
      }
    );

    // ============================================
    // DELETE MESSAGE
    // ============================================
    socket.on('delete_message', async (messageId: number) => {
      try {
        const message = await prisma.chatMessage.findUnique({
          where: { id: messageId },
          select: { conversationId: true },
        });

        if (message) {
          await chatService.deleteMessage(messageId, userId);

          io.to(`conversation:${message.conversationId}`).emit(
            'message_deleted',
            {
              messageId,
              conversationId: message.conversationId,
            }
          );
        }
      } catch (error: any) {
        console.error('Error deleting message:', error);
        socket.emit('error', {
          message: error.message || 'Failed to delete message',
        });
      }
    });

    // ============================================
    // MARK AS READ
    // ============================================
    socket.on('mark_read', async (conversationId: number) => {
      try {
        const count = await chatService.markMessagesAsRead(
          conversationId,
          userId
        );

        if (count > 0) {
          socket.to(`conversation:${conversationId}`).emit('messages_read', {
            conversationId,
            readBy: userId,
            count,
          });
        }
      } catch (error: any) {
        console.error('Error marking as read:', error);
      }
    });

    // ============================================
    // DISCONNECT
    // ============================================
    socket.on('disconnect', () => {
      console.log(`🔌 User ${userId} disconnected from chat socket`);

      userSockets.delete(userId);

      for (const [conversationId, users] of activeConversations) {
        users.delete(userId);
        if (users.size === 0) {
          activeConversations.delete(conversationId);
        }
      }
    });
  });

  return io;
};

export const emitToUser = (
  io: SocketIOServer,
  userId: number,
  event: string,
  data: any
) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToConversation = (
  io: SocketIOServer,
  conversationId: number,
  event: string,
  data: any
) => {
  io.to(`conversation:${conversationId}`).emit(event, data);
};

export const isUserInConversation = (
  conversationId: number,
  userId: number
): boolean => {
  return activeConversations.get(conversationId)?.has(userId) || false;
};
