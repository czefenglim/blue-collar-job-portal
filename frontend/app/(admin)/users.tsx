'use client';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import VoiceTextInput from '@/components/VoiceTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  statusLabel?: string;
  isActive: boolean;
  createdAt: string;
  company?: {
    name: string;
    logo?: string;
    isVerified: boolean;
  };
  profile?: {
    id: number;
    profileCompleted: boolean;
    profilePicture?: string;
  };
  _count: {
    applications: number;
    createdJobs: number;
  };
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, page, currentLanguage]);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        lang: currentLanguage,
      });

      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await fetch(
        `${URL}/api/admin/users?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);

        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } else {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('adminToken');
          router.replace('/(admin-hidden)/login');
        }
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (
    userId: number,
    newStatus: string,
    userName: string
  ) => {
    Alert.alert(
      newStatus === 'SUSPENDED'
        ? t('adminUsers.actions.suspendUser')
        : newStatus === 'ACTIVE'
        ? t('adminUsers.actions.activateUser')
        : t('adminUsers.actions.deleteUser'),
      newStatus === 'SUSPENDED'
        ? t('adminUsers.actions.confirmSuspend', { name: userName })
        : newStatus === 'ACTIVE'
        ? t('adminUsers.actions.confirmActivate', { name: userName })
        : t('adminUsers.actions.confirmDelete', { name: userName }),
      [
        { text: t('adminUsers.actions.cancel'), style: 'cancel' },
        {
          text: t('adminUsers.actions.confirm'),
          style: newStatus === 'DELETED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${URL}/api/admin/users/${userId}/status`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: newStatus,
                    reason: `Updated by admin`,
                  }),
                }
              );

              const data = await response.json();

              if (response.ok && data.success) {
                Alert.alert(t('adminUsers.actions.success'), data.message);
                fetchUsers();
              } else {
                Alert.alert(t('adminUsers.actions.error'), data.message);
              }
            } catch (error) {
              console.error('Update status error:', error);
              Alert.alert(
                t('adminUsers.actions.error'),
                t('adminUsers.actions.updateFailed')
              );
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchUsers();
  };

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'EMPLOYER':
        return ['#1E3A8A', '#2563EB']; // Primary/Secondary Blue
      case 'JOB_SEEKER':
        return ['#1E3A8A', '#2563EB']; // Primary/Secondary Blue
      default:
        return ['#1E3A8A', '#2563EB']; // Primary/Secondary Blue
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          gradient: ['#10B981', '#059669'], // Green
          text: '#FFFFFF',
          icon: 'checkmark-circle',
        };
      case 'SUSPENDED':
        return {
          gradient: ['#F59E0B', '#D97706'], // Orange
          text: '#FFFFFF',
          icon: 'pause-circle',
        };
      case 'DELETED':
        return {
          gradient: ['#EF4444', '#DC2626'], // Red
          text: '#FFFFFF',
          icon: 'trash',
        };
      default:
        return {
          gradient: ['#6B7280', '#4B5563'], // Gray
          text: '#FFFFFF',
          icon: 'help-circle',
        };
    }
  };

  const renderUser = ({ item, index }: { item: User; index: number }) => {
    const statusColors = getStatusColors(item.status);
    const roleGradient = getRoleGradient(item.role);
    const daysAgo = Math.floor(
      (new Date().getTime() - new Date(item.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return (
      <Animated.View
        style={[
          styles.userCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* User Header with Gradient */}
        <LinearGradient colors={roleGradient} style={styles.userHeaderGradient}>
          <View style={styles.userHeader}>
            <View style={styles.userAvatarContainer}>
              {item.role === 'EMPLOYER' && item.company?.logo ? (
                <Image
                  source={{ uri: item.company.logo }}
                  style={styles.userAvatarImage}
                />
              ) : item.role === 'JOB_SEEKER' && item.profile?.profilePicture ? (
                <Image
                  source={{ uri: item.profile.profilePicture }}
                  style={styles.userAvatarImage}
                />
              ) : (
                <LinearGradient
                  colors={roleGradient}
                  style={styles.userAvatarPlaceholder}
                >
                  <Text style={styles.avatarText}>
                    {item.fullName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.fullName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {item.email}
              </Text>
            </View>

            <LinearGradient
              colors={statusColors.gradient}
              style={styles.statusBadge}
            >
              <Ionicons
                name={statusColors.icon as any}
                size={14}
                color={statusColors.text}
              />
              <Text style={styles.statusText}>
                {item.statusLabel || item.status}
              </Text>
            </LinearGradient>
          </View>
        </LinearGradient>

        {/* User Details */}
        <View style={styles.userContent}>
          <View style={styles.userMeta}>
            <View style={styles.metaRow}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.metaIconContainer}
              >
                <Ionicons name="briefcase-outline" size={16} color="#4B5563" />
              </LinearGradient>
              <Text style={styles.metaText}>
                {item.role === 'JOB_SEEKER'
                  ? t('adminUsers.filters.jobSeekers')
                  : t('adminUsers.filters.employers')}
              </Text>
            </View>

            {item.company && (
              <View style={styles.metaRow}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.metaIconContainer}
                >
                  <Ionicons name="business-outline" size={16} color="#4B5563" />
                </LinearGradient>
                <View style={styles.companyInfo}>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.company.name}
                  </Text>
                  {item.company.isVerified && (
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.verifiedBadge}
                    >
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </LinearGradient>
                  )}
                </View>
              </View>
            )}

            <View style={styles.metaRow}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.metaIconContainer}
              >
                <Ionicons name="calendar-outline" size={16} color="#4B5563" />
              </LinearGradient>
              <Text style={styles.metaText}>
                {daysAgo === 0
                  ? t('adminUsers.common.joinedToday')
                  : t('adminUsers.common.joinedDaysAgo', { days: daysAgo })}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.metaIconContainer}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={16}
                  color="#4B5563"
                />
              </LinearGradient>
              <Text style={styles.metaText}>
                {item.role === 'JOB_SEEKER'
                  ? `${item._count.applications} ${t(
                      'adminUsers.stats.applications'
                    )}`
                  : `${item._count.createdJobs} ${t(
                      'adminUsers.stats.jobsPosted'
                    )}`}
              </Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {item.role === 'JOB_SEEKER'
                  ? item._count.applications
                  : item._count.createdJobs}
              </Text>
              <Text style={styles.statLabel}>
                {item.role === 'JOB_SEEKER'
                  ? t('adminUsers.stats.applicationsLabel')
                  : t('adminUsers.stats.jobsLabel')}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {item.profile?.profileCompleted ? '100%' : '0%'}
              </Text>
              <Text style={styles.statLabel}>
                {t('adminUsers.stats.profile')}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {item.status === 'ACTIVE' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleUpdateStatus(item.id, 'SUSPENDED', item.fullName)
              }
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="ban-outline" size={18} color="#D97706" />
                <Text style={styles.suspendButtonText}>
                  {t('adminUsers.actions.suspend')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {item.status === 'SUSPENDED' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleUpdateStatus(item.id, 'ACTIVE', item.fullName)
              }
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#D1FAE5', '#A7F3D0']}
                style={styles.actionButtonGradient}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#059669"
                />
                <Text style={styles.activateButtonText}>
                  {t('adminUsers.actions.activate')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {item.status !== 'DELETED' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleUpdateStatus(item.id, 'DELETED', item.fullName)
              }
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text style={styles.deleteButtonText}>
                  {t('adminUsers.actions.delete')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#F8FAFC', '#F1F5F9']}
          style={styles.loadingBackground}
        >
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{t('adminUsers.loading')}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#2563eb', '#1e40af']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>
              {t('adminUsers.title') || 'User Management'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('adminUsers.subtitle')}
            </Text>
          </LinearGradient>
        </View>

        {/* Search Section */}
        <View style={styles.filtersSection}>
          <BlurView intensity={80} tint="light" style={styles.searchBlur}>
            <View style={styles.searchContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.searchIconContainer}
              >
                <Ionicons name="search" size={18} color="#4B5563" />
              </LinearGradient>

              <VoiceTextInput
                style={styles.voiceInputContainer}
                inputStyle={styles.voiceInput}
                placeholder={t('adminUsers.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={fetchUsers}
                language={
                  currentLanguage === 'zh'
                    ? 'zh-CN'
                    : currentLanguage === 'ms'
                    ? 'ms-MY'
                    : currentLanguage === 'ta'
                    ? 'ta-IN'
                    : 'en-US'
                }
              />

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.clearButton}
                >
                  <LinearGradient
                    colors={['#F3F4F6', '#E5E7EB']}
                    style={styles.clearIconContainer}
                  >
                    <Ionicons name="close-circle" size={18} color="#4B5563" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>

          {/* Role Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>
              {t('adminUsers.filters.title')}
            </Text>
            <View style={styles.filterRow}>
              {['', 'JOB_SEEKER', 'EMPLOYER'].map((role) => {
                const isActive = roleFilter === role;
                return (
                  <TouchableOpacity
                    key={role || 'all'}
                    style={styles.filterButton}
                    onPress={() => setRoleFilter(role)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={
                        isActive
                          ? ['#1E3A8A', '#2563EB']
                          : ['#F3F4F6', '#E5E7EB']
                      }
                      style={styles.filterButtonGradient}
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          isActive && styles.filterButtonTextActive,
                        ]}
                      >
                        {role === 'JOB_SEEKER'
                          ? t('adminUsers.filters.jobSeekers')
                          : role === 'EMPLOYER'
                          ? t('adminUsers.filters.employers')
                          : t('adminUsers.filters.all')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {t('adminUsers.empty.title') || 'No Users Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {roleFilter
                  ? roleFilter === 'JOB_SEEKER'
                    ? t('adminUsers.empty.noJobSeekers')
                    : t('adminUsers.empty.noEmployers')
                  : t('adminUsers.empty.noCriteria')}
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  filtersSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 52,
    gap: 12,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInputContainer: {
    flex: 1,
  },
  voiceInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    marginTop: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  userHeaderGradient: {
    padding: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userContent: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userMeta: {
    gap: 12,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suspendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
});
