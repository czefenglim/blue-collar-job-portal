import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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

interface Appeal {
  id: number;
  explanation: string;
  evidenceUrls?: string[];
  status: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  employer: {
    fullName: string;
    email: string;
  };
  reviewer?: {
    fullName: string;
  };
  report: {
    id: number;
    reportType: string;
    description: string;
    status: string;
    evidenceUrls?: string[];
    reviewNotes: string | null;
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
        id: number;
        name: string;
      };
    };
  };
}

const AdminAppealReviewScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<
    'ACCEPTED' | 'REJECTED' | null
  >(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadAppealDetails();
  }, [id]);

  const loadAppealDetails = async () => {
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

      // For this, we need to add a new endpoint or modify existing one
      // For now, let's fetch from the appeals list and find the specific one
      const response = await fetch(`${URL}/api/appeals/admin/appeals`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const foundAppeal = data.data.find(
          (a: Appeal) => a.id === parseInt(id as string)
        );
        if (foundAppeal) {
          setAppeal(foundAppeal);
        } else {
          Alert.alert('Error', 'Appeal not found');
        }
      } else {
        Alert.alert('Error', 'Failed to load appeal details');
      }
    } catch (error) {
      console.error('Error loading appeal details:', error);
      Alert.alert('Error', 'Failed to load appeal details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAction = (action: 'ACCEPTED' | 'REJECTED') => {
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!reviewNotes.trim()) {
      Alert.alert('Error', 'Please provide review notes');
      return;
    }

    if (reviewNotes.trim().length < 10) {
      Alert.alert('Error', 'Review notes must be at least 10 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('adminToken');

      const response = await fetch(
        `${URL}/api/appeals/admin/appeals/${id}/review`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: reviewAction,
            reviewNotes: reviewNotes.trim(),
          }),
        }
      );

      if (response.ok) {
        Alert.alert(
          'Success',
          `Appeal ${reviewAction?.toLowerCase()} successfully`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowReviewModal(false);
                router.back();
              },
            },
          ]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      ACCEPTED: '#10B981',
      REJECTED: '#EF4444',
    };
    return colors[status] || '#64748B';
  };

  const renderEvidence = (
    evidenceUrls?: string[],
    title: string = 'Evidence Files'
  ) => {
    if (!evidenceUrls || evidenceUrls.length === 0) {
      return null;
    }

    return (
      <View style={styles.detailSection}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="image-outline" size={18} color="#1E3A8A" />
          <Text style={styles.detailLabel}>{title}</Text>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading appeal details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appeal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Appeal not found</Text>
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

  const canReview = ['PENDING', 'UNDER_REVIEW'].includes(appeal.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Appeal Review</Text>
          <Text style={styles.headerSubtitle}>Appeal #{appeal.id}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appeal Status */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#1E3A8A"
            />
            <Text style={styles.detailLabel}>Appeal Status</Text>
          </View>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: getStatusColor(appeal.status) + '20' },
            ]}
          >
            <Ionicons
              name="chatbox-ellipses"
              size={20}
              color={getStatusColor(appeal.status)}
            />
            <Text
              style={[
                styles.statusTextLarge,
                { color: getStatusColor(appeal.status) },
              ]}
            >
              {appeal.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Employer Info */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person-outline" size={18} color="#1E3A8A" />
            <Text style={styles.detailLabel}>Submitted By</Text>
          </View>
          <View style={styles.employerCard}>
            <Text style={styles.employerName}>{appeal.employer.fullName}</Text>
            <Text style={styles.employerEmail}>{appeal.employer.email}</Text>
            <Text style={styles.submittedDate}>
              Submitted on {formatDate(appeal.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Appeal Explanation */}
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="chatbox-ellipses-outline"
              size={18}
              color="#1E3A8A"
            />
            <Text style={styles.detailLabel}>Employer's Explanation</Text>
          </View>
          <View style={styles.explanationCard}>
            <Text style={styles.explanationText}>{appeal.explanation}</Text>
          </View>
        </View>

        {/* Appeal Evidence */}
        {appeal.evidenceUrls && appeal.evidenceUrls.length > 0 && (
          <>
            <View style={styles.divider} />
            {renderEvidence(appeal.evidenceUrls, "Employer's Evidence")}
          </>
        )}

        <View style={styles.divider} />

        {/* Original Report Section */}
        <View style={styles.reportSection}>
          <View style={styles.reportSectionHeader}>
            <Ionicons name="flag" size={22} color="#EF4444" />
            <Text style={styles.reportSectionTitle}>Original Report</Text>
          </View>

          {/* Job Info */}
          <View style={styles.jobInfoCard}>
            <Text style={styles.jobTitle}>{appeal.report.job.title}</Text>
            <Text style={styles.companyName}>
              {appeal.report.job.company.name}
            </Text>
            {appeal.report.job.isSuspended && (
              <View style={styles.suspendedBadge}>
                <Ionicons name="warning" size={16} color="#F59E0B" />
                <Text style={styles.suspendedText}>Currently Suspended</Text>
              </View>
            )}
            {!appeal.report.job.isActive && (
              <View style={styles.deletedBadge}>
                <Ionicons name="ban" size={16} color="#EF4444" />
                <Text style={styles.deletedText}>Job Deleted</Text>
              </View>
            )}
          </View>

          {/* Report Type */}
          <View style={styles.reportDetailRow}>
            <Text style={styles.reportDetailLabel}>Report Type:</Text>
            <Text style={styles.reportDetailValue}>
              {formatReportType(appeal.report.reportType)}
            </Text>
          </View>

          {/* Reporter */}
          <View style={styles.reportDetailRow}>
            <Text style={styles.reportDetailLabel}>Reported By:</Text>
            <Text style={styles.reportDetailValue}>
              {appeal.report.user.fullName}
            </Text>
          </View>

          {/* Report Description */}
          <View style={styles.reportDescriptionContainer}>
            <Text style={styles.reportDetailLabel}>Report Description:</Text>
            <Text style={styles.reportDescriptionText}>
              {appeal.report.description}
            </Text>
          </View>

          {/* Report Evidence */}
          {appeal.report.evidenceUrls &&
            appeal.report.evidenceUrls.length > 0 && (
              <View style={styles.reportEvidenceContainer}>
                {renderEvidence(
                  appeal.report.evidenceUrls,
                  "Reporter's Evidence"
                )}
              </View>
            )}

          {/* Admin's Original Review */}
          {appeal.report.reviewNotes && (
            <View style={styles.originalReviewCard}>
              <View style={styles.originalReviewHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#1E3A8A" />
                <Text style={styles.originalReviewTitle}>
                  Original Admin Decision
                </Text>
              </View>
              <Text style={styles.originalReviewNotes}>
                {appeal.report.reviewNotes}
              </Text>
            </View>
          )}
        </View>

        {/* Previous Appeal Review (if exists) */}
        {appeal.reviewedBy && (
          <>
            <View style={styles.divider} />
            <View style={styles.adminReviewSection}>
              <View style={styles.adminReviewHeader}>
                <Ionicons name="shield-checkmark" size={22} color="#1E3A8A" />
                <Text style={styles.adminReviewTitle}>Appeal Review</Text>
              </View>

              <View style={styles.reviewInfoCard}>
                <View style={styles.reviewInfoRow}>
                  <View style={styles.reviewInfoIconContainer}>
                    <Ionicons name="person-circle" size={18} color="#64748B" />
                  </View>
                  <View style={styles.reviewInfoTextContainer}>
                    <Text style={styles.reviewInfoLabel}>Reviewed By</Text>
                    <Text style={styles.reviewInfoText}>
                      {appeal.reviewer?.fullName || 'Admin'}
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewInfoDivider} />

                <View style={styles.reviewInfoRow}>
                  <View style={styles.reviewInfoIconContainer}>
                    <Ionicons name="calendar" size={18} color="#64748B" />
                  </View>
                  <View style={styles.reviewInfoTextContainer}>
                    <Text style={styles.reviewInfoLabel}>Review Date</Text>
                    <Text style={styles.reviewInfoText}>
                      {formatDate(appeal.reviewedAt!)}
                    </Text>
                  </View>
                </View>
              </View>

              {appeal.reviewNotes && (
                <View style={styles.reviewNotesCard}>
                  <View style={styles.reviewNotesHeader}>
                    <Ionicons name="document-text" size={18} color="#1E3A8A" />
                    <Text style={styles.reviewNotesLabel}>Review Notes</Text>
                  </View>
                  <Text style={styles.reviewNotesText}>
                    {appeal.reviewNotes}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Action Buttons */}
        {canReview && (
          <>
            <View style={styles.divider} />
            <View style={styles.actionSection}>
              <Text style={styles.actionSectionTitle}>Review Appeal</Text>
              <Text style={styles.actionSectionText}>
                Make a decision on this appeal. Your decision will be final.
              </Text>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleReviewAction('ACCEPTED')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept Appeal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReviewAction('REJECTED')}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.rejectButtonText}>Reject Appeal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardAvoid}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {reviewAction === 'ACCEPTED'
                    ? 'Accept Appeal'
                    : 'Reject Appeal'}
                </Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalDescription}>
                  {reviewAction === 'ACCEPTED'
                    ? 'By accepting this appeal, the job post will be restored and the original action will be reversed.'
                    : 'By rejecting this appeal, the original action will stand and the job post will remain suspended/deleted.'}
                </Text>

                <Text style={styles.modalLabel}>
                  Review Notes <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalTextArea}
                  placeholder="Enter your review notes (minimum 10 characters)..."
                  placeholderTextColor="#94A3B8"
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowReviewModal(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      {
                        backgroundColor:
                          reviewAction === 'ACCEPTED' ? '#10B981' : '#EF4444',
                      },
                    ]}
                    onPress={submitReview}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        Confirm{' '}
                        {reviewAction === 'ACCEPTED' ? 'Accept' : 'Reject'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
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
  employerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  employerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  employerEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  submittedDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  explanationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  explanationText: {
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
  reportSection: {
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
  reportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  reportSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  jobInfoCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  suspendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  suspendedText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  deletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  deletedText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  reportDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  reportDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 8,
  },
  reportDetailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  reportDescriptionContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  reportDescriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginTop: 6,
  },
  reportEvidenceContainer: {
    marginTop: 16,
  },
  originalReviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  originalReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  originalReviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  originalReviewNotes: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
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
  reviewInfoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
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
  actionSection: {
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
  actionSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  actionSectionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 32,
  },
  modalKeyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  modalTextArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
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
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdminAppealReviewScreen;
