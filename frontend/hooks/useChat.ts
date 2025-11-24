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

// ✅ Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;
let socketRefCount = 0;

export const useChat = (options: UseChatOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const currentConversationRef = useRef<number | undefined>(
    options.conversationId
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasConnectedRef = useRef(false); // ✅ Track if we've already connected

  // ✅ Store callbacks in refs to avoid recreating them
  const callbacksRef = useRef({
    onNewMessage: options.onNewMessage,
    onMessageEdited: options.onMessageEdited,
    onMessageDeleted: options.onMessageDeleted,
    onMessagesRead: options.onMessagesRead,
    onTypingChange: options.onTypingChange,
    onConversationUpdated: options.onConversationUpdated,
    onError: options.onError,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage: options.onNewMessage,
      onMessageEdited: options.onMessageEdited,
      onMessageDeleted: options.onMessageDeleted,
      onMessagesRead: options.onMessagesRead,
      onTypingChange: options.onTypingChange,
      onConversationUpdated: options.onConversationUpdated,
      onError: options.onError,
    };
  }, [
    options.onNewMessage,
    options.onMessageEdited,
    options.onMessageDeleted,
    options.onMessagesRead,
    options.onTypingChange,
    options.onConversationUpdated,
    options.onError,
  ]);

  // ✅ Initialize socket connection - NO dependencies on callbacks
  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (globalSocket?.connected) {
      console.log('♻️ Reusing existing socket connection');
      socketRefCount++;
      console.log('📊 Active socket refs:', socketRefCount);
      setIsConnected(true);
      return;
    }

    if (isConnecting) {
      console.log('⏳ Already connecting, waiting...');
      return;
    }

    setIsConnecting(true);

    try {
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        console.error('❌ No auth token found');
        setIsConnecting(false);
        return;
      }

      const baseUrl =
        API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
      console.log('🔌 Creating new socket connection to:', baseUrl);

      if (!globalSocket) {
        globalSocket = io(baseUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
        });

        // Connection events
        globalSocket.on('connect', () => {
          console.log('✅ Chat socket connected:', globalSocket?.id);
          setIsConnected(true);
          setIsConnecting(false);
        });

        globalSocket.on('disconnect', (reason) => {
          console.log('❌ Chat socket disconnected:', reason);
          setIsConnected(false);
        });

        globalSocket.on('connect_error', (error) => {
          console.error('❌ Chat socket connection error:', error.message);
          setIsConnecting(false);
          setIsConnected(false);
          callbacksRef.current.onError?.(error.message);
        });

        // Global event listeners (for logging)
        globalSocket.on('new_message', (message: Message) => {
          console.log('📩 New message received:', message.id);
        });

        globalSocket.on('message_edited', (message: Message) => {
          console.log('✏️ Message edited:', message.id);
        });

        globalSocket.on(
          'message_deleted',
          (data: { messageId: number; conversationId: number }) => {
            console.log('🗑️ Message deleted:', data.messageId);
          }
        );

        globalSocket.on(
          'messages_read',
          (data: { conversationId: number; readBy: number; count: number }) => {
            console.log('👁️ Messages read:', data);
          }
        );

        globalSocket.on('user_typing', (data: TypingUser) => {
          console.log('⌨️ User typing:', data);
        });

        globalSocket.on('conversation_updated', (data: any) => {
          console.log('📝 Conversation updated:', data);
        });

        globalSocket.on('error', (data: { message: string }) => {
          console.error('❌ Socket error:', data.message);
        });
      }

      socketRefCount++;
      console.log('📊 Active socket refs:', socketRefCount);
      setIsConnected(globalSocket.connected);
    } catch (error) {
      console.error('Error connecting to chat socket:', error);
      setIsConnecting(false);
    }
  }, [isConnecting]); // ✅ Only depends on isConnecting

  // ✅ Disconnect socket
  const disconnect = useCallback(() => {
    socketRefCount = Math.max(0, socketRefCount - 1);
    console.log('📊 Active socket refs after disconnect:', socketRefCount);

    if (socketRefCount === 0 && globalSocket) {
      console.log('🔌 Disconnecting socket (no active users)');

      if (currentConversationRef.current && globalSocket.connected) {
        globalSocket.emit('leave_conversation', currentConversationRef.current);
      }

      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      setIsConnected(false);
    }
  }, []); // ✅ No dependencies

  // Join a conversation
  const joinConversation = useCallback((conversationId: number) => {
    if (globalSocket?.connected) {
      console.log('👋 Joining conversation:', conversationId);
      globalSocket.emit('join_conversation', conversationId);
      currentConversationRef.current = conversationId;
    }
  }, []);

  // Leave a conversation
  const leaveConversation = useCallback((conversationId: number) => {
    if (globalSocket?.connected) {
      console.log('👋 Leaving conversation:', conversationId);
      globalSocket.emit('leave_conversation', conversationId);
      if (currentConversationRef.current === conversationId) {
        currentConversationRef.current = undefined;
      }
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
      if (globalSocket?.connected) {
        globalSocket.emit('send_message', {
          conversationId,
          content,
          messageType,
          attachment,
        });
      } else {
        console.warn('⚠️ Cannot send message: socket not connected');
      }
    },
    []
  );

  // Edit a message via socket
  const editMessage = useCallback((messageId: number, content: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('edit_message', { messageId, content });
    } else {
      console.warn('⚠️ Cannot edit message: socket not connected');
    }
  }, []);

  // Delete a message via socket
  const deleteMessage = useCallback((messageId: number) => {
    if (globalSocket?.connected) {
      globalSocket.emit('delete_message', messageId);
    } else {
      console.warn('⚠️ Cannot delete message: socket not connected');
    }
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((conversationId: number) => {
    if (globalSocket?.connected) {
      console.log('📖 Marking as read:', conversationId);
      globalSocket.emit('mark_read', conversationId);
    }
  }, []);

  // Start typing indicator
  const startTyping = useCallback((conversationId: number) => {
    if (globalSocket?.connected) {
      globalSocket.emit('typing_start', conversationId);

      // Auto-stop after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (globalSocket?.connected) {
          globalSocket.emit('typing_stop', conversationId);
        }
      }, 3000);
    }
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((conversationId: number) => {
    if (globalSocket?.connected) {
      globalSocket.emit('typing_stop', conversationId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // ✅ Register component-specific event handlers when socket connects
  useEffect(() => {
    if (!globalSocket || !isConnected) {
      console.log(
        '⚠️ Waiting for socket connection before registering handlers'
      );
      return;
    }

    console.log('✅ Socket connected, registering event handlers');

    const handleNewMessage = (message: Message) => {
      console.log('🎯 handleNewMessage called');
      callbacksRef.current.onNewMessage?.(message);
    };

    const handleMessageEdited = (message: Message) => {
      console.log('🎯 handleMessageEdited called');
      callbacksRef.current.onMessageEdited?.(message);
    };

    const handleMessageDeleted = (data: {
      messageId: number;
      conversationId: number;
    }) => {
      console.log('🎯 handleMessageDeleted called');
      callbacksRef.current.onMessageDeleted?.(data);
    };

    const handleMessagesRead = (data: {
      conversationId: number;
      readBy: number;
      count: number;
    }) => {
      console.log('🎯 handleMessagesRead called');
      callbacksRef.current.onMessagesRead?.(data);
    };

    const handleTyping = (data: TypingUser) => {
      console.log('🎯 handleTyping called');
      callbacksRef.current.onTypingChange?.(data);
    };

    const handleConversationUpdated = (data: any) => {
      console.log('🎯 handleConversationUpdated called in useChat');
      console.log(
        '🎯 Callback exists?',
        !!callbacksRef.current.onConversationUpdated
      );

      if (callbacksRef.current.onConversationUpdated) {
        console.log('🎯 Calling onConversationUpdated callback');
        callbacksRef.current.onConversationUpdated(data);
      } else {
        console.warn('⚠️ onConversationUpdated callback is undefined');
      }
    };

    // Register handlers
    globalSocket.on('new_message', handleNewMessage);
    globalSocket.on('message_edited', handleMessageEdited);
    globalSocket.on('message_deleted', handleMessageDeleted);
    globalSocket.on('messages_read', handleMessagesRead);
    globalSocket.on('user_typing', handleTyping);
    globalSocket.on('conversation_updated', handleConversationUpdated);

    console.log('✅ All event handlers registered successfully');

    return () => {
      console.log('🧹 Cleaning up event handlers');
      globalSocket?.off('new_message', handleNewMessage);
      globalSocket?.off('message_edited', handleMessageEdited);
      globalSocket?.off('message_deleted', handleMessageDeleted);
      globalSocket?.off('messages_read', handleMessagesRead);
      globalSocket?.off('user_typing', handleTyping);
      globalSocket?.off('conversation_updated', handleConversationUpdated);
    };
  }, [isConnected]); // ✅ Re-run when socket connects!

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App came to foreground, checking socket connection');
        if (!globalSocket?.connected) {
          connect();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [connect]);

  // ✅ Connect ONCE on mount
  useEffect(() => {
    if (hasConnectedRef.current) {
      console.log('⏭️ Skipping connect - already connected');
      return;
    }

    isMountedRef.current = true;
    hasConnectedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []); // ✅ EMPTY dependencies - only runs ONCE

  // Handle conversation changes
  useEffect(() => {
    if (!globalSocket?.connected) return;

    const previousConversation = currentConversationRef.current;
    const newConversation = options.conversationId;

    // Leave previous conversation
    if (previousConversation && previousConversation !== newConversation) {
      leaveConversation(previousConversation);
    }

    // Join new conversation
    if (newConversation) {
      joinConversation(newConversation);
    }

    return () => {
      if (newConversation) {
        leaveConversation(newConversation);
      }
    };
  }, [options.conversationId]);

  return {
    socket: globalSocket,
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
