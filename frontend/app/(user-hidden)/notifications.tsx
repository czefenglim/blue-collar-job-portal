import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: string | null;
  createdAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const NotificationsScreen: React.FC = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const router = useRouter();

  useEffect(() => {
    loadNotifications();
  }, [pagination.page]);

  useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    router.setParams({ unreadCount });
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        Alert.alert(
          t('applications.authenticationRequired'),
          t('applications.pleaseSignIn'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.replace('/'),
            },
          ]
        );
        return;
      }

      const response = await fetch(
        `${URL}/api/notifications?page=${pagination.page}&limit=${pagination.limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data);
        setPagination(data.pagination);
      } else {
        Alert.alert(t('common.error'), t('notifications.errors.loadFailed'));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert(t('common.error'), t('notifications.errors.loadFailed'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadNotifications();
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      await fetch(`${URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true }))
        );
        Alert.alert(t('common.success'), t('notifications.success.allRead'));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert(t('common.error'), t('notifications.errors.markAllFailed'));
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(
        `${URL}/api/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert(t('common.error'), t('notifications.errors.deleteFailed'));
    }
  };

  const deleteAllNotifications = async () => {
    Alert.alert(
      t('notifications.deleteAllTitle'),
      t('notifications.deleteAllConfirm'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');
              const response = await fetch(`${URL}/api/notifications`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                setNotifications([]);
                Alert.alert(
                  t('common.success'),
                  t('notifications.success.allDeleted')
                );
              }
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              Alert.alert(
                t('common.error'),
                t('notifications.errors.deleteAllFailed')
              );
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
      console.log('Navigating to:', notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      JOB_MATCH: 'briefcase',
      APPLICATION_UPDATE: 'document-text',
      NEW_MESSAGE: 'chatbubble',
      PROFILE_UPDATE: 'person',
      SYSTEM_UPDATE: 'information-circle',
    };
    return icons[type] || 'notifications';
  };

  const getNotificationColor = (type: string) => {
    const colors: { [key: string]: string } = {
      JOB_MATCH: '#10B981',
      APPLICATION_UPDATE: '#3B82F6',
      NEW_MESSAGE: '#8B5CF6',
      PROFILE_UPDATE: '#F59E0B',
      SYSTEM_UPDATE: '#64748B',
    };
    return colors[type] || '#64748B';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t('notifications.time.now');
    if (minutes < 60)
      return t('notifications.time.minutesAgo', { count: minutes });
    if (hours < 24) return t('notifications.time.hoursAgo', { count: hours });
    if (days < 7) return t('notifications.time.daysAgo', { count: days });
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationColor(item.type) + '20' },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type) as any}
            size={24}
            color={getNotificationColor(item.type)}
          />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
            {item.actionUrl && (
              <View style={styles.actionIndicator}>
                <Ionicons name="arrow-forward" size={14} color="#1E3A8A" />
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            deleteNotification(item.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header removed, now handled in layout */}

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={markAllAsRead}
            >
              <Ionicons name="checkmark-done" size={18} color="#1E3A8A" />
              <Text style={styles.actionButtonText}>
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAllButton]}
            onPress={deleteAllNotifications}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.deleteAllButtonText]}>
              {t('notifications.deleteAll')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={80}
              color="#CBD5E1"
            />
            <Text style={styles.emptyText}>
              {t('notifications.emptyTitle')}
            </Text>
            <Text style={styles.emptySubtext}>
              {t('notifications.emptySubtitle')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  deleteAllButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteAllButtonText: {
    color: '#EF4444',
  },
  listContainer: {
    paddingVertical: 12,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
