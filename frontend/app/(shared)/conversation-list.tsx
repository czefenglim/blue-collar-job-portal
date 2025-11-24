// src/screens/ConversationsListScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import useChat from '@/hooks/useChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'expo-router';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Conversation {
  id: number;
  applicationId: number;
  employerId: number;
  jobSeekerId: number;
  jobId: number;
  lastMessageAt: string | null;
  isActive: boolean;
  employer: {
    id: number;
    fullName: string;
    company: {
      name: string;
      logo: string | null;
    } | null;
  };
  jobSeeker: {
    id: number;
    fullName: string;
    profile: {
      profilePicture: string | null;
    } | null;
  };
  job: {
    id: number;
    title: string;
  };
  lastMessage: {
    id: number;
    content: string | null;
    messageType: string;
    createdAt: string;
    senderId: number;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

interface User {
  id: number;
  role: string;
  fullName: string;
}

const ConversationsListScreen: React.FC = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [userLoaded, setUserLoaded] = useState(false); // ✅ NEW
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const isEmployer = user?.role === 'EMPLOYER';

  // Load user data and token FIRST
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');
      console.log('userData in conversation-list:', userData);
      console.log('userToken in conversation-list:', userToken);
      if (!userToken || !userData) {
        Alert.alert(t('common.error'), 'Please login to continue');
        navigation.goBack();
        return;
      }

      setToken(userToken);
      setUser(JSON.parse(userData));
      console.log('user data in conversation-list:', userData);
      setUserLoaded(true); // ✅ Mark user as loaded
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t('common.error'), 'Failed to load user data');
    }
  };

  // ✅ IMPROVED: Socket connection with better update handling
  const handleConversationUpdated = useCallback(
    (data: any) => {
      console.log('=== CONVERSATION_UPDATED RECEIVED ===');
      console.log('🔔 Conversation ID:', data.conversationId);
      console.log('🔔 New message:', data.lastMessage.content);
      console.log('🔔 Current user ID:', user?.id);

      setConversations((prev) => {
        console.log('📋 Current conversations:', prev.length);

        const updated = prev.map((conv) => {
          if (conv.id === data.conversationId) {
            console.log('✅ Found conversation, updating...');
            console.log('📝 Old message:', conv.lastMessage?.content);
            console.log('📝 New message:', data.lastMessage.content);

            const updatedConv = {
              ...conv,
              lastMessage: {
                id: data.lastMessage.id,
                content: data.lastMessage.content,
                messageType: data.lastMessage.messageType,
                createdAt: data.lastMessage.createdAt,
                senderId: data.lastMessage.senderId,
                isRead: data.lastMessage.isRead,
              },
              lastMessageAt: data.lastMessage.createdAt,
              unreadCount:
                data.lastMessage.senderId !== user?.id
                  ? conv.unreadCount + 1
                  : conv.unreadCount,
            };

            console.log(
              '✅ Updated conversation:',
              updatedConv.lastMessage?.content
            );
            return updatedConv;
          }
          return conv;
        });

        // Sort by lastMessageAt
        const sorted = updated.sort((a, b) => {
          const dateA = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const dateB = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return dateB - dateA;
        });

        console.log('✅ Returning sorted conversations');
        return sorted;
      });

      console.log('=== CONVERSATION_UPDATED COMPLETE ===');
    },
    [user?.id] // ✅ Stable dependency
  );

  const handleMessagesRead = useCallback(
    (data: { conversationId: number; readBy: number; count: number }) => {
      console.log('📖 Messages read:', data);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    },
    []
  );

  const handleNewMessage = useCallback(
    (message: any) => {
      console.log('📩 New message in list:', message.id);

      setConversations((prev) => {
        let found = false;
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            found = true;
            console.log('✅ Updating conversation with new message');
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                content: message.content,
                messageType: message.messageType,
                createdAt: message.createdAt,
                senderId: message.senderId,
                isRead: message.isRead,
              },
              lastMessageAt: message.createdAt,
              unreadCount:
                message.senderId !== user?.id
                  ? conv.unreadCount + 1
                  : conv.unreadCount,
            };
          }
          return conv;
        });

        if (!found) {
          console.log('⚠️ Conversation not found, fetching...');
          upsertConversationFromServer(message.conversationId);
        }

        // Sort by lastMessageAt
        return updated.sort((a, b) => {
          const dateA = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const dateB = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return dateB - dateA;
        });
      });
    },
    [user?.id]
  );

  const handleMessageEdited = useCallback((message: any) => {
    console.log('✏️ Message edited in list:', message.id);
    setConversations((prev) =>
      prev.map((conv) => {
        if (
          conv.id === message.conversationId &&
          conv.lastMessage?.id === message.id
        ) {
          return {
            ...conv,
            lastMessage: conv.lastMessage
              ? {
                  id: conv.lastMessage.id,
                  content: message.content,
                  messageType: conv.lastMessage.messageType,
                  createdAt: message.updatedAt || message.createdAt,
                  senderId: conv.lastMessage.senderId,
                  isRead: message.isRead,
                }
              : null,
            lastMessageAt: message.updatedAt || message.createdAt,
          };
        }
        return conv;
      })
    );
  }, []);

  const handleMessageDeleted = useCallback((data: any) => {
    console.log('🗑️ Message deleted in list:', data.messageId);
    setConversations((prev) =>
      prev.map((conv) => {
        if (
          conv.id === data.conversationId &&
          conv.lastMessage?.id === data.messageId
        ) {
          return {
            ...conv,
            lastMessage: conv.lastMessage
              ? {
                  id: conv.lastMessage.id,
                  content: '', // Clear content for deleted message
                  messageType: conv.lastMessage.messageType,
                  createdAt: conv.lastMessage.createdAt,
                  senderId: conv.lastMessage.senderId,
                  isRead: conv.lastMessage.isRead,
                }
              : null,
          };
        }
        return conv;
      })
    );
  }, []);

  const handleSocketError = useCallback((error: string) => {
    console.error('Socket error in list:', error);
  }, []);

  // ✅ Now use the stable callbacks
  const { isConnected } = useChat({
    onConversationUpdated: userLoaded ? handleConversationUpdated : undefined,
    onMessagesRead: userLoaded ? handleMessagesRead : undefined,
    onNewMessage: userLoaded ? handleNewMessage : undefined,
    onMessageEdited: userLoaded ? handleMessageEdited : undefined,
    onMessageDeleted: userLoaded ? handleMessageDeleted : undefined,
    onError: handleSocketError,
  });

  // Fetch and upsert a single conversation by id
  const upsertConversationFromServer = async (conversationId: number) => {
    if (!token) return;
    try {
      const response = await fetch(
        `${URL}/api/chat/conversations/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === conversationId);
            const next = exists
              ? prev.map((c) => (c.id === conversationId ? data.data : c))
              : [data.data, ...prev];
            return next.sort((a, b) => {
              const dateA = a.lastMessageAt
                ? new Date(a.lastMessageAt).getTime()
                : 0;
              const dateB = b.lastMessageAt
                ? new Date(b.lastMessageAt).getTime()
                : 0;
              return dateB - dateA;
            });
          });
        }
      }
    } catch (error) {
      console.error('Error upserting conversation:', error);
    }
  };

  // Fetch conversations
  const fetchConversations = async (
    pageNum: number = 1,
    refresh: boolean = false
  ) => {
    if (!token) return;

    try {
      if (refresh) {
        setRefreshing(true);
      }

      const response = await fetch(
        `${URL}/api/chat/conversations?page=${pageNum}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          if (pageNum === 1) {
            setConversations(data.data);
          } else {
            setConversations((prev) => [...prev, ...data.data]);
          }

          setHasMore(
            data.pagination ? pageNum < data.pagination.totalPages : false
          );
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load - Only after user is loaded
  useEffect(() => {
    if (userLoaded && user && token) {
      fetchConversations();
    }
  }, [userLoaded, user, token]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (userLoaded && user && token) {
        fetchConversations(1, true);
      }
    }, [userLoaded, user, token])
  );

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    fetchConversations(1, true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchConversations(nextPage);
    }
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return t('chat.yesterday');
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  // Get display name
  const getDisplayName = (conversation: Conversation) => {
    if (isEmployer) {
      console.log('Job seeker displaying:', conversation.jobSeeker.fullName);
      return conversation.jobSeeker.fullName;
    } else {
      console.log(
        'Employer displaying:',
        conversation.employer.company?.name || conversation.employer.fullName
      );
      return (
        conversation.employer.company?.name || conversation.employer.fullName
      );
    }
  };

  // Get avatar
  const getAvatar = (conversation: Conversation) => {
    if (isEmployer) {
      return conversation.jobSeeker.profile?.profilePicture;
    } else {
      return conversation.employer.company?.logo;
    }
  };

  // Get last message preview
  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return t('chat.noMessages');
    }

    console.log('Last message:', conversation.lastMessage);

    const { messageType, content, senderId } = conversation.lastMessage;
    const isOwnMessage = senderId === user?.id;
    const prefix = isOwnMessage ? `${t('chat.you')}: ` : '';

    switch (messageType) {
      case 'IMAGE':
        return `${prefix}📷 ${t('chat.image')}`;
      case 'FILE':
        return `${prefix}📎 ${t('chat.file')}`;
      default:
        return `${prefix}${content || ''}`;
    }
  };

  // Navigate to chat
  const handleConversationPress = (conversation: Conversation) => {
    console.log('Navigating to chat with:', {
      id: conversation.id,
      name: getDisplayName(conversation),
      jobTitle: conversation.job.title,
    });

    // ✅ CORRECT: Use object format with pathname and params
    router.push({
      pathname: '/(shared)/chat/[id]',
      params: {
        id: conversation.id.toString(), // ✅ Convert to string
        name: getDisplayName(conversation),
        jobTitle: conversation.job.title,
      },
    });
  };

  // Render conversation item
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const displayName = getDisplayName(item);
    const avatar = getAvatar(item);
    const lastMessagePreview = getLastMessagePreview(item);
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, hasUnread && styles.unreadItem]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.displayName, hasUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {item.lastMessageAt && (
              <Text style={styles.timestamp}>
                {formatTime(item.lastMessageAt)}
              </Text>
            )}
          </View>

          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job.title}
          </Text>

          <View style={styles.lastMessageRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
              numberOfLines={1}
            >
              {lastMessagePreview}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>{t('chat.noConversations')}</Text>
        <Text style={styles.emptySubtitle}>
          {isEmployer
            ? t('chat.startChatWithApplicants')
            : t('chat.waitForEmployerMessage')}
        </Text>
      </View>
    );
  };

  // Render footer (loading indicator)
  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  };

  // ✅ Show loading until user is loaded
  if (!userLoaded || (loading && conversations.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>{t('chat.connecting')}</Text>
        </View>
      )}

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyList : undefined
        }
        // ✅ Add this to prevent flickering
        removeClippedSubviews={false}
        // ✅ Optimize performance
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#92400e',
    fontSize: 12,
    textAlign: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  unreadItem: {
    backgroundColor: '#f0f9ff',
  },
  avatarContainer: {
    marginRight: 12,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden', // ✅ Important for circular clipping
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },

  defaultAvatar: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  jobTitle: {
    fontSize: 12,
    color: '#2563eb',
    marginBottom: 4,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#1f2937',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyList: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
  },
});

export default ConversationsListScreen;
