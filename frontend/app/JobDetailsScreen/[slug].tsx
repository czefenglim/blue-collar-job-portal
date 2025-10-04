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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';

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

const JobDetailsScreen: React.FC = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    loadJobDetails();
  }, [slug]);

  const loadJobDetails = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
        return;
      }

      setToken(userToken);
      await fetchJobDetails(userToken);
    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert('Error', 'Failed to load job details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/jobs/${slug}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
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
      Alert.alert('Error', 'Failed to save job. Please try again.');
    }
  };

  const handleApply = () => {
    if (!job) return;

    if (job.hasApplied) {
      Alert.alert(
        'Already Applied',
        `You have already applied to this position. Status: ${formatApplicationStatus(
          job.applicationStatus
        )}`
      );
      return;
    }

    router.push({
      pathname: '/ApplyConfirmationScreen/[slug]',
      params: { slug: job.slug },
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
    if (!min && !max) return 'Salary not specified';

    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;

    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? ` per ${type.toLowerCase()}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${
      type ? ` per ${type.toLowerCase()}` : ''
    }`;
  };

  const formatJobType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatWorkingHours = (hours: string) => {
    return hours
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatExperienceLevel = (level: string) => {
    return level
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCompanySize = (size: string | null) => {
    if (!size) return 'Not specified';
    return size.charAt(0) + size.slice(1).toLowerCase();
  };

  const formatApplicationStatus = (status: string | null) => {
    if (!status) return 'Unknown';
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Posted today';
    if (diffDays === 2) return 'Posted yesterday';
    if (diffDays <= 7) return `Posted ${diffDays} days ago`;
    if (diffDays <= 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted ${Math.floor(diffDays / 30)} months ago`;
  };

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
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading job details...</Text>
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
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Job not found</Text>
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
        <Text style={styles.headerTitle}>Job Details</Text>
        <TouchableOpacity style={styles.saveButton} onPress={toggleSaveJob}>
          <Text style={styles.saveIcon}>{job.isSaved ? '🔖' : '📑'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Header */}
        <View style={styles.jobHeader}>
          <View style={styles.companyLogo}>
            <Text style={styles.companyLogoText}>
              {job.company.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>{job.company.name}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {job.city}, {job.state}
              {job.isRemote && ' • Remote'}
            </Text>
          </View>
          <Text style={styles.postedTime}>{getTimeAgo(job.createdAt)}</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.section}>
          <View style={styles.quickInfoGrid}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Job Type</Text>
              <Text style={styles.quickInfoValue}>
                {formatJobType(job.jobType)}
              </Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Experience</Text>
              <Text style={styles.quickInfoValue}>
                {formatExperienceLevel(job.experienceLevel)}
              </Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Working Hours</Text>
              <Text style={styles.quickInfoValue}>
                {formatWorkingHours(job.workingHours)}
              </Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Industry</Text>
              <Text style={styles.quickInfoValue}>{job.industry.name}</Text>
            </View>
          </View>
        </View>

        {/* Salary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Salary</Text>
          <Text style={styles.salaryText}>
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Job Description</Text>
          <Text style={styles.bodyText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Requirements</Text>
            <Text style={styles.bodyText}>{job.requirements}</Text>
          </View>
        )}

        {/* Benefits */}
        {job.benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Benefits</Text>
            <Text style={styles.bodyText}>{job.benefits}</Text>
          </View>
        )}

        {/* Company Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 About {job.company.name}</Text>
          {job.company.description && (
            <Text style={styles.bodyText}>{job.company.description}</Text>
          )}
          <View style={styles.companyInfoRow}>
            <Text style={styles.companyInfoLabel}>Company Size:</Text>
            <Text style={styles.companyInfoValue}>
              {formatCompanySize(job.company.companySize)}
            </Text>
          </View>
          <View style={styles.companyInfoRow}>
            <Text style={styles.companyInfoLabel}>Location:</Text>
            <Text style={styles.companyInfoValue}>
              {job.company.city}, {job.company.state}
            </Text>
          </View>
          {job.company.website && (
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={openWebsite}
            >
              <Text style={styles.websiteButtonText}>Visit Website</Text>
              <Text style={styles.websiteIcon}>🔗</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{job.viewCount}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{job.applicationCount}</Text>
              <Text style={styles.statLabel}>Applicants</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={styles.bottomBar}>
        {job.hasApplied ? (
          <View style={styles.appliedContainer}>
            <Text style={styles.appliedIcon}>✅</Text>
            <View style={styles.appliedTextContainer}>
              <Text style={styles.appliedText}>Application Submitted</Text>
              <Text style={styles.appliedStatus}>
                Status: {formatApplicationStatus(job.applicationStatus)}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
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
  saveButton: {
    padding: 8,
  },
  saveIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  jobHeader: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  locationText: {
    fontSize: 15,
    color: '#64748B',
  },
  postedTime: {
    fontSize: 13,
    color: '#94A3B8',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 20,
  },
  quickInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickInfoItem: {
    width: '47%',
  },
  quickInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  quickInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  salaryText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  bodyText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  companyInfoRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  companyInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 8,
  },
  companyInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  websiteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
    marginRight: 8,
  },
  websiteIcon: {
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appliedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#059669',
  },
  appliedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  appliedTextContainer: {
    flex: 1,
  },
  appliedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  appliedStatus: {
    fontSize: 13,
    color: '#047857',
  },
});

export default JobDetailsScreen;
