import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface JobDetails {
  id: number;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  city: string;
  state: string;
  address: string | null;
  jobType: string;
  workingHours: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  company: {
    id: number;
    name: string;
    logo: string | null;
    isVerified: boolean;
    verifiedDate: string | null;
  };
  industry: {
    id: number;
    name: string;
  };
}

export default function AdminJobDetailScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');

      const response = await fetch(`${URL}/api/admin/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', error.message || 'Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!job) return;

    Alert.alert(
      'Approve Job Post',
      `Are you sure you want to approve "${job.title}"? The job will become visible to all job seekers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${URL}/api/admin/jobs/${job.id}/approve`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Job approved successfully', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve job');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!job) return;

    Alert.prompt(
      'Reject Job Post',
      `Provide a detailed reason for rejecting "${job.title}". This will be sent to the employer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Error', 'Rejection reason is required');
              return;
            }

            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${URL}/api/admin/jobs/${job.id}/reject`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ reason: reason.trim() }),
                }
              );

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Job rejected', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject job');
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Job Not Found</Text>
        <Text style={styles.errorText}>
          The job you're looking for doesn't exist.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canTakeAction = job.approvalStatus === 'PENDING';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Review</Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
            <Text style={styles.statusText}>PENDING REVIEW</Text>
          </View>
        </View>

        {/* AI Warning */}
        <View style={styles.aiWarningCard}>
          <View style={styles.aiWarningHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#f59e0b" />
            <Text style={styles.aiWarningTitle}>AI Verification Alert</Text>
          </View>
          <Text style={styles.aiWarningText}>
            - This job post has been flagged by our AI system and requires human
            - review before approval. + {t('adminJobApproval.flaggedAiNotice')}
          </Text>
        </View>

        {/* Job Info Card */}
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.companyRow}>
            <Ionicons name="business-outline" size={18} color="#64748b" />
            <Text style={styles.companyName}>{job.company.name}</Text>
            {job.company.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <View style={styles.industryBadge}>
            <Text style={styles.industryText}>{job.industry.name}</Text>
          </View>
        </View>

        {/* Job Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={20} color="#64748b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Job Type</Text>
                <Text style={styles.detailValue}>
                  {job.jobType.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#64748b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Working Hours</Text>
                <Text style={styles.detailValue}>
                  {job.workingHours.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="school-outline" size={20} color="#64748b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Experience Level</Text>
                <Text style={styles.detailValue}>
                  {job.experienceLevel.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#64748b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {job.city}, {job.state}
                </Text>
              </View>
            </View>

            {job.salaryMin && job.salaryMax && (
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={20} color="#64748b" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Salary Range</Text>
                  <Text style={styles.detailValue}>
                    RM{job.salaryMin.toLocaleString()} - RM
                    {job.salaryMax.toLocaleString()}{' '}
                    {job.salaryType && `(${job.salaryType})`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Description</Text>
          <Text style={styles.contentText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Requirements</Text>
            <Text style={styles.contentText}>{job.requirements}</Text>
          </View>
        )}

        {/* Benefits */}
        {job.benefits && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Benefits</Text>
            <Text style={styles.contentText}>{job.benefits}</Text>
          </View>
        )}

        {/* Company Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Company Information</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={20} color="#64748b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Company Name</Text>
                <Text style={styles.detailValue}>{job.company.name}</Text>
              </View>
            </View>
            {job.company.verifiedDate && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#64748b"
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Verified On</Text>
                  <Text style={styles.detailValue}>
                    {new Date(job.company.verifiedDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacing for fixed buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Action Buttons */}
      {canTakeAction && (
        <View style={styles.fixedActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIconButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusContainer: {
    padding: 16,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  aiWarningCard: {
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  aiWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  aiWarningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    color: '#64748b',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  industryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  industryText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  detailsGrid: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  contentText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  fixedActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
