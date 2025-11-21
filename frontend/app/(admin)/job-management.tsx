'use client';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Job {
  id: number;
  title: string;
  slug: string;
  city: string;
  state: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  approvalStatus:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED_AI'
    | 'APPEALED'
    | 'REJECTED_FINAL';
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  rejectionReason?: string;
  company: {
    id: number;
    name: string;
    logo?: string;
    isVerified: boolean;
  };
  industry: {
    id: number;
    name: string;
  };
  _count: {
    applications: number;
    appeals?: number;
  };
}

interface JobCounts {
  pending: number;
  approved: number;
  rejected: number;
  appeals: number;
}

type TabFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPEALS';
type RejectedSubFilter = 'ALL' | 'REJECTED_AI' | 'REJECTED_FINAL';

export default function AdminJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<JobCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    appeals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('PENDING');
  const [rejectedSubFilter, setRejectedSubFilter] =
    useState<RejectedSubFilter>('ALL');

  const router = useRouter();

  useEffect(() => {
    fetchJobsAndCounts();
  }, [tabFilter, rejectedSubFilter]);

  // ✅ NEW: Fetch counts separately
  const fetchCounts = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`${URL}/api/admin/jobs/counts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCounts(data.data);
      }
    } catch (error) {
      console.error('Fetch counts error:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const params = new URLSearchParams({
        page: '1',
        limit: '100',
      });

      // Map tab filter to API parameters
      if (tabFilter === 'APPEALS') {
        params.append('approvalStatus', 'APPEALED');
      } else if (tabFilter === 'REJECTED') {
        if (rejectedSubFilter === 'REJECTED_AI') {
          params.append('approvalStatus', 'REJECTED_AI');
        } else if (rejectedSubFilter === 'REJECTED_FINAL') {
          params.append('approvalStatus', 'REJECTED_FINAL');
        } else {
          // ALL rejected - get both
          params.append('approvalStatus', 'REJECTED_AI,REJECTED_FINAL');
        }
      } else {
        params.append('approvalStatus', tabFilter);
      }

      if (search) params.append('search', search);

      const response = await fetch(
        `${URL}/api/admin/jobs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setJobs(data.data.jobs);
      } else {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('adminToken');
          router.replace('/(admin-hidden)/login');
        }
      }
    } catch (error) {
      console.error('Fetch jobs error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ UPDATED: Fetch both jobs and counts
  const fetchJobsAndCounts = async () => {
    await Promise.all([fetchJobs(), fetchCounts()]);
  };

  const formatSalary = (min?: number, max?: number, type?: string) => {
    if (!min && !max) return 'Not specified';
    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;
    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? `/${type.toLowerCase()}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${
      type ? `/${type.toLowerCase()}` : ''
    }`;
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchJobsAndCounts();
  };

  const handleJobPress = (jobId: number) => {
    router.push(`/(admin-hidden)/jobs/${jobId}`);
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#DCFCE7', color: '#15803D', text: 'Approved' };
      case 'PENDING':
        return { bg: '#FFF7ED', color: '#F97316', text: 'Pending' };
      case 'REJECTED_AI':
        return { bg: '#FEF2F2', color: '#DC2626', text: 'AI Rejected' };
      case 'APPEALED':
        return { bg: '#DBEAFE', color: '#2563EB', text: 'Appealed' };
      case 'REJECTED_FINAL':
        return { bg: '#FEE2E2', color: '#991B1B', text: 'Final Rejection' };
      default:
        return { bg: '#F1F5F9', color: '#64748B', text: status };
    }
  };

  const renderTabButton = (
    label: string,
    value: TabFilter,
    count: number,
    icon: string
  ) => (
    <TouchableOpacity
      style={[styles.tabButton, tabFilter === value && styles.tabButtonActive]}
      onPress={() => {
        setTabFilter(value);
        if (value !== 'REJECTED') {
          setRejectedSubFilter('ALL');
        }
      }}
    >
      <View style={styles.tabContent}>
        <Ionicons
          name={icon as any}
          size={18}
          color={tabFilter === value ? '#1E3A8A' : '#64748B'}
        />
        <Text
          style={[styles.tabText, tabFilter === value && styles.tabTextActive]}
        >
          {label}
        </Text>
        <View style={[styles.badge, tabFilter === value && styles.badgeActive]}>
          <Text
            style={[
              styles.badgeText,
              tabFilter === value && styles.badgeTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRejectedSubFilter = () => (
    <View style={styles.subFilterContainer}>
      <TouchableOpacity
        style={[
          styles.subFilterChip,
          rejectedSubFilter === 'ALL' && styles.subFilterChipActive,
        ]}
        onPress={() => setRejectedSubFilter('ALL')}
      >
        <Text
          style={[
            styles.subFilterText,
            rejectedSubFilter === 'ALL' && styles.subFilterTextActive,
          ]}
        >
          All Rejected
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.subFilterChip,
          rejectedSubFilter === 'REJECTED_AI' && styles.subFilterChipActive,
        ]}
        onPress={() => setRejectedSubFilter('REJECTED_AI')}
      >
        <Ionicons
          name="desktop-outline"
          size={14}
          color={rejectedSubFilter === 'REJECTED_AI' ? '#DC2626' : '#64748B'}
        />
        <Text
          style={[
            styles.subFilterText,
            rejectedSubFilter === 'REJECTED_AI' && styles.subFilterTextActive,
          ]}
        >
          AI Rejected
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.subFilterChip,
          rejectedSubFilter === 'REJECTED_FINAL' && styles.subFilterChipActive,
        ]}
        onPress={() => setRejectedSubFilter('REJECTED_FINAL')}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={rejectedSubFilter === 'REJECTED_FINAL' ? '#991B1B' : '#64748B'}
        />
        <Text
          style={[
            styles.subFilterText,
            rejectedSubFilter === 'REJECTED_FINAL' &&
              styles.subFilterTextActive,
          ]}
        >
          Final Rejected
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderJob = ({ item }: { item: Job }) => {
    const statusBadge = getApprovalStatusBadge(item.approvalStatus);

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleJobPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Company Header */}
        <View style={styles.jobHeader}>
          <View style={styles.companyLogo}>
            <Text style={styles.companyLogoText}>
              {item.company.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.jobHeaderInfo}>
            <Text style={styles.companyName}>{item.company.name}</Text>
            {item.company.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </View>

        {/* Job Title */}
        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Job Details */}
        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>
              {item.city}, {item.state}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="briefcase-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>
              {item.jobType.replace('_', ' ')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>
              {formatSalary(item.salaryMin, item.salaryMax, item.salaryType)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="eye-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>
              {item.viewCount} views · {item._count.applications} applications
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
          >
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </Text>
          </View>

          {/* Appeal indicator for rejected jobs */}
          {item._count.appeals && item._count.appeals > 0 && (
            <View style={styles.appealIndicator}>
              <Ionicons name="document-text" size={14} color="#3B82F6" />
              <Text style={styles.appealText}>
                {item._count.appeals} appeal{item._count.appeals > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {(item.approvalStatus === 'PENDING' ||
            item.approvalStatus === 'APPEALED') && (
            <Text style={styles.tapToReview}>Tap to review</Text>
          )}
        </View>

        {/* Rejection Reason */}
        {(item.approvalStatus === 'REJECTED_AI' ||
          item.approvalStatus === 'REJECTED_FINAL') &&
          item.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.rejectionText} numberOfLines={2}>
                {item.rejectionReason}
              </Text>
            </View>
          )}

        {/* Appeal Status Indicator */}
        {item.approvalStatus === 'APPEALED' && (
          <View style={styles.appealStatusBox}>
            <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
            <Text style={styles.appealStatusText}>
              Employer has submitted an appeal - requires review
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading Jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {renderTabButton(
          'Pending',
          'PENDING',
          counts.pending,
          'hourglass-outline'
        )}
        {renderTabButton(
          'Approved',
          'APPROVED',
          counts.approved,
          'checkmark-circle-outline'
        )}
        {renderTabButton(
          'Rejected',
          'REJECTED',
          counts.rejected,
          'close-circle-outline'
        )}
        {renderTabButton(
          'Appeals',
          'APPEALS',
          counts.appeals,
          'document-text-outline'
        )}
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchJobsAndCounts}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Rejected Sub-Filters */}
        {tabFilter === 'REJECTED' && renderRejectedSubFilter()}
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {tabFilter === 'APPEALS'
                ? 'No pending appeals'
                : tabFilter === 'PENDING'
                ? 'No jobs pending review'
                : tabFilter === 'REJECTED'
                ? 'No rejected jobs'
                : 'No approved jobs'}
            </Text>
          </View>
        }
      />
    </View>
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
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1E3A8A',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#1E3A8A',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },

  filtersSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },

  subFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  subFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subFilterChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  subFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subFilterTextActive: {
    color: '#DC2626',
  },

  list: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jobHeaderInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#15803D',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  jobDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appealIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  appealText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  tapToReview: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  rejectionBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  appealStatusBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  appealStatusText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
});
