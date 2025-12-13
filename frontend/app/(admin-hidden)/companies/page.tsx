import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface TrustScore {
  score: number;
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  levelLabel?: string;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  logo?: string;
  isVerified: boolean;
  isActive: boolean;
  verificationStatus: string;
  verificationStatusLabel?: string;
  createdAt: string;
  industry?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    fullName: string;
    email: string;
    status: string;
  };
  _count: {
    jobs: number;
    reviews: number;
  };
  trustScore?: TrustScore;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED'
  >('all');
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies(1);
  }, [filter, currentLanguage]);

  const fetchCompanies = async (page: number, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      let url = `${URL}/api/admin/companies?page=${page}&limit=20`;

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      if (filter !== 'all') {
        url += `&verificationStatus=${filter}`;
      }

      // Append current language for backend localization
      url += `&lang=${currentLanguage}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch companies');
      }

      if (append) {
        setCompanies((prev) => [...prev, ...data.data]);
      } else {
        setCompanies(data.data);
      }

      setPagination(data.pagination);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      setError(error.message || 'Failed to load companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies(1);
  }, [filter, searchQuery]);

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !loadingMore) {
      fetchCompanies(pagination.page + 1, true);
    }
  };

  const handleSearch = () => {
    fetchCompanies(1);
  };

  const getTrustLevelColor = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return '#10B981';
      case 'GOOD':
        return '#3B82F6';
      case 'FAIR':
        return '#F59E0B';
      case 'POOR':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'REJECTED':
        return '#EF4444';
      case 'DISABLED':
        return '#64748B';
      default:
        return '#94A3B8';
    }
  };

  const renderFilterButton = (
    label: string,
    value: 'all' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED'
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
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCompanyCard = ({ item }: { item: Company }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() =>
        router.push(`/(admin-hidden)/companies/${item.id}` as Href)
      }
    >
      <View style={styles.companyHeader}>
        <View style={styles.companyLogo}>
          {item.logo ? (
            <Image
              source={{ uri: item.logo }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.logoText}>{item.name.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.companyInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.companyName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            )}
          </View>
          <Text style={styles.companyIndustry} numberOfLines={1}>
            {item.industry?.name || t('adminCompanies.noIndustry')}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.locationText}>
              {item.city || t('adminCompanies.locationNA')},{' '}
              {item.state || t('adminCompanies.locationNA')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item._count.jobs}</Text>
          <Text style={styles.statLabel}>{t('adminCompanies.statsJobs')}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item._count.reviews}</Text>
          <Text style={styles.statLabel}>
            {t('adminCompanies.statsReviews')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <View
            style={[
              styles.verificationBadge,
              {
                backgroundColor:
                  getVerificationColor(item.verificationStatus) + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.verificationText,
                { color: getVerificationColor(item.verificationStatus) },
              ]}
            >
              {item.verificationStatusLabel || item.verificationStatus}
            </Text>
          </View>
        </View>
      </View>

      {/* Trust Score */}
      <View style={styles.trustScoreContainer}>
        {item.trustScore ? (
          <View style={styles.trustScoreRow}>
            <View style={styles.trustScoreLeft}>
              <Ionicons name="shield-checkmark" size={18} color="#1E3A8A" />
              <Text style={styles.trustScoreLabel}>
                {t('adminCompanies.trustScore')}
              </Text>
            </View>
            <View style={styles.trustScoreRight}>
              <Text
                style={[
                  styles.trustScoreValue,
                  { color: getTrustLevelColor(item.trustScore.level) },
                ]}
              >
                {item.trustScore.score}
              </Text>
              <View
                style={[
                  styles.trustLevelBadge,
                  {
                    backgroundColor:
                      getTrustLevelColor(item.trustScore.level) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.trustLevelText,
                    { color: getTrustLevelColor(item.trustScore.level) },
                  ]}
                >
                  {item.trustScore.levelLabel || item.trustScore.level}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.trustScoreRow}>
            <Text style={styles.trustScoreNA}>
              {t('adminCompanies.trustScoreUnavailable')}
            </Text>
          </View>
        )}
      </View>

      {/* Owner Info */}
      {item.user && (
        <View style={styles.ownerRow}>
          <Ionicons name="person-outline" size={14} color="#64748B" />
          <Text style={styles.ownerText} numberOfLines={1}>
            {item.user.fullName} ({item.user.email})
          </Text>
          {item.user.status === 'SUSPENDED' && (
            <View style={styles.suspendedBadge}>
              <Text style={styles.suspendedText}>
                {t('adminCompanies.userSuspended')}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {t('adminCompanies.joined')}{' '}
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('adminCompanies.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('adminCompanies.headerTitle')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {t('adminCompanies.headerSubtitle', { count: pagination.total })}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('adminCompanies.searchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                fetchCompanies(1);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          {renderFilterButton(t('adminCompanies.filterAll'), 'all')}
          {renderFilterButton(t('adminCompanies.filterApproved'), 'APPROVED')}
          {renderFilterButton(t('adminCompanies.filterPending'), 'PENDING')}
          {renderFilterButton(t('adminCompanies.filterRejected'), 'REJECTED')}
          {renderFilterButton(t('adminCompanies.filterDisabled'), 'DISABLED')}
        </View>
      </View>

      {/* Company List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchCompanies(1)}
          >
            <Text style={styles.retryButtonText}>
              {t('adminCompanies.tryAgain')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : companies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {t('adminCompanies.emptyTitle')}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || filter !== 'all'
              ? t('adminCompanies.emptyAdjust')
              : t('adminCompanies.emptyNoRegistered')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={companies}
          renderItem={renderCompanyCard}
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
                <Text style={styles.loadMoreText}>
                  {t('adminCompanies.loadingMore')}
                </Text>
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
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
  listContent: {
    padding: 16,
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  companyHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  companyInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  companyIndustry: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  verificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verificationText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trustScoreContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  trustScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trustScoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  trustScoreRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustScoreValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  trustLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trustLevelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trustScoreNA: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  ownerText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  suspendedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suspendedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
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
