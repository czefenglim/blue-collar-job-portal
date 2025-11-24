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
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'INTERVIEWED'
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

  useEffect(() => {
    fetchApplicants(1);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchApplicants(1);
    }, [])
  );

  useEffect(() => {
    filterApplicants();
  }, [applicants, searchQuery, filter, qualityScores]);

  const fetchApplicants = async (page: number, append: boolean = false) => {
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

      // Fetch quality scores for all applicants
      fetchQualityScores(applicantData);
    } catch (error: any) {
      console.error('Error fetching applicants:', error);
      setError(error.message || 'Failed to load applicants');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const fetchQualityScores = async (applicantList: Applicant[]) => {
    const token = await AsyncStorage.getItem('jwtToken');
    if (!token) return;

    const scores: Record<number, QualityScore> = {};

    // Fetch scores in parallel (batch of 5)
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
  };

  const filterApplicants = () => {
    let filtered = applicants;

    // Apply status filter first
    if (filter !== 'all') {
      filtered = filtered.filter((app) => app.status === filter);
    }

    // Then apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.user.fullName.toLowerCase().includes(query) ||
          app.job.title.toLowerCase().includes(query) ||
          app.user.email.toLowerCase().includes(query)
      );
    }

    // Add quality scores to filtered applicants
    filtered = filtered.map((app) => ({
      ...app,
      qualityScore: qualityScores[app.id],
    }));

    setFilteredApplicants(filtered);
  };

  // ✅ NEW: Handle starting chat
  // Updated handleStartChat function only

  const handleStartChat = async (applicant: Applicant, e: any) => {
    e.stopPropagation();

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      let conversationId: number | null = null;

      // First, check if conversation exists
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

      // If no conversation found, create one
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

      // ✅ Use absolute path
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
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to start chat. Please try again.'
      );
    }
  };
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplicants(1);
  }, [filter]);

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loadingMore) {
      fetchApplicants(pagination.page + 1, true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'SHORTLISTED':
        return '#8B5CF6';
      case 'INTERVIEWED':
        return '#3B82F6';
      case 'REJECTED':
        return '#EF4444';
      case 'HIRED':
        return '#10B981';
      default:
        return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'SHORTLISTED':
        return 'Shortlisted';
      case 'INTERVIEWED':
        return 'Interviewed';
      case 'REJECTED':
        return 'Rejected';
      case 'HIRED':
        return 'Hired';
      default:
        return status;
    }
  };

  const getQualityColor = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return '#10B981';
      case 'MEDIUM':
        return '#F59E0B';
      case 'LOW':
        return '#EF4444';
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

  const renderFilterButton = (
    label: string,
    value: 'all' | 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'INTERVIEWED',
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
    <TouchableOpacity
      style={styles.applicantCard}
      onPress={() =>
        router.push(`/(employer-hidden)/applicant-details/${item.id}` as Href)
      }
    >
      <View style={styles.applicantHeader}>
        <View style={styles.applicantAvatar}>
          {item.user?.profile?.profilePicture ? (
            <Image
              source={{ uri: item.user?.profile?.profilePicture }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.applicantInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.applicantName} numberOfLines={1}>
              {item.user.fullName}
            </Text>
            {/* Quality Score Badge */}
            {item.qualityScore && (
              <View
                style={[
                  styles.qualityBadge,
                  {
                    backgroundColor:
                      getQualityColor(item.qualityScore.quality) + '20',
                  },
                ]}
              >
                <Ionicons
                  name={getQualityIcon(item.qualityScore.quality)}
                  size={12}
                  color={getQualityColor(item.qualityScore.quality)}
                />
                <Text
                  style={[
                    styles.qualityText,
                    { color: getQualityColor(item.qualityScore.quality) },
                  ]}
                >
                  {item.qualityScore.quality}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.applicantJob} numberOfLines={1}>
            Applied for: {item.job.title}
          </Text>
          <View style={styles.applicantMeta}>
            <Ionicons name="mail-outline" size={14} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.user.email}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.applicantFooter}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '15' },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>

        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#64748B" />
          <Text style={styles.dateText}>
            {new Date(item.appliedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        {/* ✅ NEW: Chat Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          onPress={(e) => handleStartChat(item, e)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#10B981" />
          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>
            Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            router.push(
              `/(employer-hidden)/applicant-details/${item.id}` as Href
            );
          }}
        >
          <Ionicons name="eye-outline" size={18} color="#1E3A8A" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        {item.status === 'PENDING' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={(e) => {
              e.stopPropagation();
              router.push(
                `/(employer-hidden)/applicant-details/${item.id}?action=shortlist` as Href
              );
            }}
          >
            <Ionicons name="star-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
              Shortlist
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading applicants...</Text>
        </View>
      </SafeAreaView>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, job, or email..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          {renderFilterButton('All', 'all', applicants.length)}
          {renderFilterButton('Pending', 'PENDING', pendingCount)}
          {renderFilterButton('Shortlisted', 'SHORTLISTED', shortlistedCount)}
          {renderFilterButton('Interviewed', 'INTERVIEWED', interviewedCount)}
          {renderFilterButton('Rejected', 'REJECTED', rejectedCount)}
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pagination.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {pendingCount}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
            {shortlistedCount}
          </Text>
          <Text style={styles.statLabel}>Shortlisted</Text>
        </View>
      </View>

      {/* Applicants List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchApplicants(1)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredApplicants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {searchQuery || filter !== 'all'
              ? 'No applicants found'
              : 'No applicants yet'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Applications will appear here when job seekers apply for your jobs'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredApplicants}
          renderItem={renderApplicantCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#1E3A8A" />
                <Text style={styles.loadMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
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
    backgroundColor: '#1E3A8A',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#64748B',
  },
  listContent: {
    padding: 16,
  },
  applicantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applicantHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  applicantAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  applicantAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  applicantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  applicantJob: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
  },
  applicantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  applicantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  // ✅ NEW: Chat button style
  chatButton: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  actionButtonPrimary: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
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
    color: '#64748B',
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
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#64748B',
  },
});
