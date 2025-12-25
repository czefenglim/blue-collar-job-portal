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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer?: {
    id: number;
    fullName: string;
    email: string;
  };
  job?: {
    id: number;
    title: string;
    isSuspended: boolean;
    suspensionReason: string | null;
    isActive: boolean;
  };
}

const UserReportsScreen: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          {
            text: 'OK',
            onPress: () => router.replace('/LoginScreen'),
          },
        ]);
        return;
      }

      const response = await fetch(`${URL}/api/reports/my-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.data);
      } else {
        Alert.alert('Error', 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReports();
  }, []);

  const handleReportPress = (report: Report) => {
    setSelectedReport(report);
    console.log('report.job?.isSuspended: ', report.job?.isSuspended);
    setShowDetailModal(true);
  };

  const handleDeleteReport = async (reportId: number) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');
              const response = await fetch(`${URL}/api/reports/${reportId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                Alert.alert('Success', 'Report deleted successfully');
                loadReports();
                setShowDetailModal(false);
              } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to delete report');
              }
            } catch (error) {
              console.error('Error deleting report:', error);
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
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

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      PENDING: 'time-outline',
      UNDER_REVIEW: 'eye-outline',
      RESOLVED: 'checkmark-circle',
      DISMISSED: 'close-circle',
      PENDING_EMPLOYER_RESPONSE: 'help-circle-outline',
    };
    return icons[status] || 'flag';
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.evidenceTitle}>Evidence Files:</Text>
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
            {formatReportType(item.reportType)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={14}
            color={getStatusColor(item.status)}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {item.job && (
        <View style={styles.jobInfo}>
          <Ionicons name="briefcase-outline" size={14} color="#64748B" />
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job.title}
          </Text>
        </View>
      )}

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.status === 'RESOLVED' && item.job?.isSuspended && (
          <View style={styles.actionTakenBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.actionTakenText}>Action Taken</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={styles.emptyText}>
        You haven&apos;t submitted any reports. If you encounter any issues with
        job postings, you can report them.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Reports</Text>
          <Text style={styles.headerSubtitle}>
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </Text>
        </View>
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={
          reports.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
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
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedReport && (
                <>
                  {/* Report Status */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadgeLarge,
                        {
                          backgroundColor:
                            getStatusColor(selectedReport.status) + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name={getStatusIcon(selectedReport.status) as any}
                        size={20}
                        color={getStatusColor(selectedReport.status)}
                      />
                      <Text
                        style={[
                          styles.statusTextLarge,
                          { color: getStatusColor(selectedReport.status) },
                        ]}
                      >
                        {selectedReport.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Report Type */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Report Type</Text>
                    <View style={styles.reportTypeRow}>
                      <Ionicons
                        name={
                          getReportTypeIcon(selectedReport.reportType) as any
                        }
                        size={20}
                        color="#EF4444"
                      />
                      <Text style={styles.detailValue}>
                        {formatReportType(selectedReport.reportType)}
                      </Text>
                    </View>
                  </View>

                  {/* Job Info */}
                  {selectedReport.job && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Reported Job</Text>
                      <Text style={styles.detailValue}>
                        {selectedReport.job.title}
                      </Text>
                      {selectedReport.job.isSuspended && (
                        <View style={styles.suspendedAlert}>
                          <Ionicons name="warning" size={16} color="#F59E0B" />
                          <Text style={styles.suspendedText}>
                            This job has been suspended
                          </Text>
                        </View>
                      )}
                      {!selectedReport.job.isActive && (
                        <View style={styles.suspendedAlert}>
                          <Ionicons name="ban" size={16} color="#EF4444" />
                          <Text style={styles.suspendedText}>
                            This job is no longer active
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Description */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Your Report</Text>
                    <Text style={styles.detailValueText}>
                      {selectedReport.description}
                    </Text>
                  </View>

                  {/* Evidence */}
                  {renderEvidence(selectedReport)}

                  {/* Admin Review */}
                  {selectedReport.reviewedBy && (
                    <View style={styles.adminReviewSection}>
                      <View style={styles.adminReviewHeader}>
                        <Ionicons
                          name="shield-checkmark"
                          size={20}
                          color="#1E3A8A"
                        />
                        <Text style={styles.adminReviewTitle}>
                          Admin Review
                        </Text>
                      </View>

                      <View style={styles.reviewInfoCard}>
                        <View style={styles.reviewInfoRow}>
                          <Ionicons
                            name="person-circle"
                            size={16}
                            color="#64748B"
                          />
                          <Text style={styles.reviewInfoText}>
                            Reviewed by Admin
                          </Text>
                        </View>
                        <View style={styles.reviewInfoRow}>
                          <Ionicons name="calendar" size={16} color="#64748B" />
                          <Text style={styles.reviewInfoText}>
                            {formatDate(selectedReport.reviewedAt!)}
                          </Text>
                        </View>
                      </View>

                      {selectedReport.reviewNotes && (
                        <View style={styles.reviewNotesCard}>
                          <Text style={styles.reviewNotesLabel}>
                            Admin Notes:
                          </Text>
                          <Text style={styles.reviewNotesText}>
                            {selectedReport.reviewNotes}
                          </Text>
                        </View>
                      )}

                      {/* Action Taken */}
                      {selectedReport.status === 'RESOLVED' &&
                        selectedReport.job && (
                          <View style={styles.actionTakenCard}>
                            <Text style={styles.actionTakenTitle}>
                              Action Taken:
                            </Text>
                            {selectedReport.job.isSuspended && (
                              <View style={styles.actionItem}>
                                <Ionicons
                                  name="pause-circle"
                                  size={18}
                                  color="#F59E0B"
                                />
                                <Text style={styles.actionItemText}>
                                  Job post has been suspended
                                </Text>
                              </View>
                            )}
                            {!selectedReport.job.isActive && (
                              <View style={styles.actionItem}>
                                <Ionicons
                                  name="trash"
                                  size={18}
                                  color="#EF4444"
                                />
                                <Text style={styles.actionItemText}>
                                  Job post has been removed
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                      {selectedReport.status === 'DISMISSED' && (
                        <View style={styles.dismissedCard}>
                          <Ionicons
                            name="information-circle"
                            size={20}
                            color="#64748B"
                          />
                          <Text style={styles.dismissedText}>
                            After review, no policy violation was found.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Timestamps */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Submitted</Text>
                    <Text style={styles.detailSubvalue}>
                      {formatDate(selectedReport.createdAt)}
                    </Text>
                  </View>

                  {/* Delete Button (only for pending reports) */}
                  {selectedReport.status === 'PENDING' && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteReport(selectedReport.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#EF4444"
                      />
                      <Text style={styles.deleteButtonText}>Delete Report</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  listContainer: {
    padding: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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
    marginBottom: 8,
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
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  jobTitle: {
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
  actionTakenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  actionTakenText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: 8,
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
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suspendedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  suspendedText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
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
  adminReviewSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  adminReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  adminReviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  reviewInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewInfoText: {
    fontSize: 14,
    color: '#475569',
  },
  reviewNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewNotesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  reviewNotesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionTakenCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  actionTakenTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  actionItemText: {
    fontSize: 13,
    color: '#065F46',
  },
  dismissedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dismissedText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default UserReportsScreen;
