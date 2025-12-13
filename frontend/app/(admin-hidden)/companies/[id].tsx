import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface TrustScore {
  score: number;
  level: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  breakdown: {
    verificationStatus: number;
    companyCompleteness: number;
    jobPostingHistory: number;
    applicantEngagement: number;
    reviewScore: number;
    reportHistory: number;
  };
  factors: {
    isVerified: boolean;
    totalJobsPosted: number;
    approvedJobsCount: number;
    rejectedJobsCount: number;
    totalApplicationsReceived: number;
    averageReviewRating: number;
    totalReviews: number;
    totalReports: number;
    resolvedReports: number;
    accountAge: number;
  };
  warnings: string[];
  strengths: string[];
}

interface CompanyDetails {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  companySize?: string;
  isVerified: boolean;
  isActive: boolean;
  verificationStatus: string;
  verificationStatusLabel?: string;
  userStatusLabel?: string;
  createdAt: string;
  updatedAt: string;
  industry?: {
    id: number;
    name: string;
  };
  verification?: {
    id: number;
    businessDocument?: string;
    documentType?: string;
    documentName?: string;
    status?: string;
    reviewNotes?: string;
    submittedAt: string;
  };
  user?: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
    status: string;
    createdAt: string;
    lastLoginAt?: string;
  };
  jobs: Array<{
    id: number;
    title: string;
    approvalStatus: string;
    createdAt: string;
    applicationCount: number;
  }>;
  reviews: Array<{
    id: number;
    rating: number;
    title?: string;
    comment?: string;
    isVisible: boolean;
    isFlagged: boolean;
    createdAt: string;
  }>;
  _count: {
    jobs: number;
    reviews: number;
  };
  trustScore: TrustScore;
  reportCount: number;
  companySizeLabel?: string;
}

export default function AdminCompanyDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const companyId = params.id as string;
  const { currentLanguage, t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Disable modal state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableReason, setDisableReason] = useState('');

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId, currentLanguage]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const response = await fetch(
        `${URL}/api/admin/companies/${companyId}?lang=${currentLanguage}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch company details');
      }

      setCompany(data.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching company:', error);
      setError(error.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableCompany = async () => {
    if (!company) return;

    try {
      setActionLoading(true);
      const token = await AsyncStorage.getItem('adminToken');

      const response = await fetch(
        `${URL}/api/admin/companies/${companyId}/disable`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: disableReason || 'Disabled by admin',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to disable company');
      }

      setShowDisableModal(false);
      setDisableReason('');

      Alert.alert(
        'Success',
        'Company has been disabled. All jobs have been suspended and the employer account has been suspended.',
        [
          {
            text: 'OK',
            onPress: () => fetchCompanyDetails(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error disabling company:', error);
      Alert.alert('Error', error.message || 'Failed to disable company');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnableCompany = async () => {
    if (!company) return;

    Alert.alert('Enable Company', 'Do you want to re-enable this company?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Enable',
        onPress: async () => {
          try {
            setActionLoading(true);
            const token = await AsyncStorage.getItem('jwtToken');

            const response = await fetch(
              `${URL}/api/admin/companies/${companyId}/enable`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  setAsApproved: false, // Set to PENDING for re-verification
                }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.message || 'Failed to enable company');
            }

            Alert.alert(
              'Success',
              'Company has been re-enabled. Status set to PENDING.',
              [
                {
                  text: 'OK',
                  onPress: () => fetchCompanyDetails(),
                },
              ]
            );
          } catch (error: any) {
            console.error('Error enabling company:', error);
            Alert.alert('Error', error.message || 'Failed to enable company');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
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

  const getApprovalColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'REJECTED_AI':
      case 'REJECTED_FINAL':
        return '#EF4444';
      case 'APPEALED':
        return '#8B5CF6';
      default:
        return '#64748B';
    }
  };

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{content}</View>
    </View>
  );

  const renderScoreBar = (label: string, value: number, maxValue: number) => {
    const percentage = (value / maxValue) * 100;
    let barColor = '#EF4444';
    if (percentage >= 70) barColor = '#10B981';
    else if (percentage >= 40) barColor = '#F59E0B';

    return (
      <View style={styles.scoreBarContainer}>
        <View style={styles.scoreBarHeader}>
          <Text style={styles.scoreBarLabel}>{label}</Text>
          <Text style={styles.scoreBarValue}>
            {value}/{maxValue}
          </Text>
        </View>
        <View style={styles.scoreBarTrack}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${percentage}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderDisableModal = () => (
    <Modal
      visible={showDisableModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowDisableModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="warning" size={32} color="#EF4444" />
            <Text style={styles.modalTitle}>
              {t('adminCompanyDetails.disableCompany')}
            </Text>
          </View>

          <Text style={styles.modalDescription}>
            {t('adminCompanyDetails.thisWill')}
            {'\n'}
            {t('adminCompanyDetails.disableEffect1')}
            {'\n'}
            {t('adminCompanyDetails.disableEffect2')}
            {'\n'}
            {t('adminCompanyDetails.disableEffect3')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('adminCompanyDetails.reasonOptional')}
            </Text>
            <TextInput
              style={styles.textArea}
              value={disableReason}
              onChangeText={setDisableReason}
              placeholder="Enter reason for disabling..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowDisableModal(false);
                setDisableReason('');
              }}
            >
              <Text style={styles.cancelButtonText}>
                {t('adminCompanyDetails.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disableButton}
              onPress={handleDisableCompany}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="ban" size={18} color="#FFFFFF" />
                  <Text style={styles.disableButtonText}>
                    {t('adminCompanyDetails.disable')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>
            {t('adminCompanyDetails.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !company) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || t('adminCompanyDetails.companyNotFound')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>
              {t('adminCompanyDetails.goBack')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.companyLogo}>
            {company.logo ? (
              <Image source={{ uri: company.logo }} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoText}>{company.name.charAt(0)}</Text>
            )}
          </View>

          <Text style={styles.companyName}>{company.name}</Text>

          {company.industry && (
            <Text style={styles.industryText}>{company.industry.name}</Text>
          )}

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.verificationBadge,
                {
                  backgroundColor:
                    getVerificationColor(company.verificationStatus) + '20',
                },
              ]}
            >
              <Ionicons
                name={company.isVerified ? 'checkmark-circle' : 'time'}
                size={14}
                color={getVerificationColor(company.verificationStatus)}
              />
              <Text
                style={[
                  styles.verificationText,
                  { color: getVerificationColor(company.verificationStatus) },
                ]}
              >
                {company.verificationStatusLabel || company.verificationStatus}
              </Text>
            </View>

            {!company.isActive && (
              <View style={styles.inactiveBadge}>
                <Ionicons name="close-circle" size={14} color="#EF4444" />
                <Text style={styles.inactiveText}>
                  {t('adminCompanyDetails.inactive')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Trust Score Section */}
        {company.trustScore && (
          <View style={styles.trustScoreSection}>
            <View style={styles.trustScoreHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#1E3A8A" />
              <Text style={styles.trustScoreSectionTitle}>
                {t('adminCompanyDetails.employerTrustScore')}
              </Text>
            </View>

            {/* Overall Score */}
            <View style={styles.overallScoreContainer}>
              <View style={styles.overallScoreCircle}>
                <Text
                  style={[
                    styles.overallScoreValue,
                    { color: getTrustLevelColor(company.trustScore.level) },
                  ]}
                >
                  {company.trustScore.score}
                </Text>
                <Text style={styles.overallScoreLabel}>/ 100</Text>
              </View>
              <View
                style={[
                  styles.trustLevelBadgeLarge,
                  {
                    backgroundColor:
                      getTrustLevelColor(company.trustScore.level) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.trustLevelTextLarge,
                    { color: getTrustLevelColor(company.trustScore.level) },
                  ]}
                >
                  {company.trustScore.level}
                </Text>
              </View>
            </View>

            {/* Score Breakdown */}
            <View style={styles.scoreBreakdown}>
              {renderScoreBar(
                t('adminCompanyDetails.verificationStatus'),
                company.trustScore.breakdown.verificationStatus,
                25
              )}
              {renderScoreBar(
                t('adminCompanyDetails.companyCompleteness'),
                company.trustScore.breakdown.companyCompleteness,
                20
              )}
              {renderScoreBar(
                t('adminCompanyDetails.jobPostingHistory'),
                company.trustScore.breakdown.jobPostingHistory,
                20
              )}
              {renderScoreBar(
                t('adminCompanyDetails.applicantEngagement'),
                company.trustScore.breakdown.applicantEngagement,
                15
              )}
              {renderScoreBar(
                t('adminCompanyDetails.reviewScore'),
                company.trustScore.breakdown.reviewScore,
                10
              )}
              {renderScoreBar(
                t('adminCompanyDetails.reportHistory'),
                company.trustScore.breakdown.reportHistory,
                10
              )}
            </View>

            {/* Factors */}
            <View style={styles.factorsContainer}>
              <Text style={styles.factorsTitle}>Key Metrics</Text>
              <View style={styles.factorsGrid}>
                <View style={styles.factorItem}>
                  <Text style={styles.factorValue}>
                    {company.trustScore.factors.totalJobsPosted}
                  </Text>
                  <Text style={styles.factorLabel}>Jobs Posted</Text>
                </View>
                <View style={styles.factorItem}>
                  <Text style={styles.factorValue}>
                    {company.trustScore.factors.approvedJobsCount}
                  </Text>
                  <Text style={styles.factorLabel}>Approved</Text>
                </View>
                <View style={styles.factorItem}>
                  <Text style={[styles.factorValue, { color: '#EF4444' }]}>
                    {company.trustScore.factors.rejectedJobsCount}
                  </Text>
                  <Text style={styles.factorLabel}>Rejected</Text>
                </View>
                <View style={styles.factorItem}>
                  <Text style={styles.factorValue}>
                    {company.trustScore.factors.totalApplicationsReceived}
                  </Text>
                  <Text style={styles.factorLabel}>Applications</Text>
                </View>
                <View style={styles.factorItem}>
                  <Text style={styles.factorValue}>
                    {company.trustScore.factors.averageReviewRating > 0
                      ? `${company.trustScore.factors.averageReviewRating}/5`
                      : 'N/A'}
                  </Text>
                  <Text style={styles.factorLabel}>Avg Rating</Text>
                </View>
                <View style={styles.factorItem}>
                  <Text
                    style={[
                      styles.factorValue,
                      {
                        color:
                          company.trustScore.factors.totalReports > 0
                            ? '#EF4444'
                            : '#10B981',
                      },
                    ]}
                  >
                    {company.trustScore.factors.totalReports}
                  </Text>
                  <Text style={styles.factorLabel}>Reports</Text>
                </View>
              </View>
            </View>

            {/* Strengths */}
            {company.trustScore?.strengths?.length > 0 && (
              <View style={styles.strengthsContainer}>
                <Text style={styles.strengthsTitle}>
                  ✅ {t('adminCompanyDetails.strengths')}
                </Text>
                {(company.trustScore?.strengths || []).map(
                  (strength, index) => (
                    <View key={index} style={styles.strengthItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.strengthText}>{strength}</Text>
                    </View>
                  )
                )}
              </View>
            )}

            {/* Warnings */}
            {company.trustScore?.warnings?.length > 0 && (
              <View style={styles.warningsContainer}>
                <Text style={styles.warningsTitle}>
                  ⚠️ {t('adminCompanyDetails.warnings')}
                </Text>
                {(company.trustScore?.warnings || []).map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <Ionicons name="warning" size={14} color="#F59E0B" />
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Company Information */}
        {renderSection(
          t('adminCompanyDetails.companyInformation'),
          <View>
            {company.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>{company.email}</Text>
              </View>
            )}
            {company.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>{company.phone}</Text>
              </View>
            )}
            {company.website && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(company.website!)}
              >
                <Ionicons name="globe-outline" size={18} color="#64748B" />
                <Text style={[styles.infoText, { color: '#1E3A8A' }]}>
                  {company.website}
                </Text>
              </TouchableOpacity>
            )}
            {(company.address || company.city) && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>
                  {[
                    company.address,
                    company.city,
                    company.state,
                    company.postcode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
            {company.companySize && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>
                  {t('adminCompanyDetails.size')}:{' '}
                  {company.companySizeLabel || company.companySize}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Owner Information */}
        {company.user &&
          renderSection(
            t('adminCompanyDetails.ownerInformation'),
            <View>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>{company.user.fullName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>{company.user.email}</Text>
              </View>
              {company.user.phoneNumber && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#64748B" />
                  <Text style={styles.infoText}>
                    {company.user.phoneNumber}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="shield-outline" size={18} color="#64748B" />
                <Text style={styles.infoText}>
                  {t('adminCompanyDetails.status')}: {company.user.status}
                  {company.userStatusLabel
                    ? ` (${company.userStatusLabel})`
                    : ''}
                </Text>
              </View>
              {company.user.lastLoginAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color="#64748B" />
                  <Text style={styles.infoText}>
                    {t('adminCompanyDetails.lastLogin')}:{' '}
                    {new Date(company.user.lastLoginAt).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

        {/* Recent Jobs */}
        {company.jobs &&
          company.jobs.length > 0 &&
          renderSection(
            t('adminCompanyDetails.recentJobs', {
              total: company._count?.jobs ?? company.jobs?.length ?? 0,
            }),
            <View>
              {(company.jobs || []).map((job) => (
                <View key={job.id} style={styles.jobItem}>
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobTitle} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text style={styles.jobMeta}>
                      {new Date(job.createdAt).toLocaleDateString()} •{' '}
                      {job.applicationCount}{' '}
                      {t('adminCompanyDetails.applications')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.jobStatusBadge,
                      {
                        backgroundColor:
                          getApprovalColor(job.approvalStatus) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.jobStatusText,
                        { color: getApprovalColor(job.approvalStatus) },
                      ]}
                    >
                      {job.approvalStatus}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* Description */}
        {company.description &&
          renderSection(
            t('adminCompanyDetails.description'),
            <Text style={styles.descriptionText}>{company.description}</Text>
          )}

        {/* Timeline */}
        {renderSection(
          t('adminCompanyDetails.timeline'),
          <View>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  {t('adminCompanyDetails.registered')}
                </Text>
                <Text style={styles.timelineDate}>
                  {new Date(company.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View
                style={[styles.timelineDot, { backgroundColor: '#8B5CF6' }]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  {t('adminCompanyDetails.lastUpdated')}
                </Text>
                <Text style={styles.timelineDate}>
                  {new Date(company.updatedAt).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View
                style={[styles.timelineDot, { backgroundColor: '#F59E0B' }]}
              />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  {t('adminCompanyDetails.accountAge')}
                </Text>
                <Text style={styles.timelineDate}>
                  {company.trustScore?.factors.accountAge || 0}{' '}
                  {t('adminCompanyDetails.days')}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {company.verificationStatus === 'DISABLED' ? (
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableCompany}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.enableButtonText}>
                  {t('adminCompanyDetails.enableCompany')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.disableActionButton}
            onPress={() => setShowDisableModal(true)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="ban" size={20} color="#FFFFFF" />
                <Text style={styles.disableActionButtonText}>
                  {t('adminCompanyDetails.disableCompany')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {renderDisableModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  industryText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    backgroundColor: '#FEE2E2',
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  trustScoreSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  trustScoreSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  overallScoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  overallScoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overallScoreValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  overallScoreLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  trustLevelBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  trustLevelTextLarge: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreBreakdown: {
    marginBottom: 16,
  },
  scoreBarContainer: {
    marginBottom: 12,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreBarLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  scoreBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factorItem: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  factorValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  factorLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  strengthsContainer: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  strengthsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  strengthText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
  },
  warningsContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  jobMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  jobStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E3A8A',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#64748B',
  },
  actionBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  disableActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  disableActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  disableButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
