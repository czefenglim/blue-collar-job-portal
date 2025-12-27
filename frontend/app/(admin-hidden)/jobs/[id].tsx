'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface JobDetails {
  id: number;
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  city: string;
  state: string;
  address?: string;
  postcode?: string;
  jobType: string;
  jobTypeLabel?: string;
  workingHours: string;
  workingHoursLabel?: string;
  experienceLevel: string;
  experienceLevelLabel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  salaryTypeLabel?: string;
  isRemote: boolean;
  approvalStatus: string;
  isActive: boolean;
  viewCount: number;
  applicationCount: number;
  applicationDeadline?: string;
  startDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  company: {
    id: number;
    name: string;
    logo?: string;
    isVerified: boolean;
    email?: string;
    phone?: string;
    website?: string;
  };
  industry: {
    id: number;
    name: string;
  };
  _count: {
    applications: number;
  };
  // ✅ NEW: Appeal data
  appeals?: {
    id: number;
    explanation: string;
    evidence?: string;
    status: string;
    createdAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
  }[];
}

export default function AdminJobDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { t, currentLanguage } = useLanguage();

  const fetchJobDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const response = await fetch(
        `${URL}/api/admin/jobs/${id}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setJob(data.data);
      } else {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('adminToken');
          router.replace('/(admin-hidden)/login');
        } else {
          Alert.alert('Error', t('adminJobDetails.errors.loadFailed'));
          router.back();
        }
      }
    } catch (error) {
      console.error('Fetch job details error:', error);
      Alert.alert('Error', t('adminJobDetails.errors.loadFailed'));
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, currentLanguage, router, t]);

  useEffect(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  // ✅ UPDATED: Handle both regular approval and appeal approval
  const handleApprove = () => {
    const isAppeal = job?.approvalStatus === 'APPEALED';
    const title = isAppeal
      ? t('adminJobDetails.actions.approveAppeal')
      : t('adminJobDetails.actions.approve');
    const message = isAppeal
      ? t('adminJobDetails.prompts.confirmApproveAppeal', { title: job?.title })
      : t('adminJobDetails.prompts.confirmApproveJob', { title: job?.title });

    Alert.alert(title, message, [
      { text: t('adminJobDetails.modal.cancel'), style: 'cancel' },
      {
        text: t('adminJobDetails.actions.approve'),
        style: 'default',
        onPress: confirmApprove,
      },
    ]);
  };

  // ✅ UPDATED: Use appeal review endpoint if it's an appeal
  const confirmApprove = async () => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const isAppeal = job?.approvalStatus === 'APPEALED';

      let response;

      if (isAppeal && job?.appeals && job.appeals.length > 0) {
        // ✅ Use appeal review endpoint
        const appealId = job.appeals[0].id;
        response = await fetch(
          `${URL}/api/job-appeals/admin/appeals/${appealId}/review`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              decision: 'APPROVE',
              reviewNotes: 'Appeal approved by admin',
            }),
          }
        );
      } else {
        // ✅ Regular job approval
        response = await fetch(`${URL}/api/admin/jobs/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approvalStatus: 'APPROVED',
          }),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          t('common.success'),
          isAppeal
            ? t('adminJobDetails.alerts.success.approveAppeal')
            : t('adminJobDetails.alerts.success.approveJob'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          data.message || t('adminJobDetails.errors.failApprove')
        );
      }
    } catch (error) {
      console.error('Approve error:', error);
      Alert.alert('Error', t('adminJobDetails.errors.failApprove'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ UPDATED: Handle both regular rejection and appeal rejection
  const handleReject = () => {
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // ✅ UPDATED: Use appeal review endpoint if it's an appeal
  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', t('adminJobDetails.errors.missingReason'));
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const isAppeal = job?.approvalStatus === 'APPEALED';

      let response;

      console.log('isAppeal:', isAppeal);
      console.log('job.appeals:', job?.appeals);

      if (isAppeal && job?.appeals && job.appeals.length > 0) {
        // ✅ Use appeal review endpoint - this will set status to REJECTED_FINAL
        const appealId = job.appeals[0].id;
        response = await fetch(
          `${URL}/api/job-appeals/admin/appeals/${appealId}/review`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              decision: 'REJECT',
              reviewNotes: rejectionReason,
            }),
          }
        );
      } else {
        // ✅ Regular job rejection - set to REJECTED_FINAL
        response = await fetch(`${URL}/api/admin/jobs/${id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approvalStatus: 'REJECTED_FINAL',
            reason: rejectionReason,
          }),
        });
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setShowRejectModal(false);
        Alert.alert(
          t('common.success'),
          isAppeal
            ? t('adminJobDetails.alerts.success.rejectAppeal')
            : t('adminJobDetails.alerts.success.rejectJob'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          data.message || t('adminJobDetails.errors.failReject')
        );
      }
    } catch (error) {
      console.error('Reject error:', error);
      Alert.alert('Error', t('adminJobDetails.errors.failReject'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSalary = (min?: number, max?: number, typeLabel?: string) => {
    if (!min && !max) return 'Not specified';
    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;
    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        typeLabel ? `/${typeLabel}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${typeLabel ? `/${typeLabel}` : ''}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>{t('adminJobDetails.loading')}</Text>
      </View>
    );
  }

  if (!job) {
    return null;
  }

  // ✅ UPDATED: Determine which buttons to show
  const isPending = job.approvalStatus === 'PENDING';
  const isAppealed = job.approvalStatus === 'APPEALED';
  const isApproved = job.approvalStatus === 'APPROVED';
  const isRejected =
    job.approvalStatus === 'REJECTED_AI' ||
    job.approvalStatus === 'REJECTED_FINAL';

  // ✅ Show buttons for PENDING or APPEALED
  const showActionButtons = isPending || isAppealed;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              isPending && styles.statusPending,
              isAppealed && styles.statusAppealed,
              isApproved && styles.statusApproved,
              isRejected && styles.statusRejected,
            ]}
          >
            <Ionicons
              name={
                isPending
                  ? 'time-outline'
                  : isAppealed
                  ? 'document-text-outline'
                  : isApproved
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={16}
              color={
                isPending
                  ? '#F97316'
                  : isAppealed
                  ? '#3B82F6'
                  : isApproved
                  ? '#15803D'
                  : '#DC2626'
              }
            />
            <Text
              style={[
                styles.statusText,
                isPending && styles.statusTextPending,
                isAppealed && styles.statusTextAppealed,
                isApproved && styles.statusTextApproved,
                isRejected && styles.statusTextRejected,
              ]}
            >
              {job.approvalStatus === 'REJECTED_AI'
                ? t('adminJobDetails.status.rejectedAI')
                : job.approvalStatus === 'REJECTED_FINAL'
                ? t('adminJobDetails.status.rejectedFinal')
                : t(
                    `adminJobDetails.status.${job.approvalStatus.toLowerCase()}`
                  )}
            </Text>
          </View>
        </View>

        {/* ✅ NEW: Appeal Information Box - Only show for APPEALED status */}
        {isAppealed && job.appeals && job.appeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.appealBox}>
              <View style={styles.appealHeader}>
                <Ionicons name="document-text" size={20} color="#3B82F6" />
                <Text style={styles.appealTitle}>
                  {t('adminJobDetails.appeal.title')}
                </Text>
              </View>
              <Text style={styles.appealDate}>
                {t('adminJobDetails.appeal.submitted')}:{' '}
                {formatDate(job.appeals[0].createdAt)}
              </Text>
              <Text style={styles.appealLabel}>
                {t('adminJobDetails.appeal.explanationLabel')}
              </Text>
              <Text style={styles.appealText}>
                {job.appeals[0].explanation}
              </Text>

              {job.appeals[0].evidence && (
                <>
                  <Text style={styles.appealLabel}>
                    {t('adminJobDetails.appeal.evidenceLabel')}
                  </Text>
                  <Text style={styles.appealEvidence}>
                    {JSON.parse(job.appeals[0].evidence).length}{' '}
                    {t('adminJobDetails.appeal.filesAttached')}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Company Section */}
        <View style={styles.section}>
          <View style={styles.companyHeader}>
            <View style={styles.companyLogo}>
              {job.company.logo ? (
                <Image
                  source={{ uri: job.company.logo }}
                  style={styles.companyLogo}
                />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Text style={styles.companyLogoText}>
                    {job.company.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{job.company.name}</Text>
              {job.company.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                  <Text style={styles.verifiedText}>
                    {t('adminJobDetails.company.verified')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {job.company.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color="#64748B" />
              <Text style={styles.contactText}>{job.company.email}</Text>
            </View>
          )}

          {job.company.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={16} color="#64748B" />
              <Text style={styles.contactText}>{job.company.phone}</Text>
            </View>
          )}

          {job.company.website && (
            <View style={styles.contactRow}>
              <Ionicons name="globe-outline" size={16} color="#64748B" />
              <Text style={styles.contactText}>{job.company.website}</Text>
            </View>
          )}
        </View>

        {/* Job Title */}
        <View style={styles.section}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.industryText}>{job.industry.name}</Text>
        </View>

        {/* Key Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('adminJobDetails.sections.keyInfo')}
          </Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="location" size={20} color="#1E3A8A" />
              <Text style={styles.infoLabel}>
                {t('adminJobDetails.info.location')}
              </Text>
              <Text style={styles.infoValue}>
                {job.city}, {job.state}
              </Text>
              {job.isRemote && (
                <Text style={styles.remoteTag}>
                  {t('adminJobDetails.info.remoteTag')}
                </Text>
              )}
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="briefcase" size={20} color="#1E3A8A" />
              <Text style={styles.infoLabel}>
                {t('adminJobDetails.info.jobType')}
              </Text>
              <Text style={styles.infoValue}>
                {job.jobTypeLabel || job.jobType.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="cash" size={20} color="#1E3A8A" />
              <Text style={styles.infoLabel}>
                {t('adminJobDetails.info.salary')}
              </Text>
              <Text style={styles.infoValue}>
                {formatSalary(
                  job.salaryMin,
                  job.salaryMax,
                  job.salaryTypeLabel || job.salaryType
                )}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="time" size={20} color="#1E3A8A" />
              <Text style={styles.infoLabel}>
                {t('adminJobDetails.info.workingHours')}
              </Text>
              <Text style={styles.infoValue}>
                {job.workingHoursLabel || job.workingHours.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="school" size={20} color="#1E3A8A" />
              <Text style={styles.infoLabel}>
                {t('adminJobDetails.info.experience')}
              </Text>
              <Text style={styles.infoValue}>
                {job.experienceLevelLabel ||
                  job.experienceLevel.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="calendar" size={20} color="#1E3A8A" />
              <Text style={styles.infoLabel}>
                {t('adminJobDetails.info.startDate')}
              </Text>
              <Text style={styles.infoValue}>{formatDate(job.startDate)}</Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('adminJobDetails.sections.statistics')}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="eye" size={24} color="#1E3A8A" />
              <Text style={styles.statValue}>{job.viewCount}</Text>
              <Text style={styles.statLabel}>
                {t('adminJobDetails.stats.views')}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="document-text" size={24} color="#F97316" />
              <Text style={styles.statValue}>{job._count.applications}</Text>
              <Text style={styles.statLabel}>
                {t('adminJobDetails.stats.applications')}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#15803D" />
              <Text style={styles.statValue}>
                {formatDate(job.createdAt).split(' ')[0]}
              </Text>
              <Text style={styles.statLabel}>
                {t('adminJobDetails.stats.posted')}
              </Text>
            </View>
          </View>
        </View>

        {/* Job Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('adminJobDetails.sections.description')}
          </Text>
          <Text style={styles.descriptionText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('adminJobDetails.sections.requirements')}
            </Text>
            <Text style={styles.descriptionText}>{job.requirements}</Text>
          </View>
        )}

        {/* Benefits */}
        {job.benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('adminJobDetails.sections.benefits')}
            </Text>
            <Text style={styles.descriptionText}>{job.benefits}</Text>
          </View>
        )}

        {/* Rejection Reason */}
        {isRejected && job.rejectionReason && (
          <View style={styles.section}>
            <View style={styles.rejectionBox}>
              <View style={styles.rejectionHeader}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.rejectionTitle}>
                  {t('adminJobDetails.sections.rejectionReason')}
                </Text>
              </View>
              <Text style={styles.rejectionText}>{job.rejectionReason}</Text>
            </View>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: showActionButtons ? 120 : 40 }} />
      </ScrollView>

      {/* ✅ Action Buttons - Show for PENDING or APPEALED */}
      {showActionButtons && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.rejectButtonText}>
                  {isAppealed
                    ? t('adminJobDetails.actions.rejectAppeal')
                    : t('adminJobDetails.actions.reject')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.approveButtonText}>
                  {isAppealed
                    ? t('adminJobDetails.actions.approveAppeal')
                    : t('adminJobDetails.actions.approve')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Modal */}
      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRejectModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {isAppealed
                    ? t('adminJobDetails.modal.titleRejectAppeal')
                    : t('adminJobDetails.modal.titleRejectJob')}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isAppealed
                    ? t('adminJobDetails.modal.subtitleRejectAppeal')
                    : t('adminJobDetails.modal.subtitleRejectJob')}
                </Text>

                <TextInput
                  style={styles.reasonInput}
                  placeholder={t('adminJobDetails.modal.reasonPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setShowRejectModal(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.modalCancelText}>
                      {t('adminJobDetails.modal.cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalRejectButton,
                      isSubmitting && styles.modalButtonDisabled,
                    ]}
                    onPress={confirmReject}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalRejectText}>
                        {isAppealed
                          ? t('adminJobDetails.actions.rejectAppeal')
                          : t('adminJobDetails.modal.titleRejectJob')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
  content: {
    flex: 1,
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusPending: {
    backgroundColor: '#FFF7ED',
  },
  statusAppealed: {
    backgroundColor: '#EFF6FF',
  },
  statusApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusTextPending: {
    color: '#F97316',
  },
  statusTextAppealed: {
    color: '#3B82F6',
  },
  statusTextApproved: {
    color: '#15803D',
  },
  statusTextRejected: {
    color: '#DC2626',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 20,
  },
  // ✅ NEW: Appeal Box Styles
  appealBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  appealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  appealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  appealDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  appealLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  appealText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  appealEvidence: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  evidenceContainer: {
    marginTop: 12,
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
  },
  evidenceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,

    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
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
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#64748B',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  industryText: {
    fontSize: 14,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  remoteTag: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '500',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  rejectionText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  approveButton: {
    backgroundColor: '#15803D',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalCancelButton: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalRejectButton: {
    backgroundColor: '#EF4444',
  },
  modalRejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
