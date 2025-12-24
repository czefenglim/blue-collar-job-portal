import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import VoiceTextInput from '@/components/VoiceTextInput';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Report {
  id: number;
  userId: number;
  jobId: number;
  reportType: string;
  description: string;
  evidence: string | null;
  evidenceUrls?: string[];
  status: string;
  statusLabel?: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
  reviewer?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AdminReportsScreen: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0);

  const router = useRouter();
  const { t, currentLanguage } = useLanguage();

  const statusFilters = [
    { key: 'ALL', label: t('adminReports.filters.all'), color: '#64748B' },
    {
      key: 'PENDING',
      label: t('adminReports.filters.pending'),
      color: '#F59E0B',
    },
    {
      key: 'UNDER_REVIEW',
      label: t('adminReports.filters.underReview'),
      color: '#3B82F6',
    },
    {
      key: 'RESOLVED',
      label: t('adminReports.filters.resolved'),
      color: '#10B981',
    },
    {
      key: 'DISMISSED',
      label: t('adminReports.filters.dismissed'),
      color: '#EF4444',
    },
  ];

  const loadReports = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        Alert.alert(
          t('adminReports.errors.authRequiredTitle'),
          t('adminReports.errors.authRequiredMessage'),
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(admin-hidden)/login'),
            },
          ]
        );
        return;
      }

      const statusParam =
        selectedFilter !== 'ALL' ? `&status=${selectedFilter}` : '';
      const response = await fetch(
        `${URL}/api/reports?page=${pagination.page}&limit=${pagination.limit}${statusParam}&lang=${currentLanguage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.data);
        setPagination(data.pagination);
      } else {
        Alert.alert('Error', t('adminReports.errors.loadFailed'));
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert(
        t('adminReports.alerts.error'),
        t('adminReports.errors.loadFailed')
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedFilter,
    pagination.page,
    pagination.limit,
    currentLanguage,
    router,
    t,
  ]);

  const loadPendingAppealsCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(
        `${URL}/api/reports/admin/appeals?status=PENDING`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingAppealsCount(data.data.length);
      }
    } catch (error) {
      console.error('Error loading pending appeals count:', error);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadPendingAppealsCount();
  }, [loadReports, loadPendingAppealsCount]);

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (report) =>
          report.user.fullName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          report.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.reportType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReports();
    loadPendingAppealsCount();
  }, [loadReports, loadPendingAppealsCount]);

  const handleReportPress = (report: Report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleViewJobPost = (report: Report) => {
    // Navigate to job review screen
    router.push({
      pathname: '/(admin-hidden)/reports/job-review/[jobId]',
      params: {
        jobId: report.jobId.toString(),
        reportId: report.id.toString(),
      },
    });
  };

  const formatReportType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: '#F59E0B',
      UNDER_REVIEW: '#3B82F6',
      RESOLVED: '#10B981',
      DISMISSED: '#EF4444',
      PENDING_EMPLOYER_RESPONSE: '#8B5CF6',
    };
    return colors[status] || '#64748B';
  };

  const getReportTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      FAKE_JOB: 'alert-circle',
      MISLEADING_INFO: 'information-circle',
      INAPPROPRIATE_CONTENT: 'ban',
      SCAM_SUSPECTED: 'warning',
      DISCRIMINATION: 'people',
      DUPLICATE_POSTING: 'copy',
      OTHERS: 'ellipsis-horizontal',
    };
    return icons[type] || 'flag';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      currentLanguage === 'ms'
        ? 'ms-MY'
        : currentLanguage === 'zh'
        ? 'zh-CN'
        : currentLanguage === 'ta'
        ? 'ta-IN'
        : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const renderEvidence = (report: Report) => {
    const evidenceUrls = report.evidenceUrls;

    if (
      !evidenceUrls ||
      !Array.isArray(evidenceUrls) ||
      evidenceUrls.length === 0
    ) {
      return null;
    }

    return (
      <View style={styles.evidenceContainer}>
        <Text style={styles.evidenceTitle}>
          {t('adminReports.evidenceTitle')}:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {evidenceUrls.map((url, index) => (
            <TouchableOpacity
              key={index}
              style={styles.evidenceThumbnail}
              onPress={() => Linking.openURL(url)}
            >
              {url.match(/\.(jpg|jpeg|png|gif|heic)$/i) ? (
                <Image
                  source={{ uri: url }}
                  style={styles.evidenceImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.evidenceDocIcon}>
                  <Ionicons name="document" size={32} color="#64748B" />
                </View>
              )}
              <Ionicons
                name="open-outline"
                size={16}
                color="#1E3A8A"
                style={styles.openIcon}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderReportCard = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => handleReportPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.reportTypeContainer}>
          <Ionicons
            name={getReportTypeIcon(item.reportType) as any}
            size={20}
            color="#EF4444"
          />
          <Text style={styles.reportType}>
            {t(`adminReports.reportTypes.${item.reportType}`) ||
              formatReportType(item.reportType)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.statusLabel ||
              t(`adminReports.status.${item.status}`) ||
              item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.reporterInfo}>
        <Ionicons name="person-circle" size={16} color="#64748B" />
        <Text style={styles.reporterText}>
          {item.user.fullName} • {item.user.email}
        </Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewJobButton}
          onPress={() => handleViewJobPost(item)}
        >
          <Ionicons name="briefcase-outline" size={16} color="#1E3A8A" />
          <Text style={styles.viewJobButtonText}>
            {t('adminReports.reportCard.viewJob')}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('adminReports.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#2563eb', '#1e40af']}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                {t('adminReports.headerTitle')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('adminReports.headerSubtitle', { count: pagination.total })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.appealsButton}
              onPress={() => router.push('/(admin-hidden)/appeals')}
            >
              <View style={styles.appealsIconContainer}>
                <Ionicons name="chatbox-ellipses" size={24} color="#FFFFFF" />
                {pendingAppealsCount > 0 && (
                  <View style={styles.appealsBadge}>
                    <Text style={styles.appealsBadgeText}>
                      {pendingAppealsCount > 99 ? '99+' : pendingAppealsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.appealsButtonText}>
                {t('adminReports.appeals')}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" />
          <VoiceTextInput
            style={styles.voiceInputContainer}
            inputStyle={styles.voiceInput}
            placeholder={t('adminReports.searchPlaceholder')}
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
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipActive,
              selectedFilter === filter.key && {
                borderColor: filter.color,
                backgroundColor: filter.color + '10',
              },
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.key && {
                  color: filter.color,
                  fontWeight: '700',
                },
              ]}
            >
              {filter.label}
            </Text>
            {selectedFilter === filter.key && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={filter.color}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reports List */}
      <FlatList
        data={filteredReports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {t('adminReports.empty.title')}
            </Text>
            <Text style={styles.emptySubtext}>
              {t('adminReports.empty.adjust')}
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('adminReports.detailModal.sections.reviewInfo')}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedReport && (
                <>
                  {/* Report Type */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {t('adminReports.detailModal.sections.type')}
                    </Text>
                    <View style={styles.reportTypeRow}>
                      <Ionicons
                        name={
                          getReportTypeIcon(selectedReport.reportType) as any
                        }
                        size={20}
                        color="#EF4444"
                      />
                      <Text style={styles.detailValue}>
                        {t(
                          `adminReports.reportTypes.${selectedReport.reportType}`
                        ) || formatReportType(selectedReport.reportType)}
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {t('adminReports.detailModal.sections.status')}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(selectedReport.status) + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(selectedReport.status) },
                        ]}
                      >
                        {selectedReport.statusLabel ||
                          t(`adminReports.status.${selectedReport.status}`) ||
                          selectedReport.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Reporter Info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {t('adminReports.detailModal.reportedBy')}
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedReport.user.fullName}
                    </Text>
                    <Text style={styles.detailSubvalue}>
                      {selectedReport.user.email}
                    </Text>
                  </View>

                  {/* Description */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {t('adminReports.detailModal.description')}
                    </Text>
                    <Text style={styles.detailValueText}>
                      {selectedReport.description}
                    </Text>
                  </View>

                  {/* Evidence */}
                  {renderEvidence(selectedReport)}

                  {/* Review Info */}
                  {selectedReport.reviewedBy && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        {t('adminReports.detailModal.reviewedBy')}
                      </Text>
                      <Text style={styles.detailValue}>
                        {selectedReport.reviewer?.fullName ||
                          t('adminReports.detailModal.admin')}
                      </Text>
                      <Text style={styles.detailSubvalue}>
                        {formatDate(selectedReport.reviewedAt!)}
                      </Text>
                      {selectedReport.reviewNotes && (
                        <>
                          <Text style={[styles.detailLabel, { marginTop: 12 }]}>
                            {t('adminReports.detailModal.reviewNotes')}
                          </Text>
                          <Text style={styles.detailValueText}>
                            {selectedReport.reviewNotes}
                          </Text>
                        </>
                      )}
                    </View>
                  )}

                  {/* Timestamps */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {t('adminReports.detailModal.submitted')}
                    </Text>
                    <Text style={styles.detailSubvalue}>
                      {formatDate(selectedReport.createdAt)}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.viewJobActionButton}
                onPress={() => {
                  setShowDetailModal(false);
                  if (selectedReport) {
                    handleViewJobPost(selectedReport);
                  }
                }}
              >
                <Ionicons name="briefcase" size={20} color="#FFFFFF" />
                <Text style={styles.viewJobActionButtonText}>
                  {t('adminReports.detailModal.viewJob')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  appealsButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 2,
    minWidth: 70,
  },
  appealsIconContainer: {
    position: 'relative',
  },
  appealsBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  appealsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appealsButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 12,
  },
  filterScrollView: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
    minHeight: 40,
  },
  filterChipActive: {
    // Active styles are applied inline with filter.color
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  listContainer: {
    padding: 20,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reportType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reporterText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  viewJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  viewJobButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  detailSubvalue: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  detailValueText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  reportTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evidenceContainer: {
    marginBottom: 20,
  },
  evidenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  evidenceThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  evidenceDocIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  openIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  viewJobActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  viewJobActionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
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
});

export default AdminReportsScreen;
