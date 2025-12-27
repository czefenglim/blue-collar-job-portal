import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Report {
  id: number;
  reportType: string;
  description: string;
  evidence: string | null;
  evidenceUrls?: string[];
  status: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  };
  job: {
    id: number;
    title: string;
    description: string;
    isSuspended: boolean;
    suspensionReason: string | null;
    isActive: boolean;
    company: {
      name: string;
    };
  };
  appeals: {
    id: number;
    explanation: string;
    evidenceUrls?: string[];
    status: string;
    reviewedBy: number | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    createdAt: string;
    reviewer?: {
      fullName: string;
    };
  }[];
}

const EmployerReportDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();

  const loadReportDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        Alert.alert(
          t('employerReports.details.errors.authRequiredTitle'),
          t('employerReports.details.errors.authRequiredMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.replace('/LoginScreen'),
            },
          ]
        );
        return;
      }

      const response = await fetch(
        `${URL}/api/appeals/employer/my-reports/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      } else {
        Alert.alert(
          t('employerReports.details.errors.title'),
          t('employerReports.details.errors.loadFail')
        );
      }
    } catch (error) {
      console.error('Error loading report details:', error);
      Alert.alert(
        t('employerReports.details.errors.title'),
        t('employerReports.details.errors.loadFail')
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, router, t]);

  useEffect(() => {
    loadReportDetails();
  }, [loadReportDetails]);

  const formatReportType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: '#F59E0B',
      UNDER_REVIEW: '#3B82F6',
      RESOLVED: '#10B981',
      DISMISSED: '#64748B',
      PENDING_EMPLOYER_RESPONSE: '#8B5CF6',
    };
    return colors[status] || '#64748B';
  };

  const getAppealStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: '#F59E0B',
      UNDER_REVIEW: '#3B82F6',
      ACCEPTED: '#10B981',
      REJECTED: '#EF4444',
    };
    return colors[status] || '#64748B';
  };

  const canAppeal = () => {
    if (!report) return false;

    // Can appeal if status is RESOLVED or DISMISSED
    const canAppealStatus = ['RESOLVED', 'DISMISSED'].includes(report.status);

    // Check if there's already a pending/under review appeal
    const hasActiveAppeal = report.appeals.some((appeal) =>
      ['PENDING', 'UNDER_REVIEW'].includes(appeal.status)
    );

    return canAppealStatus && !hasActiveAppeal;
  };

  const renderEvidence = (evidenceUrls?: string[]) => {
    if (!evidenceUrls || evidenceUrls.length === 0) {
      return null;
    }

    return (
      <View style={styles.detailSection}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="image-outline" size={18} color="#1E3A8A" />
          <Text style={styles.detailLabel}>
            {t('employerReports.details.sections.evidence')}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.evidenceScrollView}
        >
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
                  <Text style={styles.evidenceDocText}>PDF</Text>
                </View>
              )}
              <View style={styles.evidenceOverlay}>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>
            {t('employerReports.details.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>
            {t('employerReports.details.notFound')}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Action Taken Alert */}
        {(report.job.isSuspended || !report.job.isActive) && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="warning" size={24} color="#DC2626" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {t('employerReports.details.action.title')}
              </Text>
              <Text style={styles.alertText}>
                {report.job.isSuspended
                  ? t('employerReports.details.action.jobSuspended', {
                      reason: report.job.suspensionReason || '',
                    })
                  : t('employerReports.details.action.jobDeleted')}
              </Text>
              {canAppeal() && (
                <Text style={styles.alertSubtext}>
                  {t('employerReports.details.action.appealHint')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Report Status */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#1E3A8A"
            />
            <Text style={styles.detailLabel}>
              {t('employerReports.details.sections.status')}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: getStatusColor(report.status) + '20' },
            ]}
          >
            <Ionicons
              name="flag"
              size={20}
              color={getStatusColor(report.status)}
            />
            <Text
              style={[
                styles.statusTextLarge,
                { color: getStatusColor(report.status) },
              ]}
            >
              {report.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Job Info */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="briefcase-outline" size={18} color="#1E3A8A" />
            <Text style={styles.detailLabel}>
              {t('employerReports.details.sections.job')}
            </Text>
          </View>
          <View style={styles.jobInfoCard}>
            <Text style={styles.jobInfoTitle}>{report.job.title}</Text>
            <Text style={styles.jobInfoCompany}>{report.job.company.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Report Type */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flag-outline" size={18} color="#1E3A8A" />
            <Text style={styles.detailLabel}>
              {t('employerReports.details.sections.type')}
            </Text>
          </View>
          <View style={styles.reportTypeCard}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.detailValue}>
              {formatReportType(report.reportType)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Reporter Info */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person-outline" size={18} color="#1E3A8A" />
            <Text style={styles.detailLabel}>
              {t('employerReports.details.sections.reportedBy')}
            </Text>
          </View>
          <View style={styles.reporterCard}>
            <Text style={styles.reporterName}>{report.user.fullName}</Text>
            <Text style={styles.reporterDate}>
              {formatDate(report.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Description */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="chatbox-ellipses-outline"
              size={18}
              color="#1E3A8A"
            />
            <Text style={styles.detailLabel}>
              {t('employerReports.details.sections.description')}
            </Text>
          </View>
          <View style={styles.descriptionCard}>
            <Text style={styles.detailValueText}>{report.description}</Text>
          </View>
        </View>

        {/* Evidence */}
        {report.evidenceUrls && report.evidenceUrls.length > 0 && (
          <>
            <View style={styles.divider} />
            {renderEvidence(report.evidenceUrls)}
          </>
        )}

        {/* Admin Review */}
        {report.reviewedBy && (
          <>
            <View style={styles.divider} />
            <View style={styles.adminReviewSection}>
              <View style={styles.adminReviewHeader}>
                <Ionicons name="shield-checkmark" size={22} color="#1E3A8A" />
                <Text style={styles.adminReviewTitle}>
                  {t('employerReports.details.sections.adminReview')}
                </Text>
              </View>

              <View style={styles.reviewInfoCard}>
                <View style={styles.reviewInfoRow}>
                  <View style={styles.reviewInfoIconContainer}>
                    <Ionicons name="calendar" size={18} color="#64748B" />
                  </View>
                  <View style={styles.reviewInfoTextContainer}>
                    <Text style={styles.reviewInfoLabel}>
                      {t('employerReports.details.admin.reviewDate')}
                    </Text>
                    <Text style={styles.reviewInfoText}>
                      {formatDate(report.reviewedAt!)}
                    </Text>
                  </View>
                </View>
              </View>

              {report.reviewNotes && (
                <View style={styles.reviewNotesCard}>
                  <View style={styles.reviewNotesHeader}>
                    <Ionicons name="document-text" size={18} color="#1E3A8A" />
                    <Text style={styles.reviewNotesLabel}>
                      {t('employerReports.details.admin.notes')}
                    </Text>
                  </View>
                  <Text style={styles.reviewNotesText}>
                    {report.reviewNotes}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Appeals History */}
        {report.appeals.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.detailSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="chatbox" size={18} color="#1E3A8A" />
                <Text style={styles.detailLabel}>
                  {t('employerReports.details.sections.appeals')}
                </Text>
              </View>

              {report.appeals.map((appeal, index) => (
                <View key={appeal.id} style={styles.appealCard}>
                  <View style={styles.appealHeader}>
                    <Text style={styles.appealTitle}>
                      {t('employerReports.details.appeal.title', {
                        id: appeal.id,
                      })}
                    </Text>
                    <View
                      style={[
                        styles.appealStatusBadge,
                        {
                          backgroundColor:
                            getAppealStatusColor(appeal.status) + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.appealStatusText,
                          { color: getAppealStatusColor(appeal.status) },
                        ]}
                      >
                        {appeal.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.appealDate}>
                    {t('employerReports.details.appeal.submittedOn', {
                      date: formatDate(appeal.createdAt),
                    })}
                  </Text>

                  <View style={styles.appealExplanationContainer}>
                    <Text style={styles.appealExplanationLabel}>
                      {t('employerReports.details.appeal.explanation')}
                    </Text>
                    <Text style={styles.appealExplanation}>
                      {appeal.explanation}
                    </Text>
                  </View>

                  {appeal.evidenceUrls && appeal.evidenceUrls.length > 0 && (
                    <View style={styles.appealEvidenceContainer}>
                      <Text style={styles.appealEvidenceLabel}>
                        {t('employerReports.details.appeal.evidence')}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {appeal.evidenceUrls.map((url, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.appealEvidenceThumbnail}
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
                                <Ionicons
                                  name="document"
                                  size={24}
                                  color="#64748B"
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {appeal.reviewedBy && (
                    <View style={styles.appealReviewCard}>
                      <View style={styles.appealReviewHeader}>
                        <Ionicons
                          name="shield-checkmark"
                          size={16}
                          color="#1E3A8A"
                        />
                        <Text style={styles.appealReviewTitle}>
                          {t('employerReports.details.appeal.adminResponse')}
                        </Text>
                      </View>
                      <Text style={styles.appealReviewDate}>
                        {t('employerReports.details.appeal.reviewedOn', {
                          date: formatDate(appeal.reviewedAt!),
                        })}
                      </Text>
                      {appeal.reviewNotes && (
                        <Text style={styles.appealReviewNotes}>
                          {appeal.reviewNotes}
                        </Text>
                      )}

                      {appeal.status === 'ACCEPTED' && (
                        <View style={styles.appealAcceptedBanner}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#10B981"
                          />
                          <Text style={styles.appealAcceptedText}>
                            {t('employerReports.details.appeal.accepted')}
                          </Text>
                        </View>
                      )}

                      {appeal.status === 'REJECTED' && (
                        <View style={styles.appealRejectedBanner}>
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#EF4444"
                          />
                          <Text style={styles.appealRejectedText}>
                            {t('employerReports.details.appeal.rejected')}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Appeal Button */}
        {canAppeal() && (
          <>
            <View style={styles.divider} />
            <View style={styles.appealActionSection}>
              <Text style={styles.appealActionTitle}>
                {t('employerReports.details.appealAction.title')}
              </Text>
              <Text style={styles.appealActionText}>
                {t('employerReports.details.appealAction.text')}
              </Text>
              <TouchableOpacity
                style={styles.submitAppealButton}
                onPress={() =>
                  router.push(`/(employer-hidden)/reports/${id}/appeal` as Href)
                }
              >
                <Ionicons name="chatbox-ellipses" size={20} color="#FFFFFF" />
                <Text style={styles.submitAppealButtonText}>
                  {t('employerReports.details.appealAction.submit')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  alertIconContainer: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 6,
  },
  alertText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertSubtext: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  detailSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
    marginHorizontal: 20,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  jobInfoCompany: {
    fontSize: 14,
    color: '#64748B',
  },
  reportTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  reporterCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reporterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  reporterDate: {
    fontSize: 14,
    color: '#64748B',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailValueText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  evidenceScrollView: {
    marginTop: 4,
  },
  evidenceThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#F8FAFC',
  },
  evidenceDocText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  evidenceOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    padding: 6,
  },
  adminReviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  adminReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  adminReviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  reviewInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewInfoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewInfoTextContainer: {
    flex: 1,
  },
  reviewInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  reviewInfoText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  reviewNotesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  reviewNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewNotesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  reviewNotesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  appealCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  appealStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appealStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  appealDate: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  appealExplanationContainer: {
    marginBottom: 12,
  },
  appealExplanationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  appealExplanation: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  appealEvidenceContainer: {
    marginBottom: 12,
  },
  appealEvidenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  appealEvidenceThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appealReviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appealReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  appealReviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  appealReviewDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  appealReviewNotes: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  appealAcceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  appealAcceptedText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    fontWeight: '500',
  },
  appealRejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  appealRejectedText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
  },
  appealActionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appealActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  appealActionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  submitAppealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitAppealButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default EmployerReportDetailsScreen;
