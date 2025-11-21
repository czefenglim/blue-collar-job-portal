// src/hooks/useChat.ts

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, AppStateStatus } from 'react-native';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string | null;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentType: string | null;
  isRead: boolean;
  readAt: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: number;
    fullName: string;
    role: string;
  };
}

interface TypingUser {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

interface UseChatOptions {
  conversationId?: number;
  onNewMessage?: (message: Message) => void;
  onMessageEdited?: (message: Message) => void;
  onMessageDeleted?: (data: {
    messageId: number;
    conversationId: number;
  }) => void;
  onMessagesRead?: (data: {
    conversationId: number;
    readBy: number;
    count: number;
  }) => void;
  onTypingChange?: (data: TypingUser) => void;
  onConversationUpdated?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useChat = (options: UseChatOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isMountedRef = useRef(true);

  // Initialize socket connection
  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (socketRef.current?.connected || isConnecting) {
      console.log('Socket already connected or connecting');
      return;
    }

    setIsConnecting(true);

    try {
      // FIX 1: Changed from 'token' to 'jwtToken'
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        console.error('No auth token found');
        if (isMountedRef.current) {
          setIsConnecting(false);
        }
        return;
      }

      // FIX 2: Better URL handling
      const baseUrl =
        API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
      console.log('🔌 Connecting to socket:', baseUrl);

      // Disconnect existing socket before creating new one
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const newSocket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // FIX 3: Added polling as fallback
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Chat socket connected:', newSocket.id);
        if (isMountedRef.current) {
          setIsConnected(true);
          setIsConnecting(false);
        }

        // Auto-join conversation if provided
        if (options.conversationId) {
          console.log('Joining conversation:', options.conversationId);
          newSocket.emit('join_conversation', options.conversationId);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Chat socket disconnected:', reason);
        if (isMountedRef.current) {
          setIsConnected(false);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Chat socket connection error:', error.message);
        if (isMountedRef.current) {
          setIsConnecting(false);
          setIsConnected(false);
        }
        options.onError?.(error.message);
      });

      // Message events with error handling
      newSocket.on('new_message', (message: Message) => {
        try {
          console.log('📩 New message received:', message.id);
          options.onNewMessage?.(message);
        } catch (error) {
          console.error('Error handling new message:', error);
        }
      });

      newSocket.on('message_edited', (message: Message) => {
        try {
          console.log('✏️ Message edited:', message.id);
          options.onMessageEdited?.(message);
        } catch (error) {
          console.error('Error handling message edit:', error);
        }
      });

      newSocket.on(
        'message_deleted',
        (data: { messageId: number; conversationId: number }) => {
          try {
            console.log('🗑️ Message deleted:', data.messageId);
            options.onMessageDeleted?.(data);
          } catch (error) {
            console.error('Error handling message delete:', error);
          }
        }
      );

      newSocket.on(
        'messages_read',
        (data: { conversationId: number; readBy: number; count: number }) => {
          try {
            console.log('👁️ Messages read:', data);
            options.onMessagesRead?.(data);
          } catch (error) {
            console.error('Error handling messages read:', error);
          }
        }
      );

      newSocket.on('user_typing', (data: TypingUser) => {
        try {
          options.onTypingChange?.(data);
        } catch (error) {
          console.error('Error handling typing change:', error);
        }
      });

      newSocket.on('conversation_updated', (data: any) => {
        try {
          console.log('📝 Conversation updated:', data);
          options.onConversationUpdated?.(data);
        } catch (error) {
          console.error('Error handling conversation update:', error);
        }
      });

      newSocket.on('error', (data: { message: string }) => {
        console.error('❌ Socket error:', data.message);
        options.onError?.(data.message);
      });

      socketRef.current = newSocket;
    } catch (error) {
      console.error('Error connecting to chat socket:', error);
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, [options.conversationId]); // FIX 4: Removed options from dependencies

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting socket');

      if (options.conversationId && socketRef.current.connected) {
        socketRef.current.emit('leave_conversation', options.conversationId);
      }

      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;

      if (isMountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [options.conversationId]);

  // Join a conversation
  const joinConversation = useCallback((conversationId: number) => {
    if (socketRef.current?.connected) {
      console.log('Joining conversation:', conversationId);
      socketRef.current.emit('join_conversation', conversationId);
    }
  }, []);

  // Leave a conversation
  const leaveConversation = useCallback((conversationId: number) => {
    if (socketRef.current?.connected) {
      console.log('Leaving conversation:', conversationId);
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, []);

  // Send a message via socket
  const sendMessage = useCallback(
    (
      conversationId: number,
      content: string,
      messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT',
      attachment?: {
        url: string;
        name: string;
        size: number;
        type: string;
      }
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversationId,
          content,
          messageType,
          attachment,
        });
      } else {
        console.warn('Cannot send message: socket not connected');
      }
    },
    []
  );

  // Edit a message via socket
  const editMessage = useCallback((messageId: number, content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('edit_message', { messageId, content });
    } else {
      console.warn('Cannot edit message: socket not connected');
    }
  }, []);

  // Delete a message via socket
  const deleteMessage = useCallback((messageId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('delete_message', messageId);
    } else {
      console.warn('Cannot delete message: socket not connected');
    }
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', conversationId);
    }
  }, []);

  // Start typing indicator
  const startTyping = useCallback((conversationId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', conversationId);

      // Auto-stop after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('typing_stop', conversationId);
        }
      }, 3000);
    }
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', conversationId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Handle app state changes (reconnect when coming back to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('App came to foreground, checking socket connection');
        if (!socketRef.current?.connected && isMountedRef.current) {
          connect();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    isMountedRef.current = true;

    // FIX 5: Delay connection slightly to ensure component is fully mounted
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []); // FIX 6: Empty deps to connect only once

  // Update conversation when conversationId changes
  useEffect(() => {
    if (socketRef.current?.connected && options.conversationId) {
      console.log('Conversation ID changed, joining:', options.conversationId);
      socketRef.current.emit('join_conversation', options.conversationId);
    }
  }, [options.conversationId]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    startTyping,
    stopTyping,
  };
};

export default useChat;
