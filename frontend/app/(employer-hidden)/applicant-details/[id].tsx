import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface QualityScore {
  score: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
  breakdown: {
    profileCompleteness: number;
    experienceMatch: number;
    skillsMatch: number;
    locationMatch: number;
    availabilityScore: number;
  };
  strengths: string[];
  improvements: string[];
}

interface ApplicantDetail {
  id: number;
  userId: number;
  jobId: number;
  status: string;
  coverLetter?: string;
  resumeUrl?: string;
  appliedAt: string;
  updatedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
    profile?: {
      experienceYears: number;
      city?: string;
      state?: string;
      profilePicture?: string;
    };
  };
  job: {
    id: number;
    title: string;
    jobType: string;
    city: string;
    state: string;
  };
}

export default function ApplicantDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const applicationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicantDetail();
    fetchQualityScore();
  }, [applicationId]);

  const fetchApplicantDetail = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(
        `${URL}/api/employer/applicants/${applicationId}`,
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
        throw new Error(data.message || 'Failed to fetch applicant details');
      }

      setApplicant(data.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching applicant:', error);
      setError(error.message || 'Failed to load applicant details');
    } finally {
      setLoading(false);
    }
  };

  const fetchQualityScore = async () => {
    try {
      setLoadingQuality(true);
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) return;

      const response = await fetch(
        `${URL}/api/jobs/applicants/${applicationId}/quality-score`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setQualityScore(data.data);
      }
    } catch (error: any) {
      console.error('Error fetching quality score:', error);
    } finally {
      setLoadingQuality(false);
    }
  };

  const handleStatusChange = async (action: 'shortlist' | 'reject') => {
    if (!applicant) return;

    Alert.alert(
      action === 'shortlist' ? 'Shortlist Applicant' : 'Reject Applicant',
      `Are you sure you want to ${action} ${applicant.user.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/applicants/${applicationId}/${action}`,
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
                  data.message || `Failed to ${action} applicant`
                );
              }

              Alert.alert(
                'Success',
                `Applicant ${
                  action === 'shortlist' ? 'shortlisted' : 'rejected'
                } successfully`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      fetchApplicantDetail();
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error(`Error ${action}ing applicant:`, error);
              Alert.alert(
                'Error',
                error.message || `Failed to ${action} applicant`
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenResume = () => {
    if (applicant?.resumeUrl) {
      Linking.openURL(applicant.resumeUrl).catch((err) =>
        Alert.alert('Error', 'Could not open resume link')
      );
    } else {
      Alert.alert('No Resume', 'This applicant has not uploaded a resume');
    }
  };

  const handleContact = (type: 'email' | 'phone') => {
    if (!applicant) return;

    if (type === 'email') {
      Linking.openURL(`mailto:${applicant.user.email}`);
    } else if (type === 'phone' && applicant.user.phoneNumber) {
      Linking.openURL(`tel:${applicant.user.phoneNumber}`);
    } else {
      Alert.alert(
        'No Phone Number',
        'This applicant has not provided a phone number'
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'SHORTLISTED':
        return '#8B5CF6';
      case 'INTERVIEWED':
        return '#3B82F6';
      case 'REJECTED':
        return '#EF4444';
      case 'HIRED':
        return '#10B981';
      default:
        return '#64748B';
    }
  };

  const getQualityColor = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return '#10B981';
      case 'MEDIUM':
        return '#F59E0B';
      case 'LOW':
        return '#EF4444';
    }
  };

  const getQualityIcon = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return 'star';
      case 'MEDIUM':
        return 'star-half';
      case 'LOW':
        return 'star-outline';
    }
  };

  const handleStartChat = async () => {
    if (!applicant) return;

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      // First, check if conversation exists
      const checkResponse = await fetch(
        `${URL}/api/chat/conversations/application/${applicant.id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let conversationId: number;

      if (checkResponse.ok) {
        // Conversation exists
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.data) {
          conversationId = checkData.data.id;
        } else {
          throw new Error('Invalid response format');
        }
      } else if (checkResponse.status === 404) {
        // Conversation doesn't exist, create it
        const createResponse = await fetch(`${URL}/api/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ applicationId: applicant.id }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.message || 'Failed to create conversation');
        }

        const createData = await createResponse.json();
        if (createData.success && createData.data) {
          conversationId = createData.data.id;
        } else {
          throw new Error('Failed to create conversation');
        }
      } else {
        throw new Error('Failed to check conversation');
      }

      // Navigate to chat with the conversation ID
      router.push(
        `/(shared)/chat/${conversationId}?name=${encodeURIComponent(
          applicant.user.fullName
        )}&jobTitle=${encodeURIComponent(applicant.job.title)}` as Href
      );
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to start chat. Please try again.'
      );
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading applicant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !applicant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Applicant not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
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
          <View style={styles.avatarContainer}>
            {applicant.user.profile?.profilePicture ? (
              <Image
                source={{ uri: applicant.user.profile.profilePicture }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {applicant.user.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.applicantName}>{applicant.user.fullName}</Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(applicant.status) + '20' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(applicant.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(applicant.status) },
                ]}
              >
                {applicant.status}
              </Text>
            </View>

            {/* Quality Badge */}
            {qualityScore && (
              <View
                style={[
                  styles.qualityBadgeLarge,
                  {
                    backgroundColor:
                      getQualityColor(qualityScore.quality) + '20',
                  },
                ]}
              >
                <Ionicons
                  name={getQualityIcon(qualityScore.quality)}
                  size={16}
                  color={getQualityColor(qualityScore.quality)}
                />
                <Text
                  style={[
                    styles.qualityBadgeText,
                    { color: getQualityColor(qualityScore.quality) },
                  ]}
                >
                  {qualityScore.quality} QUALITY
                </Text>
              </View>
            )}
          </View>

          {/* Quick Contact */}
          <View style={styles.quickContactRow}>
            {/* ✅ NEW: Chat Button - First position */}
            <TouchableOpacity
              style={[styles.quickContactButton, styles.chatContactButton]}
              onPress={handleStartChat}
            >
              <Ionicons name="chatbubble" size={20} color="#10B981" />
              <Text style={[styles.quickContactText, { color: '#10B981' }]}>
                Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickContactButton}
              onPress={() => handleContact('email')}
            >
              <Ionicons name="mail" size={20} color="#1E3A8A" />
              <Text style={styles.quickContactText}>Email</Text>
            </TouchableOpacity>

            {applicant.user.phoneNumber && (
              <TouchableOpacity
                style={styles.quickContactButton}
                onPress={() => handleContact('phone')}
              >
                <Ionicons name="call" size={20} color="#1E3A8A" />
                <Text style={styles.quickContactText}>Call</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.quickContactButton}
              onPress={handleOpenResume}
            >
              <Ionicons name="document-text" size={20} color="#1E3A8A" />
              <Text style={styles.quickContactText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quality Score Section */}
        {qualityScore && (
          <View style={styles.qualitySection}>
            <View style={styles.qualitySectionHeader}>
              <Ionicons name="analytics" size={24} color="#1E3A8A" />
              <Text style={styles.qualitySectionTitle}>
                Quality Score Analysis
              </Text>
            </View>

            {/* Overall Score */}
            <View style={styles.overallScoreContainer}>
              <View style={styles.overallScoreCircle}>
                <Text style={styles.overallScoreValue}>
                  {qualityScore.score}
                </Text>
                <Text style={styles.overallScoreLabel}>/ 100</Text>
              </View>
              <Text
                style={[
                  styles.overallQualityLabel,
                  { color: getQualityColor(qualityScore.quality) },
                ]}
              >
                {qualityScore.quality} QUALITY CANDIDATE
              </Text>
            </View>

            {/* Score Breakdown */}
            <View style={styles.scoreBreakdown}>
              {renderScoreBar(
                'Profile Completeness',
                qualityScore.breakdown.profileCompleteness,
                25
              )}
              {renderScoreBar(
                'Experience Match',
                qualityScore.breakdown.experienceMatch,
                25
              )}
              {renderScoreBar(
                'Skills Match',
                qualityScore.breakdown.skillsMatch,
                25
              )}
              {renderScoreBar(
                'Location Match',
                qualityScore.breakdown.locationMatch,
                15
              )}
              {renderScoreBar(
                'Additional Factors',
                qualityScore.breakdown.availabilityScore,
                10
              )}
            </View>

            {/* Strengths */}
            {qualityScore.strengths.length > 0 && (
              <View style={styles.strengthsContainer}>
                <Text style={styles.strengthsTitle}>✅ Strengths</Text>
                {qualityScore.strengths.map((strength, index) => (
                  <View key={index} style={styles.strengthItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text style={styles.strengthText}>{strength}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Improvements */}
            {qualityScore.improvements.length > 0 && (
              <View style={styles.improvementsContainer}>
                <Text style={styles.improvementsTitle}>
                  💡 Areas for Improvement
                </Text>
                {qualityScore.improvements.map((improvement, index) => (
                  <View key={index} style={styles.improvementItem}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#F59E0B"
                    />
                    <Text style={styles.improvementText}>{improvement}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {loadingQuality && (
          <View style={styles.qualityLoading}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={styles.qualityLoadingText}>
              Analyzing applicant quality...
            </Text>
          </View>
        )}

        {/* Applied Job */}
        {renderSection(
          'Applied Position',
          <View>
            <Text style={styles.jobTitle}>{applicant.job.title}</Text>
            <View style={styles.jobMeta}>
              <Ionicons name="briefcase-outline" size={16} color="#64748B" />
              <Text style={styles.jobMetaText}>{applicant.job.jobType}</Text>
            </View>
            <View style={styles.jobMeta}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.jobMetaText}>
                {applicant.job.city}, {applicant.job.state}
              </Text>
            </View>
          </View>
        )}

        {/* Contact Information */}
        {renderSection(
          'Contact Information',
          <View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#64748B" />
              <Text style={styles.infoText}>{applicant.user.email}</Text>
            </View>
            {applicant.user.phoneNumber && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#64748B" />
                <Text style={styles.infoText}>
                  {applicant.user.phoneNumber}
                </Text>
              </View>
            )}
            {applicant.user.profile && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#64748B" />
                <Text style={styles.infoText}>
                  {applicant.user.profile.city || 'N/A'},{' '}
                  {applicant.user.profile.state || 'N/A'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Experience */}
        {applicant.user.profile &&
          renderSection(
            'Experience',
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={20} color="#64748B" />
              <Text style={styles.infoText}>
                {applicant.user.profile.experienceYears} years of experience
              </Text>
            </View>
          )}

        {/* Cover Letter */}
        {applicant.coverLetter &&
          renderSection(
            'Cover Letter',
            <Text style={styles.coverLetterText}>{applicant.coverLetter}</Text>
          )}

        {/* Timeline */}
        {renderSection(
          'Timeline',
          <View>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Applied</Text>
                <Text style={styles.timelineDate}>
                  {new Date(applicant.appliedAt).toLocaleString()}
                </Text>
              </View>
            </View>
            {applicant.updatedAt !== applicant.appliedAt && (
              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, { backgroundColor: '#8B5CF6' }]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Last Updated</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(applicant.updatedAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {applicant.status !== 'REJECTED' && applicant.status !== 'HIRED' && (
        <View style={styles.actionBar}>
          {applicant.status !== 'SHORTLISTED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.shortlistButton]}
              onPress={() => handleStatusChange('shortlist')}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="star" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Shortlist</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              applicant.status === 'SHORTLISTED'
                ? { backgroundColor: '#D1D5DB' }
                : styles.rejectButton,
            ]}
            disabled={actionLoading || applicant.status === 'SHORTLISTED'}
            onPress={() => handleStatusChange('reject')}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={
                    applicant.status === 'SHORTLISTED'
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {applicant.status === 'SHORTLISTED'
                    ? 'Shortlisted'
                    : 'Reject'}
                </Text>
              </>
            )}
          </TouchableOpacity>
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
  avatarContainer: {
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden', // ✅ Important for circular clipping
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    resizeMode: 'cover',
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  applicantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qualityBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  qualityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickContactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 6,
  },
  quickContactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  qualitySection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
  },
  qualitySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  qualitySectionTitle: {
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
    color: '#1E3A8A',
  },
  overallScoreLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  overallQualityLabel: {
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
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  strengthText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  improvementsContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
  },
  improvementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  improvementText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  qualityLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  qualityLoadingText: {
    fontSize: 14,
    color: '#64748B',
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
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  jobMetaText: {
    fontSize: 14,
    color: '#64748B',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  coverLetterText: {
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
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  shortlistButton: {
    backgroundColor: '#8B5CF6',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatContactButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
  },
});
