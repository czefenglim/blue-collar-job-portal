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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isEmployer = user?.role === 'EMPLOYER';

  // Load user data and token
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('user');

      if (!userToken || !userData) {
        Alert.alert(t('common.error'), 'Please login to continue');
        navigation.goBack();
        return;
      }

      setToken(userToken);
      setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t('common.error'), 'Failed to load user data');
    }
  };

  // Socket connection for real-time updates
  const { isConnected } = useChat({
    onConversationUpdated: (data) => {
      // Update the conversation in list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? {
                ...conv,
                lastMessage: data.lastMessage,
                lastMessageAt: data.lastMessage.createdAt,
                unreadCount: conv.unreadCount + 1,
              }
            : conv
        )
      );
    },
    onMessagesRead: (data) => {
      // Update unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    },
  });

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

  // Initial load
  useEffect(() => {
    if (user && token) {
      fetchConversations();
    }
  }, [user, token]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (user && token) {
        fetchConversations(1, true);
      }
    }, [user, token])
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
      return conversation.jobSeeker.fullName;
    } else {
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
    const route = isEmployer
      ? '/(employer)/chat/[id]'
      : '/(user-hidden)/chat/[id]';

    navigation.navigate(route, {
      id: conversation.id,
      name: getDisplayName(conversation),
      jobTitle: conversation.job.title,
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
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
        </View>

        {/* Content */}
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

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection status */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>{t('chat.connecting')}</Text>
        </View>
      )}

      {/* Conversations list */}
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
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
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
