import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '@/contexts/LanguageContext';
import JobPostLimitModal from '@/components/JobPostLimitModal';
import VoiceTextInput from '@/components/VoiceTextInput';

// Color palette from your theme
const PRIMARY_BLUE = '#1E3A8A';
const ACCENT_ORANGE = '#F59E0B';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';
const ACCENT_PURPLE = '#8B5CF6';
const GRAY_TEXT = '#64748B';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

const { width } = Dimensions.get('window');
const SPACING = 16;
const CARD_PADDING = 20;

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface SubscriptionInfo {
  planType: 'FREE' | 'PRO' | 'MAX';
  jobPostLimit: number;
  activeJobPosts: number;
  canPost: boolean;
}

interface JobPost {
  id: number;
  title: string;
  slug: string;
  jobType: string;
  city: string;
  state: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isActive: boolean;
  approvalStatus:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED_AI'
    | 'APPEALED'
    | 'REJECTED_FINAL';
  rejectionReason: string | null;
  rejectionReasonLocalized?: string;
  viewCount: number;
  applicationCount: number;
  estimatedHireDaysMin: number | null;
  estimatedHireDaysMax: number | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    applications: number;
  };
  company: {
    id: number;
    name: string;
    logo: string | null;
  };
  jobTypeLabel?: string;
}

export default function JobPostsPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    | 'all'
    | 'APPROVED'
    | 'PENDING'
    | 'REJECTED_AI'
    | 'APPEALED'
    | 'REJECTED_FINAL'
  >('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'closed'>(
    'all'
  );
  const [error, setError] = useState<string | null>(null);

  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [selectedJobForAppeal, setSelectedJobForAppeal] =
    useState<JobPost | null>(null);
  const [appealExplanation, setAppealExplanation] = useState('');
  const [appealEvidence, setAppealEvidence] = useState<any[]>([]);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchSubscriptionInfo();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, statusFilter, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
      fetchSubscriptionInfo();
    }, [])
  );

  const fetchSubscriptionInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/subscription/can-post-job`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo({
          planType: data.data.planType,
          jobPostLimit: data.data.jobPostLimit,
          activeJobPosts: data.data.activeJobs,
          canPost: data.data.canPost,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription info:', error);
    }
  };

  const handleCreateJobClick = () => {
    if (subscriptionInfo && !subscriptionInfo.canPost) {
      setShowLimitModal(true);
    } else {
      router.push('/(employer-hidden)/create-job');
    }
  };

  const fetchJobs = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(
        `${URL}/api/employer/jobs?lang=${currentLanguage}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log('Fetched jobs:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch jobs');
      }

      setJobs(data.data || []);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      setError(error.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewRejectionReason = (title: string, reason: string | null) => {
    Alert.alert(
      t('employerJobPosts.appeal.rejectedTitle'),
      reason || t('employerJobPosts.appeal.noReason'),
      [{ text: t('common.ok') }]
    );
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.approvalStatus === statusFilter);
    }

    if (activeFilter === 'active') {
      filtered = filtered.filter((job) => job.isActive);
    } else if (activeFilter === 'closed') {
      filtered = filtered.filter((job) => !job.isActive);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.city.toLowerCase().includes(query) ||
          job.state.toLowerCase().includes(query)
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
    fetchSubscriptionInfo();
  };

  const getApprovalStatusBadge = (
    status:
      | 'PENDING'
      | 'APPROVED'
      | 'REJECTED_AI'
      | 'APPEALED'
      | 'REJECTED_FINAL'
  ) => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: '#d1fae5',
          color: ACCENT_GREEN,
          icon: 'checkmark-circle' as const,
          text: t('employerJobPosts.filters.approved'),
          borderColor: '#a7f3d0',
        };
      case 'PENDING':
        return {
          bg: '#fef3c7',
          color: ACCENT_ORANGE,
          icon: 'hourglass' as const,
          text: t('employerJobPosts.filters.pending'),
          borderColor: '#fde68a',
        };
      case 'REJECTED_AI':
        return {
          bg: '#fee2e2',
          color: ACCENT_RED,
          icon: 'close-circle' as const,
          text: t('employerJobPosts.filters.aiRejected'),
          borderColor: '#fecaca',
        };
      case 'APPEALED':
        return {
          bg: '#dbeafe',
          color: '#3b82f6',
          icon: 'document-text' as const,
          text: t('employerJobPosts.filters.appealed'),
          borderColor: '#bfdbfe',
        };
      case 'REJECTED_FINAL':
        return {
          bg: '#fecaca',
          color: '#dc2626',
          icon: 'ban' as const,
          text: t('employerJobPosts.filters.finalRejected'),
          borderColor: '#fca5a5',
        };
    }
  };

  const handleOpenAppealModal = (job: JobPost) => {
    setSelectedJobForAppeal(job);
    setAppealExplanation('');
    setAppealEvidence([]);
    setAppealModalVisible(true);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        setAppealEvidence((prev) => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        t('common.error'),
        t('employerJobPosts.errors.pickDocumentFailed')
      );
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setAppealEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAppeal = async () => {
    if (!selectedJobForAppeal) return;

    if (!appealExplanation.trim()) {
      Alert.alert(
        t('common.error'),
        t('employerJobPosts.appeal.validation.explanationRequired')
      );
      return;
    }

    setSubmittingAppeal(true);

    try {
      const token = await AsyncStorage.getItem('jwtToken');

      const formData = new FormData();
      formData.append('explanation', appealExplanation);

      appealEvidence.forEach((file, index) => {
        formData.append('evidence', {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name || `evidence-${index}`,
        } as any);
      });

      const response = await fetch(
        `${URL}/api/job-appeals/employer/jobs/${selectedJobForAppeal.id}/appeal`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit appeal');
      }

      Alert.alert(
        'Appeal Submitted',
        'Your appeal has been submitted and will be reviewed by our team.',
        [
          {
            text: 'OK',
            onPress: () => {
              setAppealModalVisible(false);
              fetchJobs();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting appeal:', error);
      Alert.alert('Error', error.message || 'Failed to submit appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleToggleStatus = async (jobId: number, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Close Job Post' : 'Activate Job Post',
      `Are you sure you want to ${
        currentStatus ? 'close' : 'activate'
      } this job post?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/jobs/${jobId}/toggle-status`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to update status');
              }

              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId ? { ...job, isActive: !currentStatus } : job
                )
              );

              Alert.alert('Success', data.message);
            } catch (error: any) {
              console.error('Error toggling status:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to update job status'
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteJob = async (jobId: number, jobTitle: string) => {
    Alert.alert(
      'Delete Job Post',
      `Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/jobs/${jobId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to delete job');
              }

              setJobs((prev) => prev.filter((job) => job.id !== jobId));

              Alert.alert('Success', 'Job post deleted successfully');
            } catch (error: any) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', error.message || 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const renderStatusFilterButton = (
    label: string,
    value:
      | 'all'
      | 'APPROVED'
      | 'PENDING'
      | 'REJECTED_AI'
      | 'APPEALED'
      | 'REJECTED_FINAL',
    count: number
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === value && styles.filterButtonActive,
      ]}
      onPress={() => setStatusFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          statusFilter === value && styles.filterButtonTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderActiveFilterButton = (
    label: string,
    value: 'all' | 'active' | 'closed',
    count: number
  ) => (
    <TouchableOpacity
      style={[
        styles.secondaryFilterButton,
        activeFilter === value && styles.secondaryFilterButtonActive,
      ]}
      onPress={() => setActiveFilter(value)}
    >
      <Text
        style={[
          styles.secondaryFilterText,
          activeFilter === value && styles.secondaryFilterTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderJobCard = ({ item }: { item: JobPost }) => {
    const approvalBadge = getApprovalStatusBadge(item.approvalStatus);

    return (
      <View style={styles.jobCard}>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() =>
            router.push(
              `/(employer-hidden)/job-post-details/${item.id}` as Href
            )
          }
          activeOpacity={0.9}
        >
          {/* Top Header with Company Logo and Status */}
          <View style={styles.jobCardHeader}>
            <View style={styles.companyLogoContainer}>
              {item.company?.logo ? (
                <Image
                  source={{ uri: item.company.logo }}
                  style={styles.companyLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Text style={styles.companyLogoText}>
                    {item.company?.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.jobTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.companyName}>{item.company?.name}</Text>
            </View>

            <View
              style={[
                styles.approvalStatusBadge,
                {
                  backgroundColor: approvalBadge.bg,
                  borderColor: approvalBadge.borderColor,
                },
              ]}
            >
              <Ionicons
                name={approvalBadge.icon}
                size={16}
                color={approvalBadge.color}
              />
              <Text
                style={[
                  styles.approvalStatusText,
                  { color: approvalBadge.color },
                ]}
              >
                {approvalBadge.text}
              </Text>
            </View>
          </View>

          {/* Job Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color={GRAY_TEXT} />
              <Text style={styles.detailText}>
                {item.city}, {item.state}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="briefcase-outline" size={16} color={GRAY_TEXT} />
              <Text style={styles.detailText}>
                {item.jobTypeLabel || item.jobType.replace('_', ' ')}
              </Text>
            </View>
            {item.approvalStatus === 'APPROVED' && (
              <View style={styles.detailItem}>
                <View
                  style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: item.isActive ? ACCENT_GREEN : GRAY_TEXT,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.isActive ? ACCENT_GREEN : GRAY_TEXT,
                    },
                  ]}
                >
                  {item.isActive
                    ? t('employerJobPosts.filters.active')
                    : t('employerJobPosts.filters.closed')}
                </Text>
              </View>
            )}
          </View>

          {/* Salary Section */}
          {item.salaryMin && item.salaryMax && (
            <View style={styles.salaryContainer}>
              <Ionicons name="cash-outline" size={20} color={PRIMARY_BLUE} />
              <Text style={styles.salaryText}>
                RM {item.salaryMin.toLocaleString()} - RM{' '}
                {item.salaryMax.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Hire Estimation */}
          {item.approvalStatus === 'APPROVED' &&
            (item.estimatedHireDaysMin || item.estimatedHireDaysMax) && (
              <View style={styles.estimationContainer}>
                <Ionicons name="time-outline" size={18} color={ACCENT_PURPLE} />
                <Text style={styles.estimationText}>
                  Est. hire:{' '}
                  <Text style={styles.estimationDays}>
                    {item.estimatedHireDaysMin}–{item.estimatedHireDaysMax} days
                  </Text>
                </Text>
              </View>
            )}

          {/* Status-specific Sections */}
          {item.approvalStatus === 'PENDING' && (
            <View style={styles.statusSection}>
              <View style={styles.pendingInfo}>
                <Ionicons
                  name="hourglass-outline"
                  size={18}
                  color={ACCENT_ORANGE}
                />
                <Text style={styles.pendingText}>
                  {t('employerJobPosts.pendingAiNotice')}
                </Text>
              </View>
            </View>
          )}

          {item.approvalStatus === 'REJECTED_AI' && (
            <View style={styles.statusSection}>
              <TouchableOpacity
                style={styles.rejectionBox}
                onPress={() =>
                  handleViewRejectionReason(
                    item.title,
                    item.rejectionReasonLocalized ?? item.rejectionReason
                  )
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={ACCENT_RED}
                />
                <Text style={styles.rejectionText} numberOfLines={2}>
                  {item.rejectionReasonLocalized ??
                    item.rejectionReason ??
                    t('employerJobPosts.appeal.aiRejectedNotice')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={ACCENT_RED} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.appealButton}
                onPress={() => handleOpenAppealModal(item)}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.appealButtonText}>
                  {t('employerJobPosts.appeal.button')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {item.approvalStatus === 'APPEALED' && (
            <View style={styles.statusSection}>
              <View style={styles.appealedInfo}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#3b82f6"
                />
                <Text style={styles.appealedText}>
                  {t('employerJobPosts.appeal.appealedNotice')}
                </Text>
              </View>
            </View>
          )}

          {item.approvalStatus === 'REJECTED_FINAL' && (
            <View style={styles.statusSection}>
              <View style={styles.finalRejectionBox}>
                <Ionicons name="ban-outline" size={18} color="#dc2626" />
                <Text style={styles.finalRejectionText}>
                  {t('employerJobPosts.appeal.finalRejectedNotice')}
                </Text>
              </View>
            </View>
          )}

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statsContainer}>
              {item.approvalStatus === 'APPROVED' && (
                <>
                  <View style={styles.statItem}>
                    <Ionicons name="eye-outline" size={16} color={GRAY_TEXT} />
                    <Text style={styles.statText}>
                      {item.viewCount || 0}{' '}
                      <Text style={styles.statLabel}>
                        {t('employerJobPosts.stats.views')}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={GRAY_TEXT}
                    />
                    <Text style={styles.statText}>
                      {item.applicationCount || 0}{' '}
                      <Text style={styles.statLabel}>
                        {item.applicationCount === 1
                          ? t('employerJobPosts.stats.applicant')
                          : t('employerJobPosts.stats.applicants')}
                      </Text>
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color={GRAY_TEXT} />
                <Text style={styles.statText}>
                  <Text style={styles.statLabel}>Posted:</Text>{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons - Only for APPROVED jobs */}
          {item.approvalStatus === 'APPROVED' && (
            <View style={styles.actionsSection}>
              <Text style={styles.actionsLabel}>Manage Job:</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => handleToggleStatus(item.id, item.isActive)}
                >
                  <Ionicons
                    name={item.isActive ? 'pause-outline' : 'play-outline'}
                    size={20}
                    color={PRIMARY_BLUE}
                  />
                  <Text style={[styles.actionButtonText, styles.toggleText]}>
                    {item.isActive ? 'Close' : 'Activate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() =>
                    router.push(
                      `/(employer-hidden)/job-post-details/${item.id}/edit` as Href
                    )
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={ACCENT_ORANGE}
                  />
                  <Text style={[styles.actionButtonText, styles.editText]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteJob(item.id, item.title)}
                >
                  <Ionicons name="trash-outline" size={20} color={ACCENT_RED} />
                  <Text style={[styles.actionButtonText, styles.deleteText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>
            {t('employerJobPosts.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const approvedCount = jobs.filter(
    (j) => j.approvalStatus === 'APPROVED'
  ).length;
  const pendingCount = jobs.filter(
    (j) => j.approvalStatus === 'PENDING'
  ).length;
  const rejectedAICount = jobs.filter(
    (j) => j.approvalStatus === 'REJECTED_AI'
  ).length;
  const appealedCount = jobs.filter(
    (j) => j.approvalStatus === 'APPEALED'
  ).length;
  const rejectedFinalCount = jobs.filter(
    (j) => j.approvalStatus === 'REJECTED_FINAL'
  ).length;
  const activeCount = jobs.filter(
    (j) => j.isActive && j.approvalStatus === 'APPROVED'
  ).length;
  const closedCount = jobs.filter(
    (j) => !j.isActive && j.approvalStatus === 'APPROVED'
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchSection}>
        {/* Search bar with VoiceTextInput */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={GRAY_TEXT} />
          <VoiceTextInput
            style={styles.voiceInputContainer}
            inputStyle={styles.voiceInput}
            placeholder={t('employerJobPosts.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={GRAY_TEXT} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.filterLabel}>
          {t('employerJobPosts.filters.status')}
        </Text>
        <View style={styles.filterContainer}>
          {renderStatusFilterButton(
            t('employerJobPosts.filters.all'),
            'all',
            jobs.length
          )}
          {renderStatusFilterButton(
            t('employerJobPosts.filters.pending'),
            'PENDING',
            pendingCount
          )}
          {renderStatusFilterButton(
            t('employerJobPosts.filters.approved'),
            'APPROVED',
            approvedCount
          )}
          {renderStatusFilterButton(
            t('employerJobPosts.filters.aiRejected'),
            'REJECTED_AI',
            rejectedAICount
          )}
          {renderStatusFilterButton(
            t('employerJobPosts.filters.appealed'),
            'APPEALED',
            appealedCount
          )}
          {renderStatusFilterButton(
            t('employerJobPosts.filters.finalRejected'),
            'REJECTED_FINAL',
            rejectedFinalCount
          )}
        </View>

        {statusFilter === 'APPROVED' && (
          <>
            <Text style={styles.filterLabel}>
              {t('employerJobPosts.filters.visibility')}
            </Text>
            <View style={styles.filterContainer}>
              {renderActiveFilterButton(
                t('employerJobPosts.filters.all'),
                'all',
                approvedCount
              )}
              {renderActiveFilterButton(
                t('employerJobPosts.filters.active'),
                'active',
                activeCount
              )}
              {renderActiveFilterButton(
                t('employerJobPosts.filters.closed'),
                'closed',
                closedCount
              )}
            </View>
          </>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={ACCENT_RED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
            <Text style={styles.retryButtonText}>
              {t('employerJobPosts.errorTryAgain')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {searchQuery || statusFilter !== 'all' || activeFilter !== 'all'
              ? t('employerJobPosts.empty.found')
              : t('employerJobPosts.empty.none')}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || statusFilter !== 'all' || activeFilter !== 'all'
              ? t('employerJobPosts.empty.adjust')
              : t('employerJobPosts.empty.cta')}
          </Text>
          {!searchQuery && statusFilter === 'all' && activeFilter === 'all' && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateJobClick}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>
                {t('employerJobPosts.cta.create')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY_BLUE}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleCreateJobClick}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Appeal Modal - keeping existing implementation */}
      <Modal
        visible={appealModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAppealModalVisible(false)}
      >
        {/* ... existing appeal modal code ... */}
      </Modal>

      {subscriptionInfo && (
        <JobPostLimitModal
          visible={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          currentPlan={subscriptionInfo.planType}
          activeJobs={subscriptionInfo.activeJobPosts}
          limit={subscriptionInfo.jobPostLimit}
        />
      )}
    </SafeAreaView>
  );
}

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
    marginTop: SPACING,
    fontSize: 16,
    color: GRAY_TEXT,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: GRAY_TEXT,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: CARD_BACKGROUND,
    padding: SPACING,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: SPACING,
    paddingVertical: 12,
    marginBottom: SPACING,
    gap: 12,
  },
  voiceInputContainer: {
    flex: 1,
  },
  voiceInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY_TEXT,
    marginBottom: 8,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY_TEXT,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  secondaryFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryFilterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  secondaryFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: GRAY_TEXT,
  },
  secondaryFilterTextActive: {
    color: '#3B82F6',
  },
  listContent: {
    padding: SPACING,
  },
  // Enhanced Job Card Styles
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
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
  jobTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
    lineHeight: 24,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  approvalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    height: 36,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  approvalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsContainer: {
    flexDirection: 'row',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 16,
    gap: 16,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: GRAY_TEXT,
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  salaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_BLUE,
    flex: 1,
  },
  estimationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  estimationText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_PURPLE,
    flex: 1,
  },
  estimationDays: {
    fontWeight: '700',
  },
  statusSection: {
    padding: CARD_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 20,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  rejectionText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
    lineHeight: 20,
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  appealButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  appealedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  appealedText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 20,
  },
  finalRejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  finalRejectionText: {
    flex: 1,
    fontSize: 14,
    color: '#7F1D1D',
    fontWeight: '600',
    lineHeight: 20,
  },
  // Stats Section
  statsSection: {
    padding: CARD_PADDING,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAY_TEXT,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: GRAY_TEXT,
  },
  // Actions Section
  actionsSection: {
    padding: CARD_PADDING,
  },
  actionsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY_TEXT,
    marginBottom: 12,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC',
  },
  toggleButton: {
    borderColor: PRIMARY_BLUE,
  },
  editButton: {
    borderColor: ACCENT_ORANGE,
  },
  deleteButton: {
    borderColor: ACCENT_RED,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  toggleText: {
    color: PRIMARY_BLUE,
  },
  editText: {
    color: ACCENT_ORANGE,
  },
  deleteText: {
    color: ACCENT_RED,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: GRAY_TEXT,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
