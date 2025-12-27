'use client';

import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Analytics {
  totalJobSeekers: number;
  totalEmployers: number;
  totalJobs: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recentActivity: {
    newUsers: number;
    newJobs: number;
    newApplications: number;
  };
  reviewStats?: {
    totalReviews: number;
    averageRating: number;
    flaggedReviews: number;
  };
  companyStats?: {
    total: number;
    verified: number;
    pending: number;
    disabled: number;
  };
}

export default function AdminDashboardScreen() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  const fetchAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const response = await fetch(`${URL}/api/admin/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAnalytics(data.data);
      } else {
        // Token invalid or expired
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('adminToken');
          await AsyncStorage.removeItem('isAdmin');
          router.replace('/(admin-hidden)/login');
        }
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('adminToken');
    await AsyncStorage.removeItem('isAdmin');
    router.replace('/(admin-hidden)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>{t('adminDashboard.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#1E3A8A"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#2563eb', '#1e40af']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>
                {t('adminDashboard.header.title')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('adminDashboard.header.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Navigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('adminDashboard.quickAccess.title')}
        </Text>
        <View style={styles.quickNav}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/(admin)/users')}
          >
            <Ionicons name="people" size={32} color="#1E3A8A" />
            <Text style={styles.navCardTitle}>
              {t('adminDashboard.quickAccess.users')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/(admin)/job-management')}
          >
            <Ionicons name="briefcase" size={32} color="#1E3A8A" />
            <Text style={styles.navCardTitle}>
              {t('adminDashboard.quickAccess.jobs')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/(admin-hidden)/companies/page')}
          >
            <Ionicons name="business" size={32} color="#1E3A8A" />
            <Text style={styles.navCardTitle}>
              {t('adminDashboard.quickAccess.companies')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('adminDashboard.userStats.title')}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="person" size={24} color="#1E3A8A" />
            <Text style={styles.statValue}>{analytics?.totalJobSeekers}</Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.userStats.jobSeekers')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="business" size={24} color="#15803D" />
            <Text style={styles.statValue}>{analytics?.totalEmployers}</Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.userStats.employers')}
            </Text>
          </View>
        </View>
      </View>

      {/* Company Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('adminDashboard.company.title')}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="business-outline" size={24} color="#475569" />
            <Text style={styles.statValue}>
              {analytics?.companyStats?.total || analytics?.totalEmployers || 0}
            </Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.company.total')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#15803D" />
            <Text style={styles.statValue}>
              {analytics?.companyStats?.verified || 0}
            </Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.company.verified')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="time-outline" size={24} color="#F97316" />
            <Text style={styles.statValue}>
              {analytics?.companyStats?.pending || 0}
            </Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.company.pending')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name="ban" size={24} color="#64748B" />
            <Text style={styles.statValue}>
              {analytics?.companyStats?.disabled || 0}
            </Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.company.disabled')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push('/(admin-hidden)/companies/page')}
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.manageButtonText}>
            {t('adminDashboard.company.manageCta')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Job Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('adminDashboard.stats.jobs')}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="briefcase-outline" size={24} color="#475569" />
            <Text style={styles.statValue}>{analytics?.totalJobs.total}</Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.stats.totalJobs')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="time-outline" size={24} color="#F97316" />
            <Text style={styles.statValue}>{analytics?.totalJobs.pending}</Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.stats.pending')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color="#15803D"
            />
            <Text style={styles.statValue}>
              {analytics?.totalJobs.approved}
            </Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.stats.approved')}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="close-circle-outline" size={24} color="#DC2626" />
            <Text style={styles.statValue}>
              {analytics?.totalJobs.rejected}
            </Text>
            <Text style={styles.statLabel}>
              {t('adminDashboard.stats.rejected')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push('/(admin-hidden)/job-statistics')}
        >
          <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
          <Text style={styles.manageButtonText}>View More Statistics</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('adminDashboard.recent.title')}
        </Text>
        <View style={styles.activityCard}>
          <View style={styles.activityRow}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-add" size={20} color="#1E3A8A" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>
                {t('adminDashboard.recent.newUsers')}
              </Text>
              <Text style={styles.activityValue}>
                {analytics?.recentActivity.newUsers}{' '}
                {t('adminDashboard.recent.registered')}
              </Text>
            </View>
          </View>

          <View style={styles.activityRow}>
            <View style={styles.activityIcon}>
              <Ionicons name="briefcase-outline" size={20} color="#1E3A8A" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>
                {t('adminDashboard.recent.newJobs')}
              </Text>
              <Text style={styles.activityValue}>
                {analytics?.recentActivity.newJobs}{' '}
                {t('adminDashboard.recent.posted')}
              </Text>
            </View>
          </View>

          <View style={[styles.activityRow, { borderBottomWidth: 0 }]}>
            <View style={styles.activityIcon}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#1E3A8A"
              />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>
                {t('adminDashboard.recent.newApplications')}
              </Text>
              <Text style={styles.activityValue}>
                {analytics?.recentActivity.newApplications}{' '}
                {t('adminDashboard.recent.submitted')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Review Statistics */}
      {analytics?.reviewStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('adminDashboard.reviews.title')}
          </Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>
                {analytics.reviewStats.totalReviews}
              </Text>
              <Text style={styles.statLabel}>
                {t('adminDashboard.reviews.total')}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="star-half" size={24} color="#1E3A8A" />
              <Text style={styles.statValue}>
                {analytics.reviewStats.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>
                {t('adminDashboard.reviews.average')}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flag" size={24} color="#DC2626" />
              <Text style={styles.statValue}>
                {analytics.reviewStats.flaggedReviews}
              </Text>
              <Text style={styles.statLabel}>
                {t('adminDashboard.reviews.flagged')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => router.push('/(admin-hidden)/review-moderation')}
          >
            <Text style={styles.manageButtonText}>
              {t('adminDashboard.reviews.manage')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Subscription Plans Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push('/(admin-hidden)/subscription')}
        >
          <Text style={styles.manageButtonText}>Manage Plans</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  quickNav: {
    flexDirection: 'row',
    gap: 12,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  activityValue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
