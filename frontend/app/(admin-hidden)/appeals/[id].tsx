import React, { useEffect, useState, useCallback } from 'react';
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
  evidence?: string;
  status: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  employer: {
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
  reviewer?: {
    fullName: string;
  };
  job: {
    id: number;
    title: string;
    description: string;
    requirements?: string;
    benefits?: string;
    city: string;
    state: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryType?: string;
    isActive: boolean;
    jobType: string;
    workingHours: string;
    experienceLevel: string;
    isRemote: boolean;
    approvalStatus: string;
    company: {
      id: number;
      name: string;
      logo?: string;
      email?: string;
      phone?: string;
      website?: string;
      isVerified?: boolean;
    };
    industry: {
      name: string;
    };
  };
}

const AdminAppealReviewScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | null>(
    null
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const loadAppealDetails = useCallback(async () => {
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

      // Use job-appeals route
      const response = await fetch(
        `${URL}/api/job-appeals/admin/appeals/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const appealData = data.data;
        setAppeal(appealData);

        // Parse evidence if it exists
        if (appealData.evidence) {
          try {
            const parsed = JSON.parse(appealData.evidence);
            setEvidenceUrls(Array.isArray(parsed) ? parsed : [parsed]);
          } catch (e) {
            // If not JSON, assume it's a single URL string
            setEvidenceUrls([appealData.evidence]);
          }
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
  }, [id, router]);

  useEffect(() => {
    loadAppealDetails();
  }, [loadAppealDetails]);

  const handleReviewAction = (action: 'APPROVE' | 'REJECT') => {
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

      // Use job-appeals review route
      const response = await fetch(
        `${URL}/api/job-appeals/admin/appeals/${id}/review`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision: reviewAction, // APPROVE or REJECT
            reviewNotes: reviewNotes.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Success',
          `Appeal ${
            reviewAction === 'APPROVE' ? 'approved' : 'rejected'
          } successfully`,
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
        Alert.alert('Error', data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
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

  const formatSalary = (min?: number, max?: number, type?: string) => {
    if (!min && !max) return 'Not specified';
    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;
    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? ` / ${type}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${type ? ` / ${type}` : ''}`;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: '#F59E0B',
      UNDER_REVIEW: '#3B82F6',
      ACCEPTED: '#10B981',
      APPROVED: '#10B981',
      REJECTED: '#EF4444',
      REJECTED_FINAL: '#EF4444',
    };
    return colors[status] || '#64748B';
  };

  const renderEvidence = (urls: string[], title: string = 'Evidence Files') => {
    if (!urls || urls.length === 0) {
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
          {urls.map((url, index) => (
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
                  <Text style={styles.evidenceDocText}>DOC</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Appeal Review</Text>
          <Text style={styles.headerSubtitle}>Appeal #{appeal.id}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appeal Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#1E3A8A"
            />
            <Text style={styles.sectionTitle}>Appeal Status</Text>
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

        {/* Employer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person-outline" size={18} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Submitted By</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoValue}>{appeal.employer.fullName}</Text>
            <Text style={styles.infoLabel}>{appeal.employer.email}</Text>
            {appeal.employer.phoneNumber && (
              <Text style={styles.infoLabel}>
                {appeal.employer.phoneNumber}
              </Text>
            )}
            <Text style={styles.dateText}>
              Submitted on {formatDate(appeal.createdAt)}
            </Text>
          </View>
        </View>

        {/* Appeal Explanation */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="chatbox-ellipses-outline"
              size={18}
              color="#1E3A8A"
            />
            <Text style={styles.sectionTitle}>Employer's Explanation</Text>
          </View>
          <View style={styles.explanationCard}>
            <Text style={styles.explanationText}>{appeal.explanation}</Text>
          </View>
        </View>

        {/* Appeal Evidence */}
        {evidenceUrls.length > 0 && (
          <View style={styles.section}>
            {renderEvidence(evidenceUrls, 'Evidence Files')}
          </View>
        )}

        <View style={styles.divider} />

        {/* JOB DETAILS SECTION */}
        <Text style={styles.mainSectionTitle}>Job Details</Text>

        {/* Company Info */}
        <View style={styles.section}>
          <View style={styles.companyHeader}>
            <View style={styles.companyLogo}>
              {appeal.job.company.logo ? (
                <Image
                  source={{ uri: appeal.job.company.logo }}
                  style={styles.companyLogoImage}
                />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Text style={styles.companyLogoText}>
                    {appeal.job.company.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{appeal.job.company.name}</Text>
              {appeal.job.company.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                  <Text style={styles.verifiedText}>Verified Company</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Job Title & Industry */}
        <View style={styles.section}>
          <Text style={styles.jobTitle}>{appeal.job.title}</Text>
          <Text style={styles.industryText}>{appeal.job.industry.name}</Text>
        </View>

        {/* Key Information Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Information</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Ionicons name="location" size={20} color="#1E3A8A" />
              <Text style={styles.gridLabel}>Location</Text>
              <Text style={styles.gridValue}>
                {appeal.job.city}, {appeal.job.state}
              </Text>
              {appeal.job.isRemote && (
                <Text style={styles.remoteTag}>Remote</Text>
              )}
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="briefcase" size={20} color="#1E3A8A" />
              <Text style={styles.gridLabel}>Job Type</Text>
              <Text style={styles.gridValue}>
                {appeal.job.jobType.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="cash" size={20} color="#1E3A8A" />
              <Text style={styles.gridLabel}>Salary</Text>
              <Text style={styles.gridValue}>
                {formatSalary(
                  appeal.job.salaryMin,
                  appeal.job.salaryMax,
                  appeal.job.salaryType
                )}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="time" size={20} color="#1E3A8A" />
              <Text style={styles.gridLabel}>Working Hours</Text>
              <Text style={styles.gridValue}>
                {appeal.job.workingHours.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="school" size={20} color="#1E3A8A" />
              <Text style={styles.gridLabel}>Experience</Text>
              <Text style={styles.gridValue}>
                {appeal.job.experienceLevel.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Job Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{appeal.job.description}</Text>
        </View>

        {/* Requirements (if available) */}
        {appeal.job.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <Text style={styles.descriptionText}>
              {appeal.job.requirements}
            </Text>
          </View>
        )}

        {/* Benefits (if available) */}
        {appeal.job.benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            <Text style={styles.descriptionText}>{appeal.job.benefits}</Text>
          </View>
        )}

        {/* Previous Appeal Review (if exists) */}
        {appeal.reviewedBy && (
          <>
            <View style={styles.divider} />
            <View style={styles.adminReviewSection}>
              <View style={styles.adminReviewHeader}>
                <Ionicons name="shield-checkmark" size={22} color="#1E3A8A" />
                <Text style={styles.adminReviewTitle}>Review Decision</Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>
                  Reviewed By: {appeal.reviewer?.fullName || 'Admin'}
                </Text>
                <Text style={styles.infoLabel}>
                  Date: {formatDate(appeal.reviewedAt!)}
                </Text>
                {appeal.reviewNotes && (
                  <View style={styles.reviewNotesCard}>
                    <Text style={styles.reviewNotesLabel}>Notes:</Text>
                    <Text style={styles.reviewNotesText}>
                      {appeal.reviewNotes}
                    </Text>
                  </View>
                )}
              </View>
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
                  onPress={() => handleReviewAction('APPROVE')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReviewAction('REJECT')}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
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
                  {reviewAction === 'APPROVE'
                    ? 'Approve Appeal'
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
                  {reviewAction === 'APPROVE'
                    ? 'By approving this appeal, the job post will be restored to ACTIVE status.'
                    : 'By rejecting this appeal, the job post will be permanently REJECTED.'}
                </Text>

                <Text style={styles.modalLabel}>
                  Review Notes <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your review notes here..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                />
                <Text style={styles.helperText}>
                  Please explain your decision. This will be shared with the
                  employer.
                </Text>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowReviewModal(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    reviewAction === 'REJECT' && styles.modalRejectButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  onPress={submitReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>
                      {reviewAction === 'APPROVE' ? 'Approve' : 'Reject'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  mainSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 8,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  infoCard: {
    padding: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  explanationCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  explanationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  evidenceScrollView: {
    flexDirection: 'row',
  },
  evidenceThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  evidenceDocIcon: {
    alignItems: 'center',
  },
  evidenceDocText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  evidenceOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  // Job Details Styles
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  companyLogoImage: {
    width: '100%',
    height: '100%',
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  companyLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748B',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    color: '#15803D',
    marginLeft: 4,
    fontWeight: '500',
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  industryText: {
    fontSize: 14,
    color: '#64748B',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gridLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  remoteTag: {
    fontSize: 10,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    overflow: 'hidden',
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  // Review Section
  adminReviewSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminReviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  reviewNotesCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  reviewNotesText: {
    fontSize: 14,
    color: '#334155',
  },
  actionSection: {
    alignItems: 'center',
    marginBottom: 20,
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
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  // Modal Styles
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  modalRejectButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AdminAppealReviewScreen;
