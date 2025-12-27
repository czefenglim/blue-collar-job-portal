'use client';

import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import VoiceTextInput from '@/components/VoiceTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Job {
  id: number;
  title: string;
  slug: string;
  city: string;
  state: string;
  jobType: string;
  jobTypeLabel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  salaryTypeLabel?: string;
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
  const { t, currentLanguage } = useLanguage();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useFocusEffect(
    useCallback(() => {
      fetchJobsAndCounts();
    }, [tabFilter, rejectedSubFilter, currentLanguage])
  );

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

      if (tabFilter === 'APPEALS') {
        params.append('approvalStatus', 'APPEALED');
      } else if (tabFilter === 'REJECTED') {
        if (rejectedSubFilter === 'REJECTED_AI') {
          params.append('approvalStatus', 'REJECTED_AI');
        } else if (rejectedSubFilter === 'REJECTED_FINAL') {
          params.append('approvalStatus', 'REJECTED_FINAL');
        } else {
          params.append('approvalStatus', 'REJECTED_AI,REJECTED_FINAL');
        }
      } else {
        params.append('approvalStatus', tabFilter);
      }

      if (search) params.append('search', search);
      // ✅ Pass current language to backend for localized enum labels
      params.append('lang', currentLanguage);

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

        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
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

  const fetchJobsAndCounts = async () => {
    await Promise.all([fetchJobs(), fetchCounts()]);
  };

  const formatSalary = (min?: number, max?: number, typeLabel?: string) => {
    if (!min && !max) return t('adminJobManagement.salary.notSpecified');
    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;
    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        typeLabel ? `/${typeLabel}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${typeLabel ? `/${typeLabel}` : ''}`;
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
        return {
          bg: '#10B981',
          text: t('adminJobManagement.status.approved'),
          gradient: ['#10B981', '#059669'],
          icon: 'checkmark-circle',
        };
      case 'PENDING':
        return {
          bg: '#F59E0B',
          text: t('adminJobManagement.status.pendingReview'),
          gradient: ['#F59E0B', '#D97706'],
          icon: 'time-outline',
        };
      case 'REJECTED_AI':
        return {
          bg: '#EF4444',
          text: t('adminJobManagement.status.aiRejected'),
          gradient: ['#EF4444', '#DC2626'],
          icon: 'close-circle-outline',
        };
      case 'APPEALED':
        return {
          bg: '#3B82F6',
          text: t('adminJobManagement.status.appealPending'),
          gradient: ['#3B82F6', '#1D4ED8'],
          icon: 'document-text-outline',
        };
      case 'REJECTED_FINAL':
        return {
          bg: '#991B1B',
          text: t('adminJobManagement.status.finalRejection'),
          gradient: ['#DC2626', '#991B1B'],
          icon: 'shield-checkmark-outline',
        };
      default:
        return {
          bg: '#64748B',
          text: status,
          gradient: ['#64748B', '#475569'],
          icon: 'help-circle-outline',
        };
    }
  };

  const getTabGradient = (isActive: boolean) => {
    return isActive ? ['#1E3A8A', '#2563EB'] : ['#F1F5F9', '#E2E8F0'];
  };

  const renderTabButton = (
    label: string,
    value: TabFilter,
    count: number,
    icon: string
  ) => {
    const isActive = tabFilter === value;

    return (
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => {
          setTabFilter(value);
          if (value !== 'REJECTED') {
            setRejectedSubFilter('ALL');
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getTabGradient(isActive)}
          style={styles.tabGradient}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={icon as any}
              size={18}
              color={isActive ? '#FFFFFF' : '#64748B'}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {label}
            </Text>
            <View style={[styles.badge, isActive && styles.badgeActive]}>
              <Text
                style={[styles.badgeText, isActive && styles.badgeTextActive]}
              >
                {count}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderRejectedSubFilter = () => {
    const getChipStyle = (isActive: boolean) => {
      return isActive
        ? {
            gradient: ['#FEE2E2', '#FECACA'],
            textColor: '#DC2626',
            borderColor: '#FCA5A5',
          }
        : {
            gradient: ['#F8FAFC', '#F1F5F9'],
            textColor: '#64748B',
            borderColor: '#E2E8F0',
          };
    };

    return (
      <View style={styles.subFilterContainer}>
        {(['ALL', 'REJECTED_AI', 'REJECTED_FINAL'] as RejectedSubFilter[]).map(
          (filter) => {
            const isActive = rejectedSubFilter === filter;
            const style = getChipStyle(isActive);
            const iconName =
              filter === 'REJECTED_AI'
                ? 'desktop-outline'
                : filter === 'REJECTED_FINAL'
                ? 'shield-checkmark-outline'
                : 'list-outline';

            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setRejectedSubFilter(filter)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={style.gradient}
                  style={[
                    styles.subFilterChip,
                    { borderColor: style.borderColor },
                  ]}
                >
                  <Ionicons name={iconName} size={14} color={style.textColor} />
                  <Text
                    style={[styles.subFilterText, { color: style.textColor }]}
                  >
                    {filter === 'ALL'
                      ? t('adminJobManagement.rejectedFilters.allRejected')
                      : filter === 'REJECTED_AI'
                      ? t('adminJobManagement.rejectedFilters.aiRejected')
                      : t('adminJobManagement.rejectedFilters.finalRejected')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          }
        )}
      </View>
    );
  };

  const renderJob = ({ item, index }: { item: Job; index: number }) => {
    const statusBadge = getApprovalStatusBadge(item.approvalStatus);
    const daysAgo = Math.floor(
      (new Date().getTime() - new Date(item.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return (
      <Animated.View
        style={[
          styles.jobCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleJobPress(item.id)}
          activeOpacity={0.7}
        >
          {/* Card Header with Gradient Background */}
          <LinearGradient
            colors={['#F8FAFC', '#F1F5F9']}
            style={styles.cardHeader}
          >
            <View style={styles.jobHeader}>
              <View style={styles.companyLogoContainer}>
                {item.company.logo ? (
                  <Image
                    source={{ uri: item.company.logo }}
                    style={styles.companyLogo}
                  />
                ) : (
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.companyLogoPlaceholder}
                  >
                    <Text style={styles.companyLogoText}>
                      {item.company.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.jobHeaderInfo}>
                <View style={styles.companyNameRow}>
                  <Text style={styles.companyName} numberOfLines={1}>
                    {item.company.name}
                  </Text>
                  {item.company.isVerified && (
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.verifiedBadge}
                    >
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      <Text style={styles.verifiedText}>
                        {t('adminJobManagement.jobCard.verified')}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                <Text style={styles.industryText}>{item.industry.name}</Text>
              </View>

              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.arrowContainer}
              >
                <Ionicons name="chevron-forward" size={20} color="#4B5563" />
              </LinearGradient>
            </View>
          </LinearGradient>

          {/* Job Content */}
          <View style={styles.jobContent}>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.jobMeta}>
              <View style={styles.metaRow}>
                <LinearGradient
                  colors={['#E0F2FE', '#BAE6FD']}
                  style={styles.metaIconContainer}
                >
                  <Ionicons name="location-outline" size={16} color="#0EA5E9" />
                </LinearGradient>
                <Text style={styles.metaText}>
                  {item.city}, {item.state}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <LinearGradient
                  colors={['#FEF3C7', '#FDE68A']}
                  style={styles.metaIconContainer}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color="#D97706"
                  />
                </LinearGradient>
                <Text style={styles.metaText}>
                  {item.jobTypeLabel || item.jobType.replace('_', ' ')}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <LinearGradient
                  colors={['#D1FAE5', '#A7F3D0']}
                  style={styles.metaIconContainer}
                >
                  <Ionicons name="cash-outline" size={16} color="#059669" />
                </LinearGradient>
                <Text style={styles.metaText}>
                  {formatSalary(
                    item.salaryMin,
                    item.salaryMax,
                    item.salaryTypeLabel || item.salaryType
                  )}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.statIconContainer}
                >
                  <Ionicons name="eye-outline" size={14} color="#4B5563" />
                </LinearGradient>
                <View>
                  <Text style={styles.statNumber}>{item.viewCount}</Text>
                  <Text style={styles.statLabel}>
                    {t('adminJobManagement.jobCard.views')}
                  </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.statIconContainer}
                >
                  <Ionicons name="person-outline" size={14} color="#4B5563" />
                </LinearGradient>
                <View>
                  <Text style={styles.statNumber}>
                    {item._count.applications}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t('adminJobManagement.jobCard.applications')}
                  </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.statIconContainer}
                >
                  <Ionicons name="time-outline" size={14} color="#4B5563" />
                </LinearGradient>
                <View>
                  <Text style={styles.statNumber}>{daysAgo}</Text>
                  <Text style={styles.statLabel}>
                    {t('adminJobManagement.jobCard.daysAgo')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Status Section */}
          <LinearGradient
            colors={statusBadge.gradient}
            style={styles.statusSection}
          >
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <View style={styles.statusIconContainer}>
                  <Ionicons
                    name={statusBadge.icon as any}
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.statusText}>{statusBadge.text}</Text>
              </View>

              {item._count.appeals && item._count.appeals > 0 && (
                <View style={styles.appealIndicator}>
                  <Ionicons name="document-text" size={14} color="#FFFFFF" />
                  <Text style={styles.appealText}>
                    {item._count.appeals}{' '}
                    {item._count.appeals > 1
                      ? t('adminJobManagement.jobCard.appeals')
                      : t('adminJobManagement.jobCard.appeal')}
                  </Text>
                </View>
              )}
            </View>

            {(item.approvalStatus === 'PENDING' ||
              item.approvalStatus === 'APPEALED') && (
              <View style={styles.actionPrompt}>
                <Ionicons
                  name="arrow-forward-circle"
                  size={16}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.actionText}>
                  {t('adminJobManagement.prompts.tapToReview')}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Rejection/Appeal Info */}
          {(item.approvalStatus === 'REJECTED_AI' ||
            item.approvalStatus === 'REJECTED_FINAL') &&
            item.rejectionReason && (
              <View style={styles.infoBox}>
                <LinearGradient
                  colors={['#FEE2E2', '#FECACA']}
                  style={styles.infoBoxGradient}
                >
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.infoBoxText} numberOfLines={2}>
                    {item.rejectionReason}
                  </Text>
                </LinearGradient>
              </View>
            )}

          {item.approvalStatus === 'APPEALED' && (
            <View style={styles.infoBox}>
              <LinearGradient
                colors={['#E0F2FE', '#BAE6FD']}
                style={styles.infoBoxGradient}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#0EA5E9"
                />
                <Text style={[styles.infoBoxText, { color: '#0369A1' }]}>
                  {t('adminJobManagement.jobCard.appealPrompt')}
                </Text>
              </LinearGradient>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#F8FAFC', '#F1F5F9']}
          style={styles.loadingBackground}
        >
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            {t('adminJobManagement.loading')}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.background}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#2563eb', '#1e40af']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>
              {t('adminJobManagement.title')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('adminJobManagement.headerSubtitle')}
            </Text>
          </LinearGradient>
        </View>

        {/* Enhanced Tab Bar */}
        <View style={styles.tabBar}>
          <BlurView intensity={90} tint="light" style={styles.tabBlur}>
            <View style={styles.tabContentContainer}>
              {renderTabButton(
                t('adminJobManagement.tabs.pending'),
                'PENDING',
                counts.pending,
                'hourglass-outline'
              )}
              {renderTabButton(
                t('adminJobManagement.tabs.approved'),
                'APPROVED',
                counts.approved,
                'checkmark-circle-outline'
              )}
              {renderTabButton(
                t('adminJobManagement.tabs.rejected'),
                'REJECTED',
                counts.rejected,
                'close-circle-outline'
              )}
              {renderTabButton(
                t('adminJobManagement.tabs.appeals'),
                'APPEALS',
                counts.appeals,
                'document-text-outline'
              )}
            </View>
          </BlurView>
        </View>

        {/* Enhanced Search Section */}
        <View style={styles.filtersSection}>
          <BlurView intensity={80} tint="light" style={styles.searchBlur}>
            <View style={styles.searchContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.searchIconContainer}
              >
                <Ionicons name="search" size={18} color="#4B5563" />
              </LinearGradient>

              <VoiceTextInput
                style={styles.voiceInputContainer}
                inputStyle={styles.voiceInput}
                placeholder={t('adminJobManagement.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={fetchJobsAndCounts}
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

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.clearButton}
                >
                  <LinearGradient
                    colors={['#F3F4F6', '#E5E7EB']}
                    style={styles.clearIconContainer}
                  >
                    <Ionicons name="close-circle" size={18} color="#4B5563" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>

          {tabFilter === 'REJECTED' && renderRejectedSubFilter()}
        </View>

        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="briefcase-outline" size={48} color="#9CA3AF" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {tabFilter === 'APPEALS'
                  ? t('adminJobManagement.empty.appealsTitle')
                  : tabFilter === 'PENDING'
                  ? t('adminJobManagement.empty.pendingTitle')
                  : tabFilter === 'REJECTED'
                  ? t('adminJobManagement.empty.rejectedTitle')
                  : t('adminJobManagement.empty.approvedTitle')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tabFilter === 'APPEALS'
                  ? t('adminJobManagement.empty.appealsSubtitle')
                  : tabFilter === 'PENDING'
                  ? t('adminJobManagement.empty.pendingSubtitle')
                  : tabFilter === 'REJECTED'
                  ? t('adminJobManagement.empty.rejectedSubtitle')
                  : t('adminJobManagement.empty.approvedSubtitle')}
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  tabBar: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tabContentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flex: 1,
    overflow: 'hidden',
  },
  tabGradient: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 52,
    gap: 12,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInputContainer: {
    flex: 1,
  },
  voiceInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1,
  },
  subFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jobHeaderInfo: {
    flex: 1,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  industryText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  jobContent: {
    padding: 20,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    lineHeight: 26,
  },
  jobMeta: {
    gap: 12,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  statusSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appealIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  appealText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  infoBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoBoxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
});
