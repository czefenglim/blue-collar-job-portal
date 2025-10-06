import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface JobDetails {
  id: number;
  title: string;
  company: { name: string };
}

interface UserProfile {
  fullName: string;
  phoneNumber: string | null;
  email: string;
  profile: {
    city: string | null;
    state: string | null;
    experienceYears: number;
    resumeUrl: string | null;
    profileCompleted: boolean;
    skills: Array<{ skill: { name: string } }>;
    industries: Array<{ industry: { name: string } }>;
  } | null;
}

const ApplyConfirmationScreen: React.FC = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string>('');

  // Form fields for incomplete profiles
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [showIncompleteForm, setShowIncompleteForm] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('applyConfirmation.authenticationRequired'),
          t('applyConfirmation.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);
      await Promise.all([
        fetchJobDetails(userToken),
        fetchUserProfile(userToken),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('applyConfirmation.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/jobs/${slug}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJob(data.data);
      }
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  };

  const fetchUserProfile = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/users/getProfile`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.data);

        // Pre-fill form if data exists
        if (data.data.phoneNumber) setPhoneNumber(data.data.phoneNumber);
        if (data.data.profile?.city) setCity(data.data.profile.city);
        if (data.data.profile?.state) setState(data.data.profile.state);
        if (data.data.profile?.experienceYears) {
          setExperienceYears(data.data.profile.experienceYears.toString());
        }

        // Check if profile is incomplete
        const hasRequiredInfo =
          data.data.phoneNumber &&
          data.data.profile?.city &&
          data.data.profile?.experienceYears !== undefined;

        setShowIncompleteForm(!hasRequiredInfo);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfileAndApply = async () => {
    // Validate required fields
    if (!phoneNumber.trim()) {
      Alert.alert(
        t('common.required'),
        t('applyConfirmation.validation.phoneRequired')
      );
      return;
    }
    if (!city.trim()) {
      Alert.alert(
        t('common.required'),
        t('applyConfirmation.validation.cityRequired')
      );
      return;
    }
    if (!state.trim()) {
      Alert.alert(
        t('common.required'),
        t('applyConfirmation.validation.stateRequired')
      );
      return;
    }
    if (!experienceYears.trim()) {
      Alert.alert(
        t('common.required'),
        t('applyConfirmation.validation.experienceRequired')
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Update profile first
      const updateResponse = await fetch(`${URL}/api/users/updateProfile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          city,
          state,
          experienceYears: parseInt(experienceYears),
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Then submit application
      await submitApplication();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        t('common.error'),
        t('applyConfirmation.errors.updateFailed')
      );
      setIsSubmitting(false);
    }
  };

  const submitApplication = async () => {
    if (!job) return;

    try {
      setIsSubmitting(true);

      const response = await fetch(`${URL}/api/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coverLetter: '', // Optional
          resumeUrl: userProfile?.profile?.resumeUrl || null,
        }),
      });

      if (response.ok) {
        Alert.alert(
          t('applyConfirmation.success.title'),
          t('applyConfirmation.success.message', { jobTitle: job.title }),
          [
            {
              text: t('applyConfirmation.success.viewApplications'),
              onPress: () => router.push('/AppliedJobScreen'),
            },
            {
              text: t('applyConfirmation.success.backToJobs'),
              onPress: () => router.push('/HomeScreen'),
            },
          ]
        );
      } else {
        const errorData = await response.json();
        Alert.alert(
          t('common.error'),
          errorData.message || t('applyConfirmation.errors.submitFailed')
        );
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert(
        t('common.error'),
        t('applyConfirmation.errors.submitFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmApplication = () => {
    if (showIncompleteForm) {
      updateProfileAndApply();
    } else {
      submitApplication();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>
            {t('applyConfirmation.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t('applyConfirmation.errors.loadFailed')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('applyConfirmation.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <Text style={styles.progressStepText}>1</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <Text style={styles.progressStepTextInactive}>2</Text>
            </View>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelActive}>
              {t('applyConfirmation.progress.reviewInfo')}
            </Text>
            <Text style={styles.progressLabelInactive}>
              {t('applyConfirmation.progress.submit')}
            </Text>
          </View>
        </View>

        {/* Job Info Card */}
        <View style={styles.jobCard}>
          <Text style={styles.jobCardLabel}>
            {t('applyConfirmation.applyingFor')}
          </Text>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>{job.company.name}</Text>
        </View>

        {showIncompleteForm ? (
          /* Incomplete Profile Form */
          <>
            <View style={styles.alertBox}>
              <Text style={styles.alertIcon}>ℹ️</Text>
              <Text style={styles.alertText}>
                {t('applyConfirmation.incompleteProfile.alert')}
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>
                {t('applyConfirmation.incompleteProfile.title')}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('editProfile.fullName')}
                </Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>
                    {userProfile.fullName}
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('applyConfirmation.incompleteProfile.phoneNumber')}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t(
                    'applyConfirmation.incompleteProfile.phonePlaceholder'
                  )}
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('profile.city')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t(
                    'applyConfirmation.incompleteProfile.cityPlaceholder'
                  )}
                  placeholderTextColor="#94A3B8"
                  value={city}
                  onChangeText={setCity}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('profile.state')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t(
                    'applyConfirmation.incompleteProfile.statePlaceholder'
                  )}
                  placeholderTextColor="#94A3B8"
                  value={state}
                  onChangeText={setState}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('profile.yearsOfExperience')}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t(
                    'applyConfirmation.incompleteProfile.experiencePlaceholder'
                  )}
                  placeholderTextColor="#94A3B8"
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        ) : (
          /* Complete Profile Summary */
          <View style={styles.summarySection}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>
                {t('applyConfirmation.completeProfile.title')}
              </Text>
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>
                  {t('applyConfirmation.completeProfile.badge')}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>👤</Text>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryLabel}>
                    {t('editProfile.fullName')}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {userProfile.fullName}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>📞</Text>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryLabel}>{t('profile.phone')}</Text>
                  <Text style={styles.summaryValue}>
                    {userProfile.phoneNumber}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryIcon}>📧</Text>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryLabel}>{t('profile.email')}</Text>
                  <Text style={styles.summaryValue}>{userProfile.email}</Text>
                </View>
              </View>

              {userProfile.profile && (
                <>
                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryIcon}>📍</Text>
                    <View style={styles.summaryInfo}>
                      <Text style={styles.summaryLabel}>
                        {t('profile.sections.address')}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {userProfile.profile.city}, {userProfile.profile.state}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryIcon}>💼</Text>
                    <View style={styles.summaryInfo}>
                      <Text style={styles.summaryLabel}>
                        {t('profile.yearsOfExperience')}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {userProfile.profile.experienceYears}{' '}
                        {t('profile.years')}
                      </Text>
                    </View>
                  </View>

                  {userProfile.profile.skills.length > 0 && (
                    <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryIcon}>🧰</Text>
                        <View style={styles.summaryInfo}>
                          <Text style={styles.summaryLabel}>
                            {t('profile.skills')}
                          </Text>
                          <View style={styles.skillsContainer}>
                            {userProfile.profile.skills
                              .slice(0, 5)
                              .map((item, index) => (
                                <View key={index} style={styles.skillTag}>
                                  <Text style={styles.skillTagText}>
                                    {item.skill.name}
                                  </Text>
                                </View>
                              ))}
                            {userProfile.profile.skills.length > 5 && (
                              <Text style={styles.moreText}>
                                +{userProfile.profile.skills.length - 5}{' '}
                                {t('applyConfirmation.completeProfile.more')}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </>
                  )}

                  {userProfile.profile.resumeUrl && (
                    <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryIcon}>📄</Text>
                        <View style={styles.summaryInfo}>
                          <Text style={styles.summaryLabel}>
                            {t('profile.viewResume')}
                          </Text>
                          <Text style={styles.summaryValue}>
                            {t(
                              'applyConfirmation.completeProfile.resumeAttached'
                            )}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/EditProfileScreen')}
            >
              <Text style={styles.editProfileText}>
                {t('applyConfirmation.completeProfile.editProfile')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleConfirmApplication}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? t('applyConfirmation.submitting')
              : t('applyConfirmation.confirmApplication')}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E3A8A',
    fontWeight: 'bold',
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
  progressSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginBottom: 12,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#1E3A8A',
  },
  progressStepText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressStepTextInactive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressLabelActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  progressLabelInactive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  jobCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  jobCardLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 15,
    color: '#475569',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readOnlyText: {
    fontSize: 15,
    color: '#64748B',
  },
  summarySection: {
    paddingHorizontal: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  completeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  skillTagText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#64748B',
    paddingVertical: 4,
  },
  editProfileButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ApplyConfirmationScreen;
