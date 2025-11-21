// src/controllers/notificationController.ts

import { Request, Response } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { AuthRequest } from '../types/user'; // ✅ Use proper type

const prisma = new PrismaClient();
const expo = new Expo();

// ✅ FIXED: Register push token - Store in database
export const registerPushToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED: Use userId from auth middleware
    const { pushToken } = req.body;

    console.log('📱 Registering push token for user:', userId);
    console.log('📱 Token:', pushToken);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    // Validate that the token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log('❌ Invalid Expo push token:', pushToken);
      return res.status(400).json({
        success: false,
        message: 'Invalid Expo push token',
      });
    }

    // ✅ FIXED: Store the token in database
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });

    console.log('✅ Push token registered successfully for user:', userId);

    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register push token',
    });
  }
};

// ✅ FIXED: Get all notifications for user
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};

// ✅ FIXED: Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
};

// ✅ FIXED: Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
};

// ✅ FIXED: Mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
    });
  }
};

// ✅ FIXED: Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
};

// ✅ FIXED: Delete all notifications
export const deleteAllNotifications = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId; // ✅ FIXED

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await prisma.notification.deleteMany({
      where: { userId },
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete all notifications',
    });
  }
};

// ✅ FIXED: Helper function to create and send notification
export const createAndSendNotification = async (
  userId: number,
  title: string,
  message: string,
  type: NotificationType,
  actionUrl?: string,
  metadata?: any
) => {
  try {
    console.log(`📤 Creating notification for user ${userId}: ${title}`);

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionUrl,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // ✅ FIXED: Get push token from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      console.log(`📱 Sending push notification to token: ${user.pushToken}`);

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      const pushMessage: ExpoPushMessage = {
        to: user.pushToken,
        sound: 'default',
        title,
        body: message,
        data: {
          notificationId: notification.id,
          actionUrl,
          type,
        },
        badge: unreadCount,
        priority: 'high', // ✅ ADD: High priority for immediate delivery
        channelId: 'default', // ✅ ADD: Use Android channel
      };

      try {
        const tickets = await expo.sendPushNotificationsAsync([pushMessage]);
        console.log('📱 Push notification tickets:', tickets);

        // Check for errors
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            console.error(`❌ Push notification error: ${ticket.message}`);
            if (ticket.details?.error === 'DeviceNotRegistered') {
              // Remove invalid token
              await prisma.user.update({
                where: { id: userId },
                data: { pushToken: null },
              });
              console.log(`🗑️ Removed invalid push token for user ${userId}`);
            }
          }
        }
      } catch (pushError) {
        console.error('❌ Error sending push notification:', pushError);
      }
    } else {
      console.log(`⚠️ No valid push token for user ${userId}`);
    }

    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// ✅ FIXED: Helper function to send bulk push notifications
export const sendBulkPushNotifications = async (
  userIds: number[],
  title: string,
  body: string,
  data?: any
) => {
  try {
    const messages: ExpoPushMessage[] = [];

    // ✅ FIXED: Get push tokens from database
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        pushToken: { not: null },
      },
      select: {
        id: true,
        pushToken: true,
      },
    });

    for (const user of users) {
      if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
        messages.push({
          to: user.pushToken,
          sound: 'default',
          title,
          body,
          data,
          priority: 'high',
          channelId: 'default',
        });
      }
    }

    if (messages.length === 0) {
      console.log('⚠️ No valid push tokens for bulk notification');
      return;
    }

    // Send in chunks (Expo recommends max 100 at a time)
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log(`📱 Sent ${chunk.length} push notifications`);
    }
  } catch (error) {
    console.error('❌ Error sending bulk push notifications:', error);
  }
};
