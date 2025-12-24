import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/utils/pushNotifications';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';
const { width } = Dimensions.get('window');

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  totalApplicants: number;
  pendingApplicants: number;
  shortlistedApplicants: number;
  recentJobs: {
    id: number;
    title: string;
    status: string;
    applicants: number;
    createdAt: string;
  }[];
  companyName: string;
}

// Add this interface
interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: {
    id: number;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: string;
    user: {
      fullName: string;
    };
  }[];
}

export default function EmployerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = React.useRef<any>(null);
  const responseListener = React.useRef<any>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      const response = await fetch(`${URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.data.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData || '{}');

      console.log('Token:', token);
      console.log('User ID:', user.id);
      if (!token || !user.id) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(`${URL}/api/employer/dashboard`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch dashboard data');
      }

      setStats(data.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchReviewStats = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      const response = await fetch(`${URL}/api/reviews/employer/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReviewStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  }, []);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={16}
          color="#F59E0B"
        />
      );
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  const renderStatCard = (
    icon: string,
    label: string,
    value: number,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <View style={[styles.statIconBg, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchReviewStats();
  }, [fetchReviewStats]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  useEffect(() => {
    registerForPushNotificationsAsync();
    loadUnreadCount();
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        loadUnreadCount();
      });
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data.actionUrl) {
          router.push(data.actionUrl as any);
        }
      });
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router, loadUnreadCount]);

  const renderQuickAction = (
    icon: string,
    label: string,
    onPress: () => void,
    color: string
  ) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>
            {t('employerDashboard.loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || t('employerDashboard.loadFailed')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchDashboardData}
          >
            <Text style={styles.retryButtonText}>
              {t('employerDashboard.tryAgain')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>
              {t('employerDashboard.welcomeBack')}
            </Text>
            <Text style={styles.companyName}>{stats.companyName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.pricingButton}
              onPress={() => router.push('/(employer-hidden)/pricing')}
            >
              <Text style={styles.pricingButtonText}>
                {t('employerDashboard.pricing') || 'Pricing'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/(employer-hidden)/notifications')}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#1E3A8A"
              />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'briefcase',
            t('employerDashboard.totalJobs'),
            stats.totalJobs,
            '#1E3A8A',
            t('employerDashboard.activeCount', { count: stats.activeJobs })
          )}
          {renderStatCard(
            'checkmark-circle',
            t('employerDashboard.activeJobs'),
            stats.activeJobs,
            '#10B981',
            t('employerDashboard.currentlyHiring')
          )}
          {renderStatCard(
            'people',
            t('employerDashboard.totalApplicants'),
            stats.totalApplicants,
            '#F59E0B',
            t('employerDashboard.pendingCount', {
              count: stats.pendingApplicants,
            })
          )}
          {renderStatCard(
            'star',
            t('employerDashboard.shortlisted'),
            stats.shortlistedApplicants,
            '#8B5CF6',
            t('employerDashboard.topCandidates')
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerDashboard.quickActions')}
          </Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction(
              'add-circle',
              t('employerDashboard.postNewJob'),
              () => router.push('/(employer-hidden)/create-job'),
              '#1E3A8A'
            )}
            {renderQuickAction(
              'people-outline',
              t('employerDashboard.viewApplicants'),
              () => router.push('/(employer)/applicants'),
              '#10B981'
            )}
            {renderQuickAction(
              'eye-outline',
              t('employerDashboard.previewJobs'),
              () => router.push('/(employer)/job-posts'),
              '#F59E0B'
            )}
            {renderQuickAction(
              'settings-outline',
              t('employerDashboard.settings'),
              () => router.push('/(employer)/profile'),
              '#64748B'
            )}
          </View>
        </View>

        {/* Recent Job Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('employerDashboard.recentJobPosts')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(employer)/job-posts')}
            >
              <Text style={styles.viewAllText}>
                {t('employerDashboard.viewAll')}
              </Text>
            </TouchableOpacity>
          </View>

          {stats.recentJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>
                {t('employerDashboard.noJobPostsYet')}
              </Text>
              <TouchableOpacity
                style={styles.createJobButton}
                onPress={() => router.push('/(employer-hidden)/create-job')}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createJobButtonText}>
                  {t('employerDashboard.createYourFirstJob')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            stats.recentJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() =>
                  router.push(
                    `/(employer-hidden)/job-post-details/${job.id}` as Href
                  )
                }
              >
                <View style={styles.jobCardHeader}>
                  <Text style={styles.jobTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          job.status === 'ACTIVE' ? '#10B98115' : '#64748B15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            job.status === 'ACTIVE' ? '#10B981' : '#64748B',
                        },
                      ]}
                    >
                      {job.status === 'ACTIVE'
                        ? t('employerDashboard.active')
                        : t('employerDashboard.closed')}
                    </Text>
                  </View>
                </View>
                <View style={styles.jobCardFooter}>
                  <View style={styles.jobStat}>
                    <Ionicons name="people-outline" size={16} color="#64748B" />
                    <Text style={styles.jobStatText}>
                      {t('employerDashboard.applicants', {
                        count: job.applicants,
                      })}
                    </Text>
                  </View>
                  <View style={styles.jobStat}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#64748B"
                    />
                    <Text style={styles.jobStatText}>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Company Reviews Section - ADD THIS */}
        {reviewStats && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('employerDashboard.companyReviews')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(employer-hidden)/reviews')}
              >
                <Text style={styles.viewAllText}>
                  {t('employerDashboard.manageReviews')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rating Summary Card */}
            <View style={styles.reviewSummaryCard}>
              <View style={styles.reviewSummaryLeft}>
                <Text style={styles.ratingNumber}>
                  {reviewStats.averageRating.toFixed(1)}
                </Text>
                {renderStars(reviewStats.averageRating)}
                <Text style={styles.totalReviewsText}>
                  {t('employerDashboard.totalReviews', {
                    count: reviewStats.totalReviews,
                  })}
                </Text>
              </View>

              <View style={styles.reviewSummaryRight}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    reviewStats.ratingCounts[
                      star as keyof typeof reviewStats.ratingCounts
                    ];
                  const percentage =
                    reviewStats.totalReviews > 0
                      ? (count / reviewStats.totalReviews) * 100
                      : 0;

                  return (
                    <View key={star} style={styles.ratingBar}>
                      <Text style={styles.ratingBarLabel}>{star}★</Text>
                      <View style={styles.ratingBarTrack}>
                        <View
                          style={[
                            styles.ratingBarFill,
                            { width: `${percentage}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.ratingBarCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Recent Reviews */}
            {reviewStats.recentReviews.length > 0 && (
              <>
                <Text style={styles.recentReviewsTitle}>
                  {t('employerDashboard.recentReviews')}
                </Text>
                {reviewStats.recentReviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewUserInfo}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {review.user.fullName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.reviewUserName}>
                            {review.user.fullName}
                          </Text>
                          <View style={styles.reviewStars}>
                            {renderStars(review.rating)}
                          </View>
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.title && (
                      <Text style={styles.reviewTitle}>{review.title}</Text>
                    )}
                    {review.comment && (
                      <Text style={styles.reviewComment} numberOfLines={2}>
                        {review.comment}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}

            {reviewStats.totalReviews === 0 && (
              <View style={styles.noReviewsCard}>
                <Ionicons name="star-outline" size={48} color="#CBD5E1" />
                <Text style={styles.noReviewsText}>
                  {t('employerDashboard.noReviewsYet')}
                </Text>
                <Text style={styles.noReviewsSubtext}>
                  {t('employerDashboard.noReviewsMessage')}
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={24} color="#F59E0B" />
            <Text style={styles.tipsTitle}>
              {t('employerDashboard.tipsTitle')}
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{t('employerDashboard.tip1')}</Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{t('employerDashboard.tip2')}</Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>{t('employerDashboard.tip3')}</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingButton: {
    marginRight: 12,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewAllText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
  },
  createJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createJobButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobStatText: {
    fontSize: 14,
    color: '#64748B',
  },
  tipsSection: {
    padding: 20,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    margin: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  reviewSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewSummaryLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    marginRight: 20,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  totalReviewsText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  reviewSummaryRight: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingBarLabel: {
    width: 30,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  ratingBarCount: {
    width: 25,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },
  recentReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  reviewComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  noReviewsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
});
