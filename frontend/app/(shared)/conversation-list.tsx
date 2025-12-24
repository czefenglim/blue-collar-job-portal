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
import { useChat } from '@/hooks/useChat';
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

// Color palette
const PRIMARY_BLUE = '#1E40AF';
const ACCENT_GREEN = '#10B981';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const TEXT_TERTIARY = '#94A3B8';
const BORDER_COLOR = '#E2E8F0';

const ConversationsListScreen: React.FC = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const isEmployer = user?.role === 'EMPLOYER';

  const loadUserData = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!userToken || !userData) {
        Alert.alert(t('common.error'), 'Please login to continue');
        navigation.goBack();
        return;
      }

      setToken(userToken);
      setUser(JSON.parse(userData));
      setUserLoaded(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t('common.error'), 'Failed to load user data');
    }
  }, [t, navigation]);

  // Load user data and token FIRST
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Fetch and upsert a single conversation by id
  const upsertConversationFromServer = useCallback(
    async (conversationId: number) => {
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
    },
    [token]
  );

  // Fetch conversations
  const fetchConversations = useCallback(
    async (pageNum: number = 1, refresh: boolean = false) => {
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

            // Update header with count
            if (navigation && pageNum === 1) {
              navigation.setParams({ conversationCount: data.data.length });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, navigation]
  );

  const handleConversationUpdated = useCallback((data: any) => {
    console.log('📝 Conversation updated in ChatScreen:', data);
  }, []);

  const handleMessagesRead = useCallback(
    (data: { conversationId: number; readBy: number; count: number }) => {
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
      setConversations((prev) => {
        let found = false;
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            found = true;
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
          upsertConversationFromServer(message.conversationId);
        }

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
    [user?.id, upsertConversationFromServer]
  );

  const handleMessageEdited = useCallback((message: any) => {
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
                  ...conv.lastMessage,
                  content: message.content,
                  createdAt: message.updatedAt || message.createdAt,
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
                  ...conv.lastMessage,
                  content: '',
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

  // Socket connection
  const { isConnected } = useChat({
    onConversationUpdated: userLoaded ? handleConversationUpdated : undefined,
    onMessagesRead: userLoaded ? handleMessagesRead : undefined,
    onNewMessage: userLoaded ? handleNewMessage : undefined,
    onMessageEdited: userLoaded ? handleMessageEdited : undefined,
    onMessageDeleted: userLoaded ? handleMessageDeleted : undefined,
    onError: handleSocketError,
  });

  useEffect(() => {
    if (navigation) {
      navigation.setParams({
        conversationCount: conversations.length,
        isConnected,
      });
    }
  }, [conversations.length, isConnected, navigation]);

  // Initial load - Only after user is loaded
  useEffect(() => {
    if (userLoaded && user && token) {
      fetchConversations();
    }
  }, [userLoaded, user, token, fetchConversations]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (userLoaded && user && token) {
        fetchConversations(1, true);
      }
    }, [userLoaded, user, token, fetchConversations])
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

  // Get message icon
  const getMessageIcon = (messageType: string, isOwnMessage: boolean) => {
    if (isOwnMessage) {
      return (
        <Ionicons name="checkmark-done" size={16} color={TEXT_SECONDARY} />
      );
    }

    switch (messageType) {
      case 'IMAGE':
        return <Ionicons name="image" size={16} color={TEXT_SECONDARY} />;
      case 'FILE':
        return (
          <Ionicons name="document-attach" size={16} color={TEXT_SECONDARY} />
        );
      default:
        return null;
    }
  };

  // Navigate to chat
  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: '/(shared)/chat/[id]',
      params: {
        id: conversation.id.toString(),
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
    const isOwnMessage = item.lastMessage?.senderId === user?.id;
    const messageIcon = item.lastMessage
      ? getMessageIcon(item.lastMessage.messageType, isOwnMessage)
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          hasUnread && styles.unreadCard,
          !item.lastMessage && styles.noMessageCard,
        ]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* Status Indicator */}
        <View style={styles.statusIndicator}>
          {hasUnread ? (
            <View style={styles.unreadIndicator}>
              <View style={styles.unreadDot} />
            </View>
          ) : (
            <View style={styles.readIndicator} />
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name={isEmployer ? 'person' : 'business'}
                size={24}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* Conversation Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <View style={styles.nameContainer}>
              <Text
                style={[styles.displayName, hasUnread && styles.unreadName]}
              >
                {displayName}
              </Text>
              {item.isActive && (
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>{t('chat.active')}</Text>
                </View>
              )}
            </View>
            {item.lastMessageAt && (
              <Text style={styles.timestamp}>
                {formatTime(item.lastMessageAt)}
              </Text>
            )}
          </View>

          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job.title}
          </Text>

          <View style={styles.lastMessageContainer}>
            {messageIcon && (
              <View style={styles.messageIcon}>{messageIcon}</View>
            )}
            <Text
              style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
              numberOfLines={1}
            >
              {lastMessagePreview}
            </Text>

            {/* Message Status */}
            {item.lastMessage && (
              <View style={styles.messageStatus}>
                {isOwnMessage && (
                  <Ionicons
                    name={
                      item.lastMessage.isRead ? 'checkmark-done' : 'checkmark'
                    }
                    size={14}
                    color={
                      item.lastMessage.isRead ? ACCENT_GREEN : TEXT_TERTIARY
                    }
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Unread Count Badge */}
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color={TEXT_TERTIARY} />
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color={BORDER_COLOR} />
        </View>
        <Text style={styles.emptyTitle}>{t('chat.noConversations')}</Text>
        <Text style={styles.emptySubtitle}>
          {isEmployer
            ? t('chat.startChatWithApplicants')
            : t('chat.waitForEmployerMessage')}
        </Text>
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          <Text style={styles.emptyActionText}>{t('chat.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render footer (loading indicator)
  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={PRIMARY_BLUE} />
        <Text style={styles.footerText}>{t('chat.loadingMore')}</Text>
      </View>
    );
  };

  // Show loading until user is loaded
  if (!userLoaded || (loading && conversations.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
        <Text style={styles.loadingText}>{t('chat.loadingConversations')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={PRIMARY_BLUE} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="chatbubbles" size={24} color={PRIMARY_BLUE} />
            <Text style={styles.headerTitle}>{t('chat.messages')}</Text>
            <View style={styles.conversationCountBadge}>
              <Text style={styles.conversationCount}>
                {conversations.length}
              </Text>
            </View>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

       
        {!isConnected && (
          <View style={styles.connectionBanner}>
            <Ionicons name="wifi" size={16} color="#92400e" />
            <Text style={styles.connectionText}>{t('chat.connecting')}</Text>
          </View>
        )}
      </View> */}

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[PRIMARY_BLUE]}
            tintColor={PRIMARY_BLUE}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyList : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Header
  header: {
    backgroundColor: CARD_BACKGROUND,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  conversationCountBadge: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
  },
  conversationCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 8,
  },
  connectionText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
  // List Container
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  // Conversation Card
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#DBEAFE',
    borderWidth: 1.5,
  },
  noMessageCard: {
    opacity: 0.8,
  },
  // Status Indicator
  statusIndicator: {
    position: 'absolute',
    left: 8,
    top: 16,
  },
  unreadIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_BLUE,
  },
  readIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEXT_TERTIARY,
  },
  // Avatar
  avatarContainer: {
    marginRight: 16,
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Conversation Content
  conversationContent: {
    flex: 1,
    marginRight: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  unreadName: {
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT_GREEN,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  timestamp: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    fontWeight: '500',
    flexShrink: 0,
  },
  jobTitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    fontWeight: '500',
  },
  // Last Message
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    flex: 1,
    flexShrink: 1,
  },
  unreadMessage: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  messageStatus: {
    marginLeft: 4,
  },
  // Unread Badge
  unreadBadge: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Chevron
  chevronContainer: {
    width: 20,
  },
  // Footer Loader
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  footerText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: CARD_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ConversationsListScreen;
