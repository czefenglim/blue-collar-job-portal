import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface JobDetails {
  job: {
    id: number;
    title: string;
    description: string;
    requirements: string;
    benefits: string;
    jobType: string;
    workingHours: string;
    experienceLevel: string;
    salaryMin: number;
    salaryMax: number;
    salaryType: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    isRemote: boolean;
    isSuspended: boolean;
    suspensionReason: string;
    viewCount: number;
    applicationCount: number;
    approvalStatus: string;
    createdAt: string;
    company: {
      id: number;
      name: string;
      email: string;
      phone: string;
      address: string;
      user: {
        id: number;
        email: string;
        fullName: string;
        phoneNumber: string;
        status: string;
      };
    };
    industry: {
      id: number;
      name: string;
    };
  };
  reportCount: number;
  employerReportCount: number;
  recentReports: {
    id: number;
    reportType: string;
    description: string;
    status: string;
    createdAt: string;
    user: {
      fullName: string;
      email: string;
    };
  }[];
  applicationCount: number;
}

const JobReviewScreen: React.FC = () => {
  const { jobId, reportId } = useLocalSearchParams();
  const router = useRouter();
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<
    'suspend' | 'delete' | 'suspend-employer' | 'dismiss' | null
  >(null);

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadJobDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          {
            text: 'OK',
            onPress: () => router.replace('/(admin-hidden)/login'),
          },
        ]);
        return;
      }

      const response = await fetch(
        `${URL}/api/admin-actions/jobs/${jobId}/review`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setJobDetails(data.data);
      } else {
        Alert.alert('Error', 'Failed to load job details');
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    loadJobDetails();
  }, [loadJobDetails]);

  const handleAction = (type: typeof actionType) => {
    setActionType(type);
    setReason('');
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!reason || reason.trim().length < 10) {
      Alert.alert('Error', 'Please provide a reason (minimum 10 characters)');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('adminToken');

      let endpoint = '';
      let method = 'POST';
      let body: any = { reason: reason.trim() };

      if (reportId) {
        body.reportId = reportId;
      }

      switch (actionType) {
        case 'suspend':
          endpoint = `${URL}/api/admin-actions/jobs/${jobId}/suspend`;
          break;
        case 'delete':
          endpoint = `${URL}/api/admin-actions/jobs/${jobId}/delete`;
          break;
        case 'suspend-employer':
          endpoint = `${URL}/api/admin-actions/employers/${jobDetails?.job.company.user.id}/suspend`;
          break;
        case 'dismiss':
          endpoint = `${URL}/api/admin-actions/reports/${reportId}/dismiss`;
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        Alert.alert('Success', 'Action completed successfully', [
          {
            text: 'OK',
            onPress: () => {
              setShowActionModal(false);
              router.back();
            },
          },
        ]);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to execute action');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      Alert.alert('Error', 'Failed to execute action');
    } finally {
      setIsSubmitting(false);
    }
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

  const formatReportType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionLabel = () => {
    switch (actionType) {
      case 'suspend':
        return 'Suspend Job Post';
      case 'delete':
        return 'Delete Job Post';
      case 'suspend-employer':
        return 'Suspend Employer Account';
      case 'dismiss':
        return 'Dismiss Report';
      default:
        return '';
    }
  };

  const getActionColor = () => {
    switch (actionType) {
      case 'suspend':
        return '#F59E0B';
      case 'delete':
        return '#EF4444';
      case 'suspend-employer':
        return '#DC2626';
      case 'dismiss':
        return '#64748B';
      default:
        return '#1E3A8A';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!jobDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { job, reportCount, employerReportCount, recentReports } = jobDetails;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Status Alerts */}
        {job.isSuspended && (
          <View style={styles.alertBox}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Job is Suspended</Text>
              <Text style={styles.alertText}>{job.suspensionReason}</Text>
            </View>
          </View>
        )}

        {/* Report Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flag" size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{reportCount}</Text>
            <Text style={styles.statLabel}>Reports on Job</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{employerReportCount}</Text>
            <Text style={styles.statLabel}>Reports on Employer</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{job.applicationCount}</Text>
            <Text style={styles.statLabel}>Applications</Text>
          </View>
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Title:</Text>
            <Text style={styles.detailValue}>{job.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company:</Text>
            <Text style={styles.detailValue}>{job.company.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Industry:</Text>
            <Text style={styles.detailValue}>{job.industry.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>
              {job.jobType.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>
              {job.city}, {job.state}
            </Text>
          </View>
          {job.salaryMin && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Salary:</Text>
              <Text style={styles.detailValue}>
                RM {job.salaryMin.toLocaleString()} - RM{' '}
                {job.salaryMax?.toLocaleString()} {job.salaryType}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Posted:</Text>
            <Text style={styles.detailValue}>{formatDate(job.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Views:</Text>
            <Text style={styles.detailValue}>{job.viewCount}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <Text style={styles.descriptionText}>{job.requirements}</Text>
          </View>
        )}

        {/* Employer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employer Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{job.company.user.fullName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{job.company.user.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>
              {job.company.user.phoneNumber || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account Status:</Text>
            <Text
              style={[
                styles.detailValue,
                {
                  color:
                    job.company.user.status === 'ACTIVE'
                      ? '#10B981'
                      : '#EF4444',
                },
              ]}
            >
              {job.company.user.status}
            </Text>
          </View>
        </View>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            {recentReports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportType}>
                    {formatReportType(report.reportType)}
                  </Text>
                  <Text
                    style={[
                      styles.reportStatus,
                      {
                        color:
                          report.status === 'RESOLVED'
                            ? '#10B981'
                            : report.status === 'DISMISSED'
                            ? '#64748B'
                            : '#F59E0B',
                      },
                    ]}
                  >
                    {report.status}
                  </Text>
                </View>
                <Text style={styles.reportDescription}>
                  {report.description}
                </Text>
                <Text style={styles.reportMeta}>
                  Reported by {report.user.fullName} •{' '}
                  {formatDate(report.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>

          {reportId && (
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={() => handleAction('dismiss')}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Dismiss Report</Text>
            </TouchableOpacity>
          )}

          {!job.isSuspended && (
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={() => handleAction('suspend')}
            >
              <Ionicons name="pause-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Suspend Job Post</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleAction('delete')}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Delete Job Post</Text>
          </TouchableOpacity>

          {job.company.user.status !== 'SUSPENDED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendEmployerButton]}
              onPress={() => handleAction('suspend-employer')}
            >
              <Ionicons name="ban" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>
                Suspend Employer Account
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Action Confirmation Modal with KeyboardAvoidingView */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowActionModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getActionLabel()}</Text>
                <TouchableOpacity onPress={() => setShowActionModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalDescription}>
                  Please provide a detailed reason for this action. This will be
                  shared with the affected parties.
                </Text>

                <TextInput
                  style={styles.textArea}
                  placeholder="Enter reason (minimum 10 characters)..."
                  placeholderTextColor="#94A3B8"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowActionModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      { backgroundColor: getActionColor() },
                    ]}
                    onPress={executeAction}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#78350F',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  reportCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  reportMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  dismissButton: {
    backgroundColor: '#64748B',
  },
  suspendButton: {
    backgroundColor: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  suspendEmployerButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
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
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 120,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default JobReviewScreen;
