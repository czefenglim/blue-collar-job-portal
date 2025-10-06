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
import { useLanguage } from '@/contexts/LanguageContext';
import i18n from '@/locales/i18n';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Application {
  id: number;
  status: string;
  appliedAt: string;
  updatedAt: string;
  job: {
    id: number;
    title: string;
    slug: string;
    company: {
      id: number;
      name: string;
      logo?: string;
    };
    industry: {
      id: number;
      name: string;
      slug: string;
    };
    city: string;
    state: string;
    jobType: string;
    workingHours: string;
    experienceLevel: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryType?: string;
    createdAt: string;
  };
}

const AppliedJobsScreen: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [token, setToken] = useState<string>('');

  const router = useRouter();
  const { t } = useLanguage();

  const statusFilters = [
    { key: 'ALL', label: t('applications.filters.all') },
    { key: 'PENDING', label: t('applications.filters.pending') },
    { key: 'REVIEWING', label: t('applications.filters.reviewing') },
    { key: 'SHORTLISTED', label: t('applications.filters.shortlisted') },
    { key: 'INTERVIEW_SCHEDULED', label: t('applications.filters.interview') },
    { key: 'REJECTED', label: t('applications.filters.rejected') },
  ];

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('applications.authenticationRequired'),
          t('applications.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);
      await fetchApplications(userToken);
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert(t('common.error'), t('applications.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplications = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/jobs/applications/list`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.data);
      } else {
        throw new Error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchApplications(token);
    } catch (error) {
      Alert.alert(t('common.error'), t('applications.errors.refreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'REVIEWING':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' };
      case 'SHORTLISTED':
        return { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE' };
      case 'INTERVIEW_SCHEDULED':
        return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
      case 'INTERVIEWED':
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      case 'HIRED':
        return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
      case 'WITHDRAWN':
        return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: t('applications.status.pending'),
      REVIEWING: t('applications.status.reviewing'),
      SHORTLISTED: t('applications.status.shortlisted'),
      INTERVIEW_SCHEDULED: t('applications.status.interviewScheduled'),
      INTERVIEWED: t('applications.status.interviewed'),
      REJECTED: t('applications.status.rejected'),
      HIRED: t('applications.status.hired'),
      WITHDRAWN: t('applications.status.withdrawn'),
    };

    return (
      statusMap[status] ||
      status
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('time.today');
    if (diffDays === 2) return t('time.yesterday');
    if (diffDays <= 7) return t('time.daysAgo', { days: diffDays });
    if (diffDays <= 30)
      return t('time.weeksAgo', { weeks: Math.floor(diffDays / 7) });
    return t('time.monthsAgo', { months: Math.floor(diffDays / 30) });
  };

  const formatJobType = (type: string) => {
    const formatted = type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const translationMap: { [key: string]: string } = {
      'Full Time': t('jobTypes.fullTime'),
      'Part Time': t('jobTypes.partTime'),
      Contract: t('jobTypes.contract'),
      Temporary: t('jobTypes.temporary'),
      Internship: t('jobTypes.internship'),
    };

    return translationMap[formatted] || formatted;
  };

  const formatWorkingHours = (hours: string) => {
    const formatted = hours
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const translationMap: { [key: string]: string } = {
      'Day Shift': t('workingHours.dayShift'),
      'Night Shift': t('workingHours.nightShift'),
      'Rotating Shift': t('workingHours.rotatingShift'),
      Flexible: t('workingHours.flexible'),
      'Weekend Only': t('workingHours.weekendOnly'),
    };

    return translationMap[formatted] || formatted;
  };

  const formatAppliedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFilteredApplications = () => {
    if (selectedFilter === 'ALL') {
      return applications;
    }
    return applications.filter((app) => app.status === selectedFilter);
  };

  const filteredApplications = getFilteredApplications();

  const renderApplicationCard = ({ item }: { item: Application }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.applicationCard}
        onPress={() =>
          router.push({
            pathname: '/JobDetailsScreen/[slug]',
            params: { slug: item.job.slug },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.companyLogoContainer}>
            <Text style={styles.companyLogoText}>
              {item.job.company.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusColors.bg,
                  borderColor: statusColors.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {formatStatus(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.job.title}
        </Text>

        <View style={styles.jobMetaContainer}>
          <View style={styles.jobMetaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.job.industry.name}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatJobType(item.job.jobType)}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatWorkingHours(item.job.workingHours)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.companyName} numberOfLines={1}>
          {item.job.company.name}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.job.city}, {item.job.state}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.appliedLabel}>
              {t('applications.applied')}{' '}
            </Text>
            <Text style={styles.appliedDate}>
              {formatAppliedDate(item.appliedAt)}
            </Text>
          </View>
          {item.updatedAt !== item.appliedAt && (
            <Text style={styles.updatedText}>
              {t('applications.updated')} {getTimeAgo(item.updatedAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>
        {selectedFilter === 'ALL'
          ? t('applications.emptyState.noApplications')
          : t('applications.emptyState.noFilteredApplications', {
              status: formatStatus(selectedFilter),
            })}
      </Text>
      <Text style={styles.emptyText}>
        {selectedFilter === 'ALL'
          ? t('applications.emptyState.description')
          : t('applications.emptyState.filteredDescription')}
      </Text>
      {selectedFilter === 'ALL' && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/HomeScreen')}
        >
          <Text style={styles.browseButtonText}>
            {t('applications.emptyState.browseButton')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('applications.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('applications.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('applications.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {applications.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {t('applications.stats', {
              filtered: filteredApplications.length,
              total: applications.length,
              application:
                applications.length === 1
                  ? t('applications.application')
                  : t('applications.applications'),
            })}
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      {applications.length > 0 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={statusFilters}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedFilter === item.key && styles.filterTabActive,
                ]}
                onPress={() => setSelectedFilter(item.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    selectedFilter === item.key && styles.filterTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderApplicationCard}
        contentContainerStyle={[
          styles.applicationList,
          filteredApplications.length === 0 && styles.applicationListEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
          />
        }
        ListEmptyComponent={renderEmptyState}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerPlaceholder: {
    width: 40,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#1E3A8A',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  applicationList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  applicationListEmpty: {
    flexGrow: 1,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 24,
  },
  jobMetaContainer: {
    marginBottom: 12,
  },
  jobMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  appliedDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  updatedText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AppliedJobsScreen;
