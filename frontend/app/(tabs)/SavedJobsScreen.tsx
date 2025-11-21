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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

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
  const { t } = useLanguage();

  useEffect(() => {
    loadSavedJobs();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedJobs();
    }, [])
  );

  const loadSavedJobs = async () => {
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
  };

  const fetchSavedJobs = async (userToken: string) => {
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
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchSavedJobs(token);
    } catch (error) {
      Alert.alert(t('common.error'), t('savedJobs.errors.refreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

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
        activeOpacity={0.7}
      >
        <View style={styles.jobCardHeader}>
          <View style={styles.companyLogoContainer}>
            <Text style={styles.companyLogoText}>
              {item.company.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.jobHeaderInfo}>
            <Text style={styles.savedAtText}>
              {formatSavedAt(item.savedAt)}
            </Text>
            <TouchableOpacity
              onPress={() => showOptionsMenu(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.moreButton}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.jobMetaContainer}>
          <View style={styles.jobMetaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.industry.name}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatJobType(item.jobType)}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatWorkingHours(item.workingHours)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.companyName} numberOfLines={1}>
          {item.company.name}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.city}, {item.state}
        </Text>

        <View style={styles.jobFooter}>
          <Text style={styles.postedText}>
            {t('savedJobs.posted')} {getTimeAgo(item.createdAt)}
          </Text>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
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
  jobList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  jobListEmpty: {
    flexGrow: 1,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTouchable: {
    padding: 16,
  },
  jobCardHeader: {
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
  jobHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedAtText: {
    fontSize: 11,
    color: '#64748B',
  },
  moreButton: {
    padding: 4,
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
    marginBottom: 8,
  },
  jobFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  postedText: {
    fontSize: 12,
    color: '#94A3B8',
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

export default SavedJobsScreen;
