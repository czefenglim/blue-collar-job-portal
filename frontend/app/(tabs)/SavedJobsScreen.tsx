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
  Image,
  View,
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
const GRAY_TEXT = '#455A64';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const SPACING = 16;
const CARD_PADDING = 20;

interface Job {
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
  isSaved: boolean;
  savedAt: string;
}

const SavedJobsScreen: React.FC = () => {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [token, setToken] = useState<string>('');

  const router = useRouter();
  const { t, currentLanguage } = useLanguage();

  const fetchSavedJobs = useCallback(async (userToken: string) => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';

      const response = await fetch(`${URL}/api/jobs/saved/list?lang=${lang}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedJobs(data.data);
      } else {
        throw new Error('Failed to fetch saved jobs');
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      throw error;
    }
  }, []);

  const loadSavedJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('savedJobs.authenticationRequired'),
          t('savedJobs.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);
      await fetchSavedJobs(userToken);
    } catch (error) {
      console.error('Error loading saved jobs:', error);
      Alert.alert(t('common.error'), t('savedJobs.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t, router, fetchSavedJobs]);

  useEffect(() => {
    loadSavedJobs();
  }, [loadSavedJobs]);

  useFocusEffect(
    useCallback(() => {
      loadSavedJobs();
    }, [loadSavedJobs])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchSavedJobs(token);
    } catch (_error) {
      Alert.alert(t('common.error'), t('savedJobs.errors.refreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [token, t, fetchSavedJobs]);

  const unsaveJob = async (jobId: number) => {
    try {
      const response = await fetch(`${URL}/api/jobs/${jobId}/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSavedJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
      } else {
        Alert.alert(t('common.error'), t('savedJobs.errors.unsaveFailed'));
      }
    } catch (error) {
      console.error('Error unsaving job:', error);
      Alert.alert(t('common.error'), t('savedJobs.errors.unsaveFailed'));
    }
  };

  const confirmUnsave = (jobId: number, jobTitle: string) => {
    Alert.alert(
      t('savedJobs.removeJob'),
      t('savedJobs.removeConfirmation', { jobTitle }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('savedJobs.remove'),
          style: 'destructive',
          onPress: () => unsaveJob(jobId),
        },
      ]
    );
  };

  const handleReport = (jobId: number, jobTitle: string) => {
    router.push({
      pathname: '/(user-hidden)/report-job',
      params: { jobId: jobId.toString(), jobTitle },
    });
  };

  const showOptionsMenu = (item: Job) => {
    Alert.alert(t('savedJobs.options'), t('savedJobs.selectAction'), [
      {
        text: t('savedJobs.viewDetails'),
        onPress: () =>
          router.push({
            pathname: '/JobDetailsScreen/[slug]',
            params: { slug: item.slug },
          }),
      },
      {
        text: t('savedJobs.unsave'),
        onPress: () => confirmUnsave(item.id, item.title),
      },
      {
        text: t('savedJobs.reportJob'),
        onPress: () => handleReport(item.id, item.title),
        style: 'destructive',
      },
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
    ]);
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

  const formatSavedAt = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('savedJobs.savedToday');
    if (diffDays === 2) return t('savedJobs.savedYesterday');
    if (diffDays <= 7) return t('savedJobs.savedDaysAgo', { days: diffDays });
    return t('savedJobs.savedOnDate', {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
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

  const renderJobCard = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() =>
          router.push({
            pathname: '/JobDetailsScreen/[slug]',
            params: { slug: item.slug },
          })
        }
        activeOpacity={0.9}
      >
        {/* Top Row: Company Logo + Title + Save Button */}
        <View style={styles.jobCardHeader}>
          <View style={styles.companyLogoContainer}>
            {item.company.logo ? (
              <Image
                source={{ uri: item.company.logo }}
                style={styles.companyLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Text style={styles.companyLogoText}>
                  {item.company.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.jobTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  confirmUnsave(item.id, item.title);
                }}
                style={styles.saveButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="bookmark" size={24} color={PRIMARY_BLUE} />
              </TouchableOpacity>
            </View>
            <Text style={styles.companyName}>{item.company.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.city}, {item.state}
              </Text>
              <Text style={styles.timeAgo}>{formatSavedAt(item.savedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Salary Row - Changed to blue theme */}
        <View style={styles.salaryContainer}>
          <Ionicons name="cash-outline" size={20} color={PRIMARY_BLUE} />
          <Text style={styles.salaryText}>
            {formatSalary(item.salaryMin, item.salaryMax, item.salaryType)}
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
              {formatJobType(item.jobType)}
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
              {formatWorkingHours(item.workingHours)}
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
            <Text style={styles.detailLabel}>{t('home.experienceLevel')}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {formatExperienceLevel(item.experienceLevel)}
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
                params: { slug: item.slug },
              })
            }
          >
            <Text style={styles.viewDetailsText}>{t('home.viewDetails')}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              showOptionsMenu(item);
            }}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={GRAY_TEXT} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>{t('savedJobs.emptyState.title')}</Text>
      <Text style={styles.emptyText}>
        {t('savedJobs.emptyState.description')}
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/HomeScreen')}
      >
        <Text style={styles.browseButtonText}>
          {t('savedJobs.emptyState.browseButton')}
        </Text>
      </TouchableOpacity>
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
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('savedJobs.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('savedJobs.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('savedJobs.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {savedJobs.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {t('savedJobs.jobCount', {
              count: savedJobs.length,
              jobs:
                savedJobs.length === 1
                  ? t('savedJobs.job')
                  : t('savedJobs.jobs'),
            })}
          </Text>
        </View>
      )}

      <FlatList
        data={savedJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJobCard}
        contentContainerStyle={[
          styles.jobList,
          savedJobs.length === 0 && styles.jobListEmpty,
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
    justifyContent: 'center',
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
  jobList: {
    paddingHorizontal: SPACING,
    paddingTop: 16,
    paddingBottom: 20,
  },
  jobListEmpty: {
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
  saveButton: {
    padding: 4,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: PRIMARY_BLUE,
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

export default SavedJobsScreen;
