import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useLanguage } from '@/contexts/LanguageContext';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface Job {
  id: number;
  title: string;
  slug: string;
  description: string;
  requirements?: string;
  benefits?: string;
  jobType: string;
  jobTypeLabel?: string; // already localized from backend
  workingHours: string;
  workingHoursLabel?: string; // localized
  experienceLevel: string;
  experienceLevelLabel?: string; // localized
  skills?: string;
  city: string;
  state: string;
  postcode?: string;
  address?: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  salaryTypeLabel?: string; // localized
  applicationDeadline?: string;
  startDate?: string;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  applicationCount: number;
  approvalStatus: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  industry: {
    id: number;
    name: string; // already localized from backend
  };
  company: {
    id: number;
    name: string;
    logo?: string;
    city?: string;
    state?: string;
  };
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const jobId = params.id as string;
  const { t, currentLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobDetail = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }
      const response = await fetch(
        `${URL}/api/jobs/getJob/${jobId}?lang=${currentLanguage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || t('common.somethingWentWrong'));
      }
      setJob(data.data);
    } catch (error: any) {
      Alert.alert(
        t('employerJobDetails.errors.title'),
        error.message || t('employerJobDetails.errors.loadFail')
      );
      router.back();
    } finally {
      setLoading(false);
    }
  }, [jobId, currentLanguage, router, t]);

  useEffect(() => {
    fetchJobDetail();
  }, [fetchJobDetail]);

  useFocusEffect(
    useCallback(() => {
      fetchJobDetail();
    }, [fetchJobDetail])
  );

  const handleToggleStatus = async () => {
    if (!job) return;

    if (
      job.approvalStatus === 'REJECTED_AI' ||
      job.approvalStatus === 'PENDING_REVIEW' ||
      job.approvalStatus === 'SUSPENDED'
    ) {
      Alert.alert(
        t('employerJobDetails.actions.cannotActivate'),
        t('employerJobDetails.actions.cannotActivateMessage')
      );
      return;
    }

    const newStatus = job.isActive ? 'closed' : 'active';
    const message = job.isActive
      ? t('employerJobDetails.status.toggleCloseMessage')
      : t('employerJobDetails.status.toggleActivateMessage');

    Alert.alert(
      job.isActive
        ? t('employerJobDetails.actions.closeTitle')
        : t('employerJobDetails.actions.activateTitle'),
      message,
      [
        { text: t('employerJobDetails.actions.cancel'), style: 'cancel' },
        {
          text: job.isActive
            ? t('employerJobDetails.actions.close')
            : t('employerJobDetails.actions.activate'),
          style: job.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/jobs/${jobId}/toggle-status`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message || t('employerJobDetails.errors.updateStatus')
                );
              }

              Alert.alert(
                t('employerJobDetails.success.title'),
                newStatus === 'active'
                  ? t('employerJobDetails.success.activated')
                  : t('employerJobDetails.success.closed')
              );
              fetchJobDetail(); // Refresh data
            } catch (error: any) {
              Alert.alert(
                t('employerJobDetails.errors.title'),
                error.message || t('employerJobDetails.errors.updateStatus')
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/(employer-hidden)/job-post-details/${jobId}/edit` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      t('employerJobDetails.delete.title'),
      t('employerJobDetails.delete.confirm'),
      [
        { text: t('employerJobDetails.actions.cancel'), style: 'cancel' },
        {
          text: t('employerJobDetails.actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(`${URL}/api/jobs/delete/${jobId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message || t('employerJobDetails.errors.deleteFail')
                );
              }

              Alert.alert(
                t('employerJobDetails.success.title'),
                t('employerJobDetails.success.deleted'),
                [
                  {
                    text: t('common.ok'),
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                t('employerJobDetails.errors.title'),
                error.message || t('employerJobDetails.errors.deleteFail')
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ===================================================================
  // NEW: COPY ADDRESS FUNCTION
  // ===================================================================
  const handleCopyAddress = async () => {
    if (!job) return;

    const fullAddress = [
      job.address,
      job.city,
      job.state,
      job.postcode,
      'Malaysia',
    ]
      .filter(Boolean)
      .join(', ');

    try {
      await Clipboard.setStringAsync(fullAddress);
      Alert.alert(
        t('employerJobDetails.copyAddress.title'),
        t('employerJobDetails.copyAddress.success')
      );
    } catch (error) {
      console.error('Error copying:', error);
      Alert.alert(
        t('employerJobDetails.errors.title'),
        t('employerJobDetails.copyAddress.error')
      );
    }
  };

  // ===================================================================
  // NEW: OPEN IN GOOGLE MAPS FUNCTION
  // ===================================================================
  const handleOpenInMaps = async () => {
    if (!job) return;

    // Build full address for search
    const fullAddress = [
      job.address,
      job.city,
      job.state,
      job.postcode,
      'Malaysia',
    ]
      .filter(Boolean)
      .join(', ');

    // Encode for URL
    const encodedAddress = encodeURIComponent(fullAddress);

    // Different URLs for iOS and Android
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    });

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert(
        t('employerJobDetails.errors.title'),
        t('employerJobDetails.openMaps.error')
      );
    }
  };

  const formatSalary = (min?: number, max?: number, type?: string) => {
    if (!min && !max) return t('employerJobDetails.salary.negotiable');
    const typeLabel = type
      ? ` / ${
          /^[A-Z_]+$/.test(type) ? type.toLowerCase().replace('_', ' ') : type
        }`
      : '';
    if (min && max)
      return `${t('employerJobDetails.salary.rm')} ${min} - ${t(
        'employerJobDetails.salary.rm'
      )} ${max}${typeLabel}`;
    if (min)
      return `${t('employerJobDetails.salary.from')} ${t(
        'employerJobDetails.salary.rm'
      )} ${min}${typeLabel}`;
    if (max)
      return `${t('employerJobDetails.salary.upTo')} ${t(
        'employerJobDetails.salary.rm'
      )} ${max}${typeLabel}`;
    return t('employerJobDetails.salary.negotiable');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>
            {t('employerJobDetails.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {t('employerJobDetails.notFound')}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            job.isActive ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <Ionicons
            name={job.isActive ? 'checkmark-circle' : 'pause-circle'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>
            {job.isActive
              ? t('employerJobDetails.status.active')
              : t('employerJobDetails.status.closed')}
          </Text>
        </View>

        {/* Rejection / Pending Review Banner */}
        {job.approvalStatus === 'REJECTED_AI' && (
          <View style={[styles.statusBanner, styles.statusRejected]}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            <Text style={styles.statusText}>
              {t('employerJobDetails.status.rejectedAi')}
            </Text>
          </View>
        )}
        {job.approvalStatus === 'PENDING_REVIEW' && (
          <View style={[styles.statusBanner, styles.statusPending]}>
            <Ionicons name="time" size={20} color="#FFFFFF" />
            <Text style={styles.statusText}>
              {t('employerJobDetails.status.pendingReview')}
            </Text>
          </View>
        )}

        {/* Job Title & Company */}
        <View style={styles.section}>
          <View style={styles.companyHeader}>
            {job.company.logo ? (
              <Image
                source={{ uri: job.company.logo }}
                style={styles.companyLogoLarge}
              />
            ) : (
              <View style={styles.companyLogoPlaceholderLarge}>
                <Text style={styles.companyLogoTextLarge}>
                  {job.company.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.companyName}>{job.company.name}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color="#64748B" />
              <Text style={styles.metaText}>
                {job.city}, {job.state}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="briefcase" size={16} color="#64748B" />
              <Text style={styles.metaText}>
                {job.jobTypeLabel || job.jobType.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Ionicons name="eye" size={24} color="#1E3A8A" />
            <Text style={styles.statNumber}>{job.viewCount}</Text>
            <Text style={styles.statLabel}>
              {t('employerJobDetails.stats.views')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="document-text" size={24} color="#1E3A8A" />
            <Text style={styles.statNumber}>{job.applicationCount}</Text>
            <Text style={styles.statLabel}>
              {t('employerJobDetails.stats.applications')}
            </Text>
          </View>
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobDetails.sections.details')}
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('employerJobDetails.labels.industry')}
            </Text>
            <Text style={styles.detailValue}>{job.industry.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('employerJobDetails.labels.workingHours')}
            </Text>
            <Text style={styles.detailValue}>
              {job.workingHoursLabel || job.workingHours.replace('_', ' ')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('employerJobDetails.labels.experienceLevel')}
            </Text>
            <Text style={styles.detailValue}>
              {job.experienceLevelLabel ||
                job.experienceLevel.replace('_', ' ')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('employerJobDetails.labels.salary')}
            </Text>
            <Text style={styles.detailValue}>
              {formatSalary(
                job.salaryMin,
                job.salaryMax,
                job.salaryTypeLabel || job.salaryType
              )}
            </Text>
          </View>

          {job.isRemote && (
            <View style={styles.remoteBadge}>
              <Ionicons name="home" size={16} color="#1E3A8A" />
              <Text style={styles.remoteBadgeText}>
                {t('employerJobDetails.labels.remoteAvailable')}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobDetails.sections.description')}
          </Text>
          <Text style={styles.contentText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('employerJobDetails.sections.requirements')}
            </Text>
            <Text style={styles.contentText}>{job.requirements}</Text>
          </View>
        )}

        {/* Benefits */}
        {job.benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('employerJobDetails.sections.benefits')}
            </Text>
            <Text style={styles.contentText}>{job.benefits}</Text>
          </View>
        )}

        {/* ===================================================================
            UPDATED LOCATION SECTION WITH COPY & MAPS
            =================================================================== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobDetails.sections.location')}
          </Text>

          {/* Location Display */}
          <View style={styles.locationCard}>
            <Ionicons name="location-sharp" size={24} color="#1E3A8A" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {job.city}, {job.state}
              </Text>
              {job.postcode && (
                <Text style={styles.locationSubtext}>{job.postcode}</Text>
              )}
              {job.address && (
                <Text style={styles.locationSubtext}>{job.address}</Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.locationActions}>
            {/* Copy Address Button */}
            <TouchableOpacity
              style={styles.locationActionButton}
              onPress={handleCopyAddress}
            >
              <Ionicons name="copy-outline" size={20} color="#1E3A8A" />
              <Text style={styles.locationActionText}>
                {t('employerJobDetails.actions.copyAddress')}
              </Text>
            </TouchableOpacity>

            {/* Open in Maps Button */}
            <TouchableOpacity
              style={[
                styles.locationActionButton,
                styles.locationActionButtonPrimary,
              ]}
              onPress={handleOpenInMaps}
            >
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.locationActionTextPrimary}>
                {t('employerJobDetails.actions.openInMaps')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dates */}
        {(job.applicationDeadline || job.startDate) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('employerJobDetails.sections.dates')}
            </Text>
            {job.applicationDeadline && (
              <View style={styles.dateRow}>
                <Ionicons name="calendar" size={20} color="#64748B" />
                <View style={styles.dateInfo}>
                  <Text style={styles.dateLabel}>
                    {t('employerJobDetails.labels.applicationDeadline')}
                  </Text>
                  <Text style={styles.dateValue}>
                    {formatDate(job.applicationDeadline)}
                  </Text>
                </View>
              </View>
            )}
            {job.startDate && (
              <View style={styles.dateRow}>
                <Ionicons name="calendar" size={20} color="#64748B" />
                <View style={styles.dateInfo}>
                  <Text style={styles.dateLabel}>
                    {t('employerJobDetails.labels.expectedStartDate')}
                  </Text>
                  <Text style={styles.dateValue}>
                    {formatDate(job.startDate)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons - Hide for REJECTED_FINAL */}
      {job.approvalStatus !== 'REJECTED_FINAL' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.toggleButton,
              (job.approvalStatus === 'REJECTED_AI' ||
                job.approvalStatus === 'PENDING_REVIEW') &&
                styles.disabledButton,
            ]}
            onPress={handleToggleStatus}
            disabled={
              actionLoading ||
              job.approvalStatus === 'REJECTED_AI' ||
              job.approvalStatus === 'PENDING_REVIEW'
            }
          >
            <Ionicons
              name={job.isActive ? 'pause' : 'play'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.actionButtonText}>
              {job.isActive
                ? t('employerJobDetails.actions.close')
                : t('employerJobDetails.actions.activate')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
            disabled={actionLoading}
          >
            <Ionicons name="create" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {t('employerJobDetails.actions.edit')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {t('employerJobDetails.actions.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Show rejection notice for REJECTED_FINAL */}
      {job.approvalStatus === 'REJECTED_FINAL' && (
        <View style={styles.rejectionNotice}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text style={styles.rejectionNoticeText}>
            {t('employerJobDetails.rejectionNotice')}
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusInactive: {
    backgroundColor: '#EF4444',
  },
  statusRejected: {
    backgroundColor: '#F59E0B',
  },
  statusPending: {
    backgroundColor: '#64748B',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  remoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  remoteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  locationCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  locationSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  // ===================================================================
  // NEW STYLES FOR LOCATION ACTIONS
  // ===================================================================
  locationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  locationActionButtonPrimary: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  locationActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  locationActionTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  toggleButton: {
    backgroundColor: '#F59E0B',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  editButton: {
    backgroundColor: '#1E3A8A',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    gap: 12,
  },
  rejectionNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  companyLogoLarge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  companyLogoPlaceholderLarge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoTextLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyInfo: {
    flex: 1,
  },
});
