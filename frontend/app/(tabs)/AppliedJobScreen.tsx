import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

// --- Theme/Style Constants (aligned with HomeScreen) ---
const PRIMARY_BLUE = '#0D47A1';
const ACCENT_ORANGE = '#FF9800';
const GRAY_TEXT = '#455A64';
const LIGHT_BACKGROUND = '#F5F5F5';
const CARD_BACKGROUND = '#FFFFFF';
const BORDER_COLOR = '#E0E0E0';
const SPACING = 16;
const CARD_PADDING = 20;

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
  const { t, currentLanguage } = useLanguage();

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

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [])
  );

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
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';

      const response = await fetch(
        `${URL}/api/jobs/applications/list?lang=${lang}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

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

  const handleReport = (jobId: number, jobTitle: string) => {
    router.push({
      pathname: '../(user-hidden)/report-job',
      params: { jobId: jobId.toString(), jobTitle },
    });
  };

  const showOptionsMenu = (item: Application) => {
    Alert.alert(t('applications.options'), t('applications.selectAction'), [
      {
        text: t('applications.viewDetails'),
        onPress: () =>
          router.push({
            pathname: '/JobDetailsScreen/[slug]',
            params: { slug: item.job.slug },
          }),
      },
      {
        text: t('applications.reportJob'),
        onPress: () => handleReport(item.job.id, item.job.title),
        style: 'destructive',
      },
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
    ]);
  };

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

  const formatExperienceLevel = (level: string) => {
    const formatted = level
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const translationMap: { [key: string]: string } = {
      'Entry Level': t('experienceLevels.entry'),
      'Mid Level': t('experienceLevels.midLevel'),
      Senior: t('experienceLevels.senior'),
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

  const formatSalary = (min?: number, max?: number, type?: string) => {
    if (!min && !max) return t('home.notSpecified');

    const formatAmount = (amount: number) => {
      return `RM ${amount.toLocaleString(
        currentLanguage === 'ms' ? 'ms-MY' : 'en-US'
      )}`;
    };

    const typeLabel = type ? t(`salaryTypes.${type.toLowerCase()}`) : '';

    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? ` / ${typeLabel}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${type ? ` / ${typeLabel}` : ''}`;
  };

  const getFilteredApplications = () => {
    if (selectedFilter === 'ALL') {
      return applications;
    }
    return applications.filter((app) => app.status === selectedFilter);
  };

  const filteredApplications = getFilteredApplications();

  const renderApplicationCard = ({ item }: { item: Application }) => {
    return (
      <View style={styles.jobCard}>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() =>
            router.push({
              pathname: '/JobDetailsScreen/[slug]',
              params: { slug: item.job.slug },
            })
          }
          activeOpacity={0.9}
        >
          {/* Top Row: Company Logo + Title */}
          <View style={styles.jobCardHeader}>
            <View style={styles.companyLogoContainer}>
              {item.job.company.logo ? (
                <Image
                  source={{ uri: item.job.company.logo }}
                  style={styles.companyLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Text style={styles.companyLogoText}>
                    {item.job.company.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerTextContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.jobTitle} numberOfLines={2}>
                  {item.job.title}
                </Text>
              </View>
              <Text style={styles.companyName}>{item.job.company.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.job.city}, {item.job.state}
                </Text>
                <Text style={styles.timeAgo}>
                  {t('applications.applied')} {getTimeAgo(item.appliedAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Salary Row - Changed to blue theme */}
          <View style={styles.salaryContainer}>
            <Ionicons name="cash-outline" size={20} color={PRIMARY_BLUE} />
            <Text style={styles.salaryText}>
              {formatSalary(
                item.job.salaryMin,
                item.job.salaryMax,
                item.job.salaryType
              )}
            </Text>
          </View>

          {/* Job Details Grid */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={16} color={PRIMARY_BLUE} />
              </View>
              <Text style={styles.detailLabel}>{t('home.jobType')}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {formatJobType(item.job.jobType)}
              </Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={PRIMARY_BLUE}
                />
              </View>
              <Text style={styles.detailLabel}>{t('home.workingHours')}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {formatWorkingHours(item.job.workingHours)}
              </Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons
                  name="trending-up-outline"
                  size={16}
                  color={PRIMARY_BLUE}
                />
              </View>
              <Text style={styles.detailLabel}>
                {t('home.experienceLevel')}
              </Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {formatExperienceLevel(item.job.experienceLevel)}
              </Text>
            </View>
          </View>

          {/* Bottom Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() =>
                router.push({
                  pathname: '/JobDetailsScreen/[slug]',
                  params: { slug: item.job.slug },
                })
              }
            >
              <Text style={styles.viewDetailsText}>
                {t('home.viewDetails')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                showOptionsMenu(item);
              }}
              style={styles.moreButton}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={GRAY_TEXT}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
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
            <Ionicons name="arrow-back" size={24} color={PRIMARY_BLUE} />
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
          <Ionicons name="arrow-back" size={24} color={PRIMARY_BLUE} />
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
    backgroundColor: LIGHT_BACKGROUND,
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
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
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
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  statsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
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
    paddingHorizontal: SPACING,
    paddingTop: 16,
    paddingBottom: 20,
  },
  applicationListEmpty: {
    flexGrow: 1,
  },
  // Job Card - Enhanced with better spacing
  jobCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTouchable: {
    padding: 0,
  },
  jobCardHeader: {
    flexDirection: 'row',
    padding: CARD_PADDING,
    paddingBottom: 12,
  },
  companyLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY_BLUE,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationText: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: '500',
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  // Salary Section - Changed to blue theme
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE', // Brighter blue background
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  salaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_BLUE, // Changed from orange to primary blue
    flex: 1,
  },
  // Details Grid
  detailsContainer: {
    flexDirection: 'row',
    padding: CARD_PADDING,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },
  detailDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  // Action Row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginRight: 12,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
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
