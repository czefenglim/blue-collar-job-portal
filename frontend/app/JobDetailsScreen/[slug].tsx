import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface JobDetails {
  id: number;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  company: {
    id: number;
    name: string;
    logo: string | null;
    description: string | null;
    website: string | null;
    city: string | null;
    state: string | null;
    companySize: string | null;
    companySizeLabel: string | null;
  };
  industry: {
    id: number;
    name: string;
    slug: string;
  };
  city: string;
  state: string;
  address: string | null;
  jobType: string;
  workingHours: string;
  experienceLevel: string;
  jobTypeLabel: string;
  workingHoursLabel: string;
  experienceLevelLabel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  isRemote: boolean;
  applicationDeadline: string | null;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
  isSaved: boolean;
  hasApplied: boolean;
  applicationStatus: string | null;
}

// Color palette
const PRIMARY_BLUE = '#1E40AF';
const ACCENT_GREEN = '#10B981';
const ACCENT_ORANGE = '#F59E0B';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const TEXT_TERTIARY = '#94A3B8';
const BORDER_COLOR = '#E2E8F0';

const JobDetailsScreen: React.FC = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();

  useEffect(() => {
    loadJobDetails();
  }, [slug, currentLanguage]);

  const loadJobDetails = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('jobDetails.authenticationRequired'),
          t('jobDetails.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);
      await fetchJobDetails(userToken);
    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert(t('common.error'), t('jobDetails.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async (userToken: string) => {
    try {
      const lang = currentLanguage || 'en';
      const response = await fetch(`${URL}/api/jobs/${slug}?lang=${lang}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.data);
      } else {
        throw new Error('Failed to fetch job details');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      throw error;
    }
  };

  const toggleSaveJob = async () => {
    if (!job) return;

    try {
      const response = await fetch(`${URL}/api/jobs/${job.id}/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJob({ ...job, isSaved: data.data.isSaved });
      }
    } catch (error) {
      console.error('Error toggling save job:', error);
      Alert.alert(t('common.error'), t('jobDetails.errors.saveFailed'));
    }
  };

  const handleApply = async () => {
    if (!job) return;

    if (job.hasApplied) {
      Alert.alert(
        t('jobDetails.alreadyApplied.title'),
        t('jobDetails.alreadyApplied.message', {
          status: formatApplicationStatus(job.applicationStatus),
        })
      );
      return;
    }

    // Check profile completion before applying
    try {
      const response = await fetch(
        `${URL}/api/users/getProfile?lang=${currentLanguage || 'en'}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const profile = data.data.profile;

        if (!profile || !profile.profileCompleted) {
          Alert.alert(
            t('jobDetails.profileIncomplete.title') || 'Profile Incomplete',
            t('jobDetails.profileIncomplete.message') ||
              'Please complete your profile before applying for jobs.',
            [
              {
                text: t('common.cancel'),
                style: 'cancel',
              },
              {
                text: t('jobDetails.editProfile') || 'Edit Profile',
                onPress: () => router.push('/EditProfileScreen'),
              },
            ]
          );
          return;
        }
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
      // Optional: Allow application if check fails, or show error.
      // Safest is to log and maybe allow or show generic error.
      // For now, let's just log and continue or return?
      // If we can't verify, maybe better to let them try apply and fail at backend?
      // But requirement says "prompt user".
    }

    router.push({
      pathname: '/ApplyConfirmationScreen/[slug]',
      params: { slug: job.slug },
    });
  };

  const handleReport = () => {
    if (!job) return;

    router.push({
      pathname: '/(user-hidden)/report-job',
      params: { jobId: job.id.toString(), jobTitle: job.title },
    });
  };

  const openWebsite = () => {
    if (job?.company.website) {
      Linking.openURL(job.company.website);
    }
  };

  const formatSalary = (
    min: number | null,
    max: number | null,
    type: string | null
  ) => {
    if (!min && !max) return t('jobDetails.salary.notSpecified');

    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;

    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? ` ${t('jobDetails.salary.per')} ${type.toLowerCase()}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${
      type ? ` ${t('jobDetails.salary.per')} ${type.toLowerCase()}` : ''
    }`;
  };

  const formatApplicationStatus = (status: string | null) => {
    if (!status) return t('jobDetails.applicationStatus.unknown');

    const formatted = status
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const translationMap: { [key: string]: string } = {
      Pending: t('applications.status.pending'),
      Reviewing: t('applications.status.reviewing'),
      Shortlisted: t('applications.status.shortlisted'),
      'Interview Scheduled': t('applications.status.interviewScheduled'),
      Interviewed: t('applications.status.interviewed'),
      Rejected: t('applications.status.rejected'),
      Hired: t('applications.status.hired'),
      Withdrawn: t('applications.status.withdrawn'),
    };

    return translationMap[formatted] || formatted;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('jobDetails.posted.today');
    if (diffDays === 2) return t('jobDetails.posted.yesterday');
    if (diffDays <= 7)
      return t('jobDetails.posted.daysAgo', { days: diffDays });
    if (diffDays <= 30)
      return t('jobDetails.posted.weeksAgo', {
        weeks: Math.floor(diffDays / 7),
      });
    return t('jobDetails.posted.monthsAgo', {
      months: Math.floor(diffDays / 30),
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={PRIMARY_BLUE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('jobDetails.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>{t('jobDetails.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={PRIMARY_BLUE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('jobDetails.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={TEXT_SECONDARY}
          />
          <Text style={styles.errorText}>
            {t('jobDetails.errors.notFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={PRIMARY_BLUE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('jobDetails.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.saveButton} onPress={toggleSaveJob}>
            <Ionicons
              name={job.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={job.isSaved ? ACCENT_ORANGE : PRIMARY_BLUE}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
            <Ionicons name="flag-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.companyLogoContainer}>
            {job.company.logo ? (
              <Image
                source={{ uri: job.company.logo }}
                style={styles.companyLogo}
              />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Text style={styles.companyLogoText}>
                  {job.company.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.jobHeaderInfo}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={styles.companyInfoRow}>
              <Ionicons
                name="business-outline"
                size={16}
                color={PRIMARY_BLUE}
              />
              <Text style={styles.companyName}>{job.company.name}</Text>
            </View>

            <View style={styles.locationRow}>
              <View style={styles.locationTag}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.locationText}>
                  {job.city}, {job.state}
                </Text>
              </View>
              {job.isRemote && (
                <View style={styles.remoteTag}>
                  <Ionicons name="wifi" size={12} color="#FFFFFF" />
                  <Text style={styles.remoteText}>
                    {t('jobDetails.remote')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.postedRow}>
              <View style={styles.postedInfo}>
                <Ionicons name="time-outline" size={14} color={TEXT_TERTIARY} />
                <Text style={styles.postedTime}>
                  {getTimeAgo(job.createdAt)}
                </Text>
              </View>
              <View style={styles.postedInfo}>
                <Ionicons name="eye-outline" size={14} color={TEXT_TERTIARY} />
                <Text style={styles.viewCount}>
                  {job.viewCount} {t('jobDetails.stats.views')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats Cards */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}
            >
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={PRIMARY_BLUE}
              />
            </View>
            <Text style={styles.statCardLabel}>
              {t('jobDetails.quickInfo.jobType')}
            </Text>
            <Text style={styles.statCardValue}>{job.jobTypeLabel}</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: '#F0F9FF' }]}
            >
              <Ionicons name="trending-up-outline" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.statCardLabel}>
              {t('jobDetails.quickInfo.experience')}
            </Text>
            <Text style={styles.statCardValue}>{job.experienceLevelLabel}</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}
            >
              <FontAwesome5 name="clock" size={18} color={ACCENT_ORANGE} />
            </View>
            <Text style={styles.statCardLabel}>
              {t('jobDetails.quickInfo.workingHours')}
            </Text>
            <Text style={styles.statCardValue}>{job.workingHoursLabel}</Text>
          </View>
        </View>

        {/* Salary Card */}
        <View style={styles.salaryCard}>
          <View style={styles.salaryHeader}>
            <View style={styles.salaryIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.salaryTextContainer}>
              <Text style={styles.salaryCardTitle}>
                {t('jobDetails.salary.title')}
              </Text>
              <Text style={styles.salaryRange}>
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
              </Text>
            </View>
          </View>
          {job.applicationDeadline && (
            <View style={styles.deadlineRow}>
              <Ionicons name="calendar-outline" size={16} color="#EF4444" />
              <Text style={styles.deadlineText}>
                {t('jobDetails.deadline')}:{' '}
                {new Date(job.applicationDeadline).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={PRIMARY_BLUE}
              />
            </View>
            <Text style={styles.sectionTitle}>
              {t('jobDetails.description.title')}
            </Text>
          </View>
          <Text style={styles.bodyText}>{job.description}</Text>
        </View>

        {/* Requirements Section */}
        {job.requirements && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={ACCENT_GREEN}
                />
              </View>
              <Text style={styles.sectionTitle}>
                {t('jobDetails.requirements.title')}
              </Text>
            </View>
            <Text style={styles.bodyText}>{job.requirements}</Text>
          </View>
        )}

        {/* Benefits Section */}
        {job.benefits && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="gift-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.sectionTitle}>
                {t('jobDetails.benefits.title')}
              </Text>
            </View>
            <Text style={styles.bodyText}>{job.benefits}</Text>
          </View>
        )}

        {/* Company Info Card */}
        <View style={styles.companyCard}>
          <View style={styles.companyCardHeader}>
            <View style={styles.companyCardIconContainer}>
              <Ionicons name="business" size={24} color={PRIMARY_BLUE} />
            </View>
            <Text style={styles.companyCardTitle}>
              {t('jobDetails.company.about', { companyName: job.company.name })}
            </Text>
          </View>

          {job.company.description && (
            <Text style={styles.companyDescription}>
              {job.company.description}
            </Text>
          )}

          <View style={styles.companyDetailsGrid}>
            <View style={styles.companyDetailItem}>
              <Ionicons
                name="people-outline"
                size={16}
                color={TEXT_SECONDARY}
              />
              <Text style={styles.companyDetailLabel}>
                {t('jobDetails.company.size')}
              </Text>
              <Text style={styles.companyDetailValue}>
                {job.company.companySizeLabel ||
                  t('jobDetails.company.notSpecified')}
              </Text>
            </View>

            <View style={styles.companyDetailItem}>
              <Ionicons
                name="location-outline"
                size={16}
                color={TEXT_SECONDARY}
              />
              <Text style={styles.companyDetailLabel}>
                {t('jobDetails.company.location')}
              </Text>
              <Text style={styles.companyDetailValue}>
                {job.company.city}, {job.company.state}
              </Text>
            </View>

            <View style={styles.companyDetailItem}>
              <Ionicons
                name="layers-outline"
                size={16}
                color={TEXT_SECONDARY}
              />
              <Text style={styles.companyDetailLabel}>
                {t('jobDetails.quickInfo.industry')}
              </Text>
              <Text style={styles.companyDetailValue}>{job.industry.name}</Text>
            </View>
          </View>

          {job.company.website && (
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={openWebsite}
            >
              <Ionicons name="link-outline" size={18} color={PRIMARY_BLUE} />
              <Text style={styles.websiteButtonText}>
                {t('jobDetails.company.visitWebsite')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        {job.hasApplied ? (
          <View style={styles.appliedContainer}>
            <View style={styles.appliedTextContainer}>
              <Text style={styles.appliedText}>
                {t('jobDetails.applied.submitted')}
              </Text>
              <Text style={styles.appliedStatus}>
                {t('jobDetails.applied.status')}:{' '}
                {formatApplicationStatus(job.applicationStatus)}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>
              {t('jobDetails.applyButton')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    marginTop: 16,
    fontWeight: '500',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  reportButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  // Hero Section
  heroSection: {
    backgroundColor: CARD_BACKGROUND,
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  companyLogoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  companyLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jobHeaderInfo: {
    alignItems: 'center',
    width: '100%',
  },
  jobTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  companyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  remoteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  remoteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  postedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postedTime: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontWeight: '500',
  },
  viewCount: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontWeight: '500',
  },
  // Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardLabel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginBottom: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  statCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  // Salary Card
  salaryCard: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F9FF',
  },
  salaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  salaryTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  salaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salaryCardTitle: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    marginBottom: 4,
  },
  salaryRange: {
    fontSize: 22,
    fontWeight: '800',
    color: ACCENT_GREEN,
    flexShrink: 1,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Sections
  section: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  bodyText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 24,
  },
  // Company Card
  companyCard: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  companyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  companyCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  companyCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  companyDescription: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 24,
    marginBottom: 20,
  },
  companyDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  companyDetailItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  companyDetailLabel: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 8,
    marginBottom: 6,
    fontWeight: '600',
  },
  companyDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  // Application Stats
  applicationStatsCard: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  applicationStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 20,
    textAlign: 'center',
  },
  applicationStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicationStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  applicationStatIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicationStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  applicationStatLabel: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontWeight: '600',
  },
  applicationStatDivider: {
    width: 1,
    height: 80,
    backgroundColor: BORDER_COLOR,
    marginHorizontal: 20,
  },
  // Bottom Bar
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    backgroundColor: CARD_BACKGROUND,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ACCENT_GREEN,
    gap: 16,
  },
  appliedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: ACCENT_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedTextContainer: {
    flex: 1,
  },
  appliedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  appliedStatus: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '500',
  },
  appliedDetailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  appliedDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
});

export default JobDetailsScreen;
