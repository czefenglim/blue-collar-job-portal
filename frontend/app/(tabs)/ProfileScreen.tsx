import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh', label: '中文', name: 'Chinese' },
  { code: 'ms', label: 'BM', name: 'Bahasa Melayu' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
];

interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  profile: {
    id: number;
    dateOfBirth: string | null;
    gender: string | null;
    nationality: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    profilePicture: string | null;
    preferredSalaryMin: number | null;
    preferredSalaryMax: number | null;
    availableFrom: string | null;
    workingHours: string | null;
    transportMode: string | null;
    maxTravelDistance: number | null;
    experienceYears: number;
    certifications: string | null;
    resumeUrl: string | null;
    profileCompleted: boolean;
    industries: Array<{
      industry: {
        id: number;
        name: string;
        slug: string;
      };
    }>;
    skills: Array<{
      skill: {
        id: number;
        name: string;
      };
    }>;
    languages: Array<{
      language: {
        id: number;
        name: string;
      };
    }>;
  } | null;
}

const ProfileScreen: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const router = useRouter();
  const { t, currentLanguage, changeLanguage } = useLanguage();

  useEffect(() => {
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('profile.authenticationRequired'),
          t('profile.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);
      await fetchProfile(userToken);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert(t('common.error'), t('profile.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/users/getProfile`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.data);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('profile.logout.title'), t('profile.logout.confirmation'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('profile.logout.button'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('jwtToken');
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
          router.replace('/SelectRoleScreen');
        },
      },
    ]);
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await AsyncStorage.setItem('preferredLanguage', languageCode);
      changeLanguage(languageCode);
      Alert.alert(
        t('profile.languageChanged') || 'Language Changed',
        t('profile.languageChangedMessage') ||
          'Language has been updated successfully'
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        t('common.error'),
        t('profile.errors.languageChangeFailed') || 'Failed to change language'
      );
    }
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return t('profile.notSpecified');

    const genderMap: { [key: string]: string } = {
      MALE: t('profile.gender.male'),
      FEMALE: t('profile.gender.female'),
      OTHER: t('profile.gender.other'),
      PREFER_NOT_TO_SAY: t('profile.gender.preferNotToSay'),
    };

    return (
      genderMap[gender] ||
      gender
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  const formatWorkingHours = (hours: string | null) => {
    if (!hours) return t('profile.notSpecified');

    const hoursMap: { [key: string]: string } = {
      DAY_SHIFT: t('workingHours.dayShift'),
      NIGHT_SHIFT: t('workingHours.nightShift'),
      ROTATING_SHIFT: t('workingHours.rotatingShift'),
      FLEXIBLE: t('workingHours.flexible'),
      WEEKEND_ONLY: t('workingHours.weekendOnly'),
    };

    return (
      hoursMap[hours] ||
      hours
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  const formatTransportMode = (mode: string | null) => {
    if (!mode) return t('profile.notSpecified');

    const transportMap: { [key: string]: string } = {
      OWN_VEHICLE: t('profile.transport.ownVehicle'),
      PUBLIC_TRANSPORT: t('profile.transport.publicTransport'),
      COMPANY_TRANSPORT: t('profile.transport.companyTransport'),
      MOTORCYCLE: t('profile.transport.motorcycle'),
      BICYCLE: t('profile.transport.bicycle'),
      WALKING: t('profile.transport.walking'),
    };

    return (
      transportMap[mode] ||
      mode
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('profile.notSpecified');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return t('profile.notSpecified');
    const formatAmount = (amount: number) => `RM ${amount.toLocaleString()}`;
    if (min && max) return `${formatAmount(min)} - ${formatAmount(max)}`;
    return formatAmount(min || max!);
  };

  const getMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getProfileCompletionPercentage = () => {
    if (!userProfile?.profile) return 0;

    let completedFields = 0;
    let totalFields = 0;

    const profile = userProfile.profile;

    // Basic info fields
    const basicFields = [
      profile.dateOfBirth,
      profile.gender,
      profile.nationality,
    ];
    totalFields += basicFields.length;
    completedFields += basicFields.filter(Boolean).length;

    // Address fields
    const addressFields = [
      profile.address,
      profile.city,
      profile.state,
      profile.postcode,
    ];
    totalFields += addressFields.length;
    completedFields += addressFields.filter(Boolean).length;

    // Job preference fields
    const jobFields = [
      profile.preferredSalaryMin,
      profile.workingHours,
      profile.transportMode,
    ];
    totalFields += jobFields.length;
    completedFields += jobFields.filter(Boolean).length;

    // Skills & experience
    const skillFields = [
      profile.experienceYears > 0,
      profile.skills.length > 0,
    ];
    totalFields += skillFields.length;
    completedFields += skillFields.filter(Boolean).length;

    return Math.round((completedFields / totalFields) * 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('profile.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('profile.errors.loadFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>{t('profile.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completionPercentage = getProfileCompletionPercentage();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1E3A8A', '#3730A3']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/EditProfileScreen')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.editButtonGradient}
            >
              <Text style={styles.editIcon}>✎</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#4F46E5', '#3730A3']}
            style={styles.profileGradient}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {userProfile.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userProfile.fullName}</Text>
                <Text style={styles.userEmail}>{userProfile.email}</Text>

                <View style={styles.verificationRow}>
                  <View style={styles.verificationItem}>
                    <View
                      style={[
                        styles.verificationDot,
                        userProfile.isEmailVerified
                          ? styles.verifiedDot
                          : styles.unverifiedDot,
                      ]}
                    />
                    <Text style={styles.verificationText}>
                      {t('profile.email')}{' '}
                      {userProfile.isEmailVerified
                        ? t('profile.verified')
                        : t('profile.unverified')}
                    </Text>
                  </View>
                  {userProfile.phoneNumber && (
                    <View style={styles.verificationItem}>
                      <View
                        style={[
                          styles.verificationDot,
                          userProfile.isPhoneVerified
                            ? styles.verifiedDot
                            : styles.unverifiedDot,
                        ]}
                      />
                      <Text style={styles.verificationText}>
                        {t('profile.phone')}{' '}
                        {userProfile.isPhoneVerified
                          ? t('profile.verified')
                          : t('profile.unverified')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.memberSinceContainer}>
              <Text style={styles.memberSinceText}>
                {t('profile.memberSince')}{' '}
                {getMemberSince(userProfile.createdAt)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Profile Completion Progress */}
        <View style={styles.section}>
          <View style={styles.completionHeader}>
            <Text style={styles.sectionTitle}>
              {t('profile.completion.title')}
            </Text>
            <Text style={styles.percentageText}>{completionPercentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
          {completionPercentage < 100 && (
            <Text style={styles.completionHint}>
              {t('profile.completion.hint')}
            </Text>
          )}
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.personalInfo')}
            </Text>
          </View>

          <InfoRow
            label={t('profile.phoneNumber')}
            value={userProfile.phoneNumber || t('profile.notProvided')}
          />

          {userProfile.profile && (
            <>
              <InfoRow
                label={t('profile.dateOfBirth')}
                value={formatDate(userProfile.profile.dateOfBirth)}
              />
              <InfoRow
                label={t('profile.gender.title')}
                value={formatGender(userProfile.profile.gender)}
              />
              <InfoRow
                label={t('profile.nationality')}
                value={
                  userProfile.profile.nationality || t('profile.notSpecified')
                }
              />
            </>
          )}
        </View>

        {/* Address */}
        {userProfile.profile &&
          (userProfile.profile.address || userProfile.profile.city) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🏠</Text>
                <Text style={styles.sectionTitle}>
                  {t('profile.sections.address')}
                </Text>
              </View>
              <View style={styles.addressContainer}>
                {userProfile.profile.address && (
                  <Text style={styles.addressLine}>
                    {userProfile.profile.address}
                  </Text>
                )}
                <Text style={styles.addressLine}>
                  {[
                    userProfile.profile.city,
                    userProfile.profile.state,
                    userProfile.profile.postcode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            </View>
          )}

        {/* Job Preferences */}
        {userProfile.profile && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💼</Text>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.jobPreferences')}
              </Text>
            </View>

            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>
                {t('profile.preferredIndustries')}
              </Text>
              {userProfile.profile.industries.length > 0 ? (
                <View style={styles.tagsContainer}>
                  {userProfile.profile.industries.map((item) => (
                    <View key={item.industry.id} style={styles.industryTag}>
                      <Text style={styles.industryTagText}>
                        {item.industry.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  {t('profile.noIndustries')}
                </Text>
              )}
            </View>

            <InfoRow
              label={t('profile.expectedSalary')}
              value={formatSalary(
                userProfile.profile.preferredSalaryMin,
                userProfile.profile.preferredSalaryMax
              )}
            />

            <InfoRow
              label={t('profile.workingHours')}
              value={formatWorkingHours(userProfile.profile.workingHours)}
            />
            <InfoRow
              label={t('profile.transportMode')}
              value={formatTransportMode(userProfile.profile.transportMode)}
            />

            {userProfile.profile.maxTravelDistance && (
              <InfoRow
                label={t('profile.maxTravelDistance')}
                value={`${userProfile.profile.maxTravelDistance} km`}
              />
            )}

            <InfoRow
              label={t('profile.availableFrom')}
              value={formatDate(userProfile.profile.availableFrom)}
            />
          </View>
        )}

        {/* Skills & Experience */}
        {userProfile.profile && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🚀</Text>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.skillsExperience')}
              </Text>
            </View>

            <InfoRow
              label={t('profile.yearsOfExperience')}
              value={`${userProfile.profile.experienceYears} ${t(
                'profile.years'
              )}`}
            />

            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>{t('profile.skills')}</Text>
              {userProfile.profile.skills.length > 0 ? (
                <View style={styles.tagsContainer}>
                  {userProfile.profile.skills.map((item) => (
                    <View key={item.skill.id} style={styles.skillTag}>
                      <Text style={styles.skillTagText}>{item.skill.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>{t('profile.noSkills')}</Text>
              )}
            </View>

            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>
                {t('profile.languages')}
              </Text>
              {userProfile.profile.languages.length > 0 ? (
                <View style={styles.tagsContainer}>
                  {userProfile.profile.languages.map((item) => (
                    <View key={item.language.id} style={styles.languageTag}>
                      <Text style={styles.languageTagText}>
                        {item.language.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>{t('profile.noLanguages')}</Text>
              )}
            </View>

            {userProfile.profile.resumeUrl && (
              <TouchableOpacity style={styles.resumeButton}>
                <Text style={styles.resumeIcon}>📄</Text>
                <Text style={styles.resumeButtonText}>
                  {t('profile.viewResume')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⚡</Text>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.quickActions')}
            </Text>
          </View>

          <ActionButton
            icon="🔖"
            title={t('profile.actions.savedJobs')}
            onPress={() => router.push('/SavedJobsScreen')}
          />
          <ActionButton
            icon="📝"
            title={t('profile.actions.myApplications')}
            onPress={() => router.push('/AppliedJobScreen')}
          />
          <ActionButton
            icon="⚙️"
            title={t('profile.actions.preferences')}
            onPress={() => router.push('/PreferencesScreen')}
          />
        </View>

        {/* Language Selection Section - ADD THIS BEFORE REPORTS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🌐</Text>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.language') || 'Language'}
            </Text>
          </View>

          <Text style={styles.languageSectionSubtitle}>
            {t('profile.selectLanguage') || 'Select your preferred language'}
          </Text>

          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageCard,
                  currentLanguage === lang.code && styles.languageCardActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <View style={styles.languageCardContent}>
                  <Text
                    style={[
                      styles.languageLabel,
                      currentLanguage === lang.code &&
                        styles.languageLabelActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                  <Text
                    style={[
                      styles.languageName,
                      currentLanguage === lang.code &&
                        styles.languageNameActive,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {currentLanguage === lang.code && (
                    <View style={styles.selectedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reports Section - NEW */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🚨</Text>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.reports') || 'Reports'}
            </Text>
          </View>

          <ActionButton
            icon="🚩"
            title={t('profile.actions.myReports') || 'My Reports'}
            onPress={() => router.push('/(user-hidden)/report-history')}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>{t('profile.logout.button')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Components
const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={infoRowStyles.container}>
    <Text style={infoRowStyles.label}>{label}</Text>
    <Text style={infoRowStyles.value}>{value}</Text>
  </View>
);

const ActionButton: React.FC<{
  icon: string;
  title: string;
  onPress: () => void;
}> = ({ icon, title, onPress }) => (
  <TouchableOpacity style={actionButtonStyles.container} onPress={onPress}>
    <Text style={actionButtonStyles.icon}>{icon}</Text>
    <Text style={actionButtonStyles.title}>{title}</Text>
    <Text style={actionButtonStyles.arrow}>›</Text>
  </TouchableOpacity>
);

// Styles (keep all your existing styles exactly the same)
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
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  editButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  profileGradient: {
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  verificationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  verifiedDot: {
    backgroundColor: '#10B981',
  },
  unverifiedDot: {
    backgroundColor: '#EF4444',
  },
  verificationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  memberSinceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  memberSinceText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 3,
  },
  completionHint: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  addressContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressLine: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
  },
  preferenceItem: {
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  industryTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  industryTagText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  skillTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  skillTagText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  languageTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  languageTagText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
  },
  resumeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resumeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  bottomSpacer: {
    height: 20,
  },
  languageSectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageCard: {
    width: '48%',
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  languageCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  languageCardContent: {
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  languageLabelActive: {
    color: '#1E3A8A',
  },
  languageName: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  languageNameActive: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
});

const infoRowStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
});

const actionButtonStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 20,
    color: '#CBD5E1',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
