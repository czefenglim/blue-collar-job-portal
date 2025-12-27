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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
import VoiceTextInput from '@/components/VoiceTextInput';
import { useLanguage } from '@/contexts/LanguageContext';

// Color palette
const PRIMARY_BLUE = '#1E3A8A';
const ACCENT_ORANGE = '#F59E0B';
const ACCENT_GREEN = '#10B981';
const ACCENT_RED = '#EF4444';
const ACCENT_PURPLE = '#8B5CF6';
const GRAY_TEXT = '#64748B';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

const SPACING = 16;
const CARD_PADDING = 20;

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface QualityScore {
  score: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Applicant {
  id: number;
  userId: number;
  jobId: number;
  status: string;
  appliedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
    profile?: {
      profilePicture?: string;
    };
  };
  job: {
    id: number;
    title: string;
  };
  qualityScore?: QualityScore;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ApplicantsPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'INTERVIEWED' | 'HIRED'
  >('all');
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [qualityScores, setQualityScores] = useState<
    Record<number, QualityScore>
  >({});

  const fetchQualityScores = useCallback(async (applicantList: Applicant[]) => {
    const token = await AsyncStorage.getItem('jwtToken');
    if (!token) return;

    const scores: Record<number, QualityScore> = {};

    const batchSize = 5;
    for (let i = 0; i < applicantList.length; i += batchSize) {
      const batch = applicantList.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (applicant) => {
          try {
            const response = await fetch(
              `${URL}/api/jobs/applicants/${applicant.id}/quality-score`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                scores[applicant.id] = {
                  score: data.data.score,
                  quality: data.data.quality,
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching score for ${applicant.id}:`, error);
          }
        })
      );
    }

    setQualityScores(scores);
  }, []);

  const fetchApplicants = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const token = await AsyncStorage.getItem('jwtToken');

        if (!token) {
          router.replace('/EmployerLoginScreen');
          return;
        }
        const response = await fetch(`${URL}/api/employer/applicants`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch applicants');
        }

        const applicantData = data.data || [];

        if (append) {
          setApplicants((prev) => [...prev, ...applicantData]);
        } else {
          setApplicants(applicantData);
        }

        setPagination(data.pagination);
        setError(null);

        fetchQualityScores(applicantData);
      } catch (error: any) {
        console.error('Error fetching applicants:', error);
        setError(error.message || 'Failed to load applicants');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [router, fetchQualityScores]
  );

  const filterApplicants = useCallback(() => {
    let filtered = applicants;

    if (filter !== 'all') {
      filtered = filtered.filter((app) => app.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.user.fullName.toLowerCase().includes(query) ||
          app.job.title.toLowerCase().includes(query) ||
          app.user.email.toLowerCase().includes(query)
      );
    }

    filtered = filtered.map((app) => ({
      ...app,
      qualityScore: qualityScores[app.id],
    }));

    setFilteredApplicants(filtered);
  }, [applicants, searchQuery, filter, qualityScores]);

  useEffect(() => {
    fetchApplicants(1);
  }, [filter, fetchApplicants]);

  useFocusEffect(
    useCallback(() => {
      fetchApplicants(1);
    }, [fetchApplicants])
  );

  useEffect(() => {
    filterApplicants();
  }, [filterApplicants]);
  const handleStartChat = async (applicant: Applicant, e: any) => {
    e.stopPropagation();

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      let conversationId: number | null = null;

      const checkResponse = await fetch(
        `${URL}/api/chat/conversations/application/${applicant.id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Check response status:', checkResponse.status);

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log('Check response data:', JSON.stringify(checkData, null, 2));

        if (checkData.success && checkData.data && checkData.data.id) {
          conversationId = checkData.data.id;
          console.log('Found existing conversation:', conversationId);
        } else if (checkData.success && !checkData.data) {
          console.log('No conversation found, creating new one...');
          conversationId = null;
        } else {
          console.error('Unexpected response structure:', checkData);
          throw new Error('Invalid response from server');
        }
      } else if (checkResponse.status === 404) {
        console.log('404 - Conversation not found, creating new one...');
        conversationId = null;
      } else {
        const errorData = await checkResponse.json();
        console.error('API error:', errorData);
        throw new Error(errorData.message || 'Failed to check conversation');
      }

      if (!conversationId) {
        console.log('Creating conversation for application:', applicant.id);

        const createResponse = await fetch(`${URL}/api/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ applicationId: applicant.id }),
        });

        console.log('Create response status:', createResponse.status);

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Create error:', errorData);
          throw new Error(errorData.message || 'Failed to create conversation');
        }

        const createData = await createResponse.json();
        console.log(
          'Create response data:',
          JSON.stringify(createData, null, 2)
        );

        if (createData.success && createData.data && createData.data.id) {
          conversationId = createData.data.id;
        } else {
          console.error('Invalid create response:', createData);
          throw new Error('Failed to get conversation ID from create response');
        }
      }

      if (!conversationId) {
        throw new Error('Unable to obtain conversation ID');
      }

      console.log('Navigating to conversation:', conversationId);

      router.push({
        pathname: '/(shared)/chat/[id]',
        params: {
          id: conversationId.toString(),
          name: applicant.user.fullName,
          jobTitle: applicant.job.title,
        },
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert(
        t('common.error'),
        error instanceof Error
          ? error.message
          : t('employerApplicants.errors.startChatFailed')
      );
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplicants(1);
  }, [fetchApplicants]);

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loadingMore) {
      fetchApplicants(pagination.page + 1, true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return ACCENT_ORANGE;
      case 'SHORTLISTED':
        return ACCENT_PURPLE;
      case 'INTERVIEWED':
        return '#3B82F6';
      case 'REJECTED':
        return ACCENT_RED;
      case 'HIRED':
        return ACCENT_GREEN;
      case 'OFFER_ACCEPTED':
        return ACCENT_GREEN;
      default:
        return GRAY_TEXT;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return t('employerApplicants.status.pending');
      case 'SHORTLISTED':
        return t('employerApplicants.status.shortlisted');
      case 'INTERVIEWED':
        return t('employerApplicants.status.interviewed');
      case 'REJECTED':
        return t('employerApplicants.status.rejected');
      case 'HIRED':
        return t('employerApplicants.status.hired');
      case 'OFFER_ACCEPTED':
        return t('employerApplicants.status.offerAccepted');
      default:
        return status;
    }
  };

  const getQualityColor = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return ACCENT_GREEN;
      case 'MEDIUM':
        return ACCENT_ORANGE;
      case 'LOW':
        return ACCENT_RED;
    }
  };

  const getQualityIcon = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return 'star';
      case 'MEDIUM':
        return 'star-half';
      case 'LOW':
        return 'star-outline';
    }
  };

  const getQualityLabel = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return t('employerApplicants.quality.level.high');
      case 'MEDIUM':
        return t('employerApplicants.quality.level.medium');
      case 'LOW':
        return t('employerApplicants.quality.level.low');
    }
  };

  const renderFilterButton = (
    label: string,
    value:
      | 'all'
      | 'PENDING'
      | 'SHORTLISTED'
      | 'REJECTED'
      | 'INTERVIEWED'
      | 'HIRED',
    count: number
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderApplicantCard = ({ item }: { item: Applicant }) => (
    <View style={styles.applicantCard}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() =>
          router.push(`/(employer-hidden)/applicant-details/${item.id}` as Href)
        }
        activeOpacity={0.9}
      >
        {/* Top Header Section */}
        <View style={styles.applicantHeader}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {item.user?.profile?.profilePicture ? (
                <Image
                  source={{ uri: item.user?.profile?.profilePicture }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {item.user.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.applicantName} numberOfLines={1}>
                  {item.user.fullName}
                </Text>
                {item.qualityScore && (
                  <View
                    style={[
                      styles.qualityBadge,
                      {
                        backgroundColor:
                          getQualityColor(item.qualityScore.quality) + '20',
                        borderColor:
                          getQualityColor(item.qualityScore.quality) + '40',
                      },
                    ]}
                  >
                    <Ionicons
                      name={getQualityIcon(item.qualityScore.quality)}
                      size={14}
                      color={getQualityColor(item.qualityScore.quality)}
                    />
                    <Text
                      style={[
                        styles.qualityText,
                        { color: getQualityColor(item.qualityScore.quality) },
                      ]}
                    >
                      {getQualityLabel(item.qualityScore.quality)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.applicantEmail}>{item.user.email}</Text>
              {item.user.phoneNumber && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={14} color={GRAY_TEXT} />
                  <Text style={styles.contactText}>
                    {item.user.phoneNumber}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '15' },
            ]}
          >
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Job Details Section */}
        <View style={styles.jobSection}>
          <View style={styles.jobInfo}>
            <Ionicons name="briefcase-outline" size={18} color={PRIMARY_BLUE} />
            <View style={styles.jobTextContainer}>
              <Text style={styles.jobTitleLabel}>
                {t('employerApplicants.appliedFor')}
              </Text>
              <Text style={styles.jobTitle} numberOfLines={2}>
                {item.job.title}
              </Text>
            </View>
          </View>

          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color={GRAY_TEXT} />
            <Text style={styles.dateText}>
              {new Date(item.appliedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsLabel}>Quick Actions:</Text>
          <View style={styles.quickActions}>
            {/* Chat Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton]}
              onPress={(e) => handleStartChat(item, e)}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name="chatbubble-outline"
                  size={20}
                  color={ACCENT_GREEN}
                />
              </View>
              <Text style={styles.actionButtonText}>
                {t('employerApplicants.actions.chat')}
              </Text>
            </TouchableOpacity>

            {/* View Details Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={(e) => {
                e.stopPropagation();
                router.push(
                  `/(employer-hidden)/applicant-details/${item.id}` as Href
                );
              }}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="eye-outline" size={20} color={PRIMARY_BLUE} />
              </View>
              <Text style={styles.actionButtonText}>
                {t('employerApplicants.actions.view')}
              </Text>
            </TouchableOpacity>

            {/* Hire Button - Only for SHORTLISTED status */}
            {item.status === 'SHORTLISTED' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.hireButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/(employer-hidden)/hire/${item.id}` as Href);
                }}
              >
                <View
                  style={[styles.actionIconContainer, styles.hireIconContainer]}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.actionButtonText, styles.hireText]}>
                  {t('employerApplicants.actions.hire') || 'Hire'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Verify Button - Only for OFFER_ACCEPTED status */}
            {item.status === 'OFFER_ACCEPTED' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.verifyButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/(employer-hidden)/hire/verify/${item.id}` as Href
                  );
                }}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    styles.verifyIconContainer,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.actionButtonText, styles.verifyText]}>
                  Verify
                </Text>
              </TouchableOpacity>
            )}

            {/* Shortlist Button - Only for PENDING status */}
            {item.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.shortlistButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/(employer-hidden)/applicant-details/${item.id}?action=shortlist` as Href
                  );
                }}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    styles.shortlistIconContainer,
                  ]}
                >
                  <Ionicons name="star-outline" size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.actionButtonText, styles.shortlistText]}>
                  {t('employerApplicants.actions.shortlist')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>
            {t('employerApplicants.loading')}
          </Text>
        </View>
      </View>
    );
  }

  const pendingCount = applicants.filter((a) => a.status === 'PENDING').length;
  const shortlistedCount = applicants.filter(
    (a) => a.status === 'SHORTLISTED'
  ).length;
  const rejectedCount = applicants.filter(
    (a) => a.status === 'REJECTED'
  ).length;
  const interviewedCount = applicants.filter(
    (a) => a.status === 'INTERVIEWED'
  ).length;
  const hiredCount = applicants.filter((a) => a.status === 'HIRED').length;

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={GRAY_TEXT} />
          <VoiceTextInput
            style={styles.voiceInputContainer}
            inputStyle={styles.voiceInput}
            placeholder={t('employerApplicants.searchPlaceholder')}
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

        <View style={styles.filterContainer}>
          {renderFilterButton(
            t('employerApplicants.filters.all'),
            'all',
            applicants.length
          )}
          {renderFilterButton(
            t('employerApplicants.filters.pending'),
            'PENDING',
            pendingCount
          )}
          {renderFilterButton(
            t('employerApplicants.filters.shortlisted'),
            'SHORTLISTED',
            shortlistedCount
          )}
          {renderFilterButton(
            t('employerApplicants.filters.interviewed'),
            'INTERVIEWED',
            interviewedCount
          )}
          {renderFilterButton(
            t('employerApplicants.status.hired'),
            'HIRED',
            hiredCount
          )}
          {renderFilterButton(
            t('employerApplicants.filters.rejected'),
            'REJECTED',
            rejectedCount
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pagination.total}</Text>
          <Text style={styles.statLabel}>
            {t('employerApplicants.stats.total')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT_ORANGE }]}>
            {pendingCount}
          </Text>
          <Text style={styles.statLabel}>
            {t('employerApplicants.stats.pending')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT_PURPLE }]}>
            {shortlistedCount}
          </Text>
          <Text style={styles.statLabel}>
            {t('employerApplicants.stats.shortlisted')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: ACCENT_GREEN }]}>
            {hiredCount}
          </Text>
          <Text style={styles.statLabel}>
            {t('employerApplicants.status.hired')}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={ACCENT_RED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchApplicants(1)}
          >
            <Text style={styles.retryButtonText}>
              {t('employerApplicants.tryAgain')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : filteredApplicants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {searchQuery || filter !== 'all'
              ? t('employerApplicants.empty.found')
              : t('employerApplicants.empty.none')}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || filter !== 'all'
              ? t('employerApplicants.empty.adjust')
              : t('employerApplicants.empty.hint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredApplicants}
          renderItem={renderApplicantCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY_BLUE}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={PRIMARY_BLUE} />
                <Text style={styles.loadMoreText}>
                  {t('employerApplicants.loadingMore')}
                </Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    marginBottom: 12,
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
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: PRIMARY_BLUE,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY_TEXT,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: CARD_BACKGROUND,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: GRAY_TEXT,
  },
  listContent: {
    padding: SPACING,
  },
  // Enhanced Applicant Card Styles
  applicantCard: {
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
  applicantHeader: {
    padding: CARD_PADDING,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  profileSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  applicantName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    flex: 1,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginLeft: 8,
    borderWidth: 1,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  applicantEmail: {
    fontSize: 14,
    color: GRAY_TEXT,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  jobSection: {
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  jobTextContainer: {
    flex: 1,
  },
  jobTitleLabel: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontWeight: '500',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY_BLUE,
    lineHeight: 20,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: '500',
  },
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
  },
  chatButton: {
    borderColor: ACCENT_GREEN,
    backgroundColor: '#F0FDF4',
  },
  viewButton: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: '#EFF6FF',
  },
  shortlistButton: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: PRIMARY_BLUE,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hireIconContainer: {
    backgroundColor: ACCENT_GREEN,
    borderColor: ACCENT_GREEN,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY_TEXT,
  },
  hireText: {
    color: '#FFFFFF',
  },
  verifyIconContainer: {
    backgroundColor: ACCENT_PURPLE,
    borderColor: ACCENT_PURPLE,
  },
  verifyText: {
    color: '#FFFFFF',
  },
  shortlistIconContainer: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  shortlistText: {
    color: '#FFFFFF',
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
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: GRAY_TEXT,
  },
  hireButton: {
    backgroundColor: ACCENT_GREEN,
    borderColor: ACCENT_GREEN,
  },
  verifyButton: {
    backgroundColor: ACCENT_PURPLE,
    borderColor: ACCENT_PURPLE,
  },
});
