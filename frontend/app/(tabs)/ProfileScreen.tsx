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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ms', label: 'BM', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil', flag: '🇮🇳' },
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
    resumeUrl_en?: string | null;
    resumeUrl_ms?: string | null;
    resumeUrl_zh?: string | null;
    resumeUrl_ta?: string | null;
    resumeUrl_uploaded?: string | null;
    profileCompleted: boolean;
    industries: {
      industry: {
        id: number;
        name: string;
        slug: string;
      };
    }[];
    skills: {
      skill: {
        id: number;
        name: string;
      };
    }[];
    languages: {
      language: {
        id: number;
        name: string;
      };
    }[];
  } | null;
}

// Color palette
const PRIMARY_BLUE = '#1E40AF';
const ACCENT_GREEN = '#10B981';
const ACCENT_PURPLE = '#8B5CF6';
const ACCENT_ORANGE = '#F59E0B';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const TEXT_TERTIARY = '#94A3B8';

const ProfileScreen: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const router = useRouter();
  const { t, currentLanguage, changeLanguage } = useLanguage();

  const fetchProfile = useCallback(
    async (userToken: string) => {
      try {
        const response = await fetch(
          `${URL}/api/users/getProfile?lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          }
        );

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
    },
    [currentLanguage]
  );

  const loadProfile = useCallback(async () => {
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
  }, [t, router, fetchProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const openResume = async () => {
    try {
      const p: any = userProfile?.profile;
      if (!p) return;

      let keyOrUrl: string | null = null;
      if (currentLanguage === 'ms')
        keyOrUrl = p.resumeUrl_ms || p.resumeUrl_uploaded || null;
      else if (currentLanguage === 'zh')
        keyOrUrl = p.resumeUrl_zh || p.resumeUrl_uploaded || null;
      else if (currentLanguage === 'ta')
        keyOrUrl = p.resumeUrl_ta || p.resumeUrl_uploaded || null;
      else keyOrUrl = p.resumeUrl_en || p.resumeUrl_uploaded || null;

      if (!keyOrUrl) {
        Alert.alert(t('common.error'), t('profile.errors.noResume'));
        return;
      }

      let targetUrl = keyOrUrl as string;
      const isHttp = /^https?:\/\//i.test(keyOrUrl as string);
      if (!isHttp) {
        const encodedKey = encodeURIComponent(keyOrUrl as string);
        const resp = await fetch(`${URL}/api/onboarding/resume/${encodedKey}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await resp.json();
        const signedUrl =
          data?.resumeUrl ||
          data?.data?.url ||
          (typeof data === 'string' ? data : null);
        if (!signedUrl) {
          Alert.alert(t('common.error'), t('profile.errors.resumeOpenFailed'));
          return;
        }
        targetUrl = signedUrl;
      }

      await WebBrowser.openBrowserAsync(targetUrl);
    } catch (err) {
      console.error('Open resume error:', err);
      Alert.alert(t('common.error'), t('profile.errors.resumeOpenFailed'));
    }
  };

  const getResumeKeyForCurrentLanguage = () => {
    const p: any = userProfile?.profile;
    if (!p) return null;
    if (currentLanguage === 'ms')
      return p.resumeUrl_ms || p.resumeUrl_uploaded || null;
    if (currentLanguage === 'zh')
      return p.resumeUrl_zh || p.resumeUrl_uploaded || null;
    if (currentLanguage === 'ta')
      return p.resumeUrl_ta || p.resumeUrl_uploaded || null;
    return p.resumeUrl_en || p.resumeUrl_uploaded || null;
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

    return genderMap[gender] || gender;
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

    return hoursMap[hours] || hours;
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

    return transportMap[mode] || mode;
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
    const basicFields = [
      profile.dateOfBirth,
      profile.gender,
      profile.nationality,
    ];
    totalFields += basicFields.length;
    completedFields += basicFields.filter(Boolean).length;

    const addressFields = [
      profile.address,
      profile.city,
      profile.state,
      profile.postcode,
    ];
    totalFields += addressFields.length;
    completedFields += addressFields.filter(Boolean).length;

    const jobFields = [
      profile.preferredSalaryMin,
      profile.workingHours,
      profile.transportMode,
    ];
    totalFields += jobFields.length;
    completedFields += jobFields.filter(Boolean).length;

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
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color={PRIMARY_BLUE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/EditProfileScreen')}
        >
          <Text style={styles.editButtonText}>
            {t('common.edit') || 'Edit'}
          </Text>
          <Ionicons name="create-outline" size={24} color={PRIMARY_BLUE} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#4F46E5', '#3730A3']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.avatarContainer}>
                {userProfile.profile?.profilePicture ? (
                  <Image
                    source={{ uri: userProfile.profile.profilePicture }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {userProfile.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.verificationBadge}>
                  {userProfile.isEmailVerified ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#FFFFFF"
                    />
                  ) : (
                    <Ionicons name="alert-circle" size={16} color="#FEF3C7" />
                  )}
                </View>
              </View>

              <View style={styles.heroInfo}>
                <Text style={styles.userName}>{userProfile.fullName}</Text>
                <Text style={styles.userEmail}>{userProfile.email}</Text>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.statText}>
                      {t('profile.memberSince')}{' '}
                      {getMemberSince(userProfile.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Ionicons
                      name="briefcase-outline"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.statText}>
                      {userProfile.profile?.experienceYears || 0}{' '}
                      {t('profile.years')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Completion Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressIconContainer}>
              <Ionicons name="trophy-outline" size={20} color={ACCENT_ORANGE} />
            </View>
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressTitle}>
                {t('profile.completion.title')}
              </Text>
              <Text style={styles.progressPercentage}>
                {completionPercentage}%
              </Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#4F46E5', '#3730A3']}
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%` },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>

          {completionPercentage < 100 && (
            <TouchableOpacity
              style={styles.completeProfileButton}
              onPress={() => router.push('/EditProfileScreen')}
            >
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              <Text style={styles.completeProfileText}>
                {t('profile.completion.hint')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Personal Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: '#EFF6FF' },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={PRIMARY_BLUE} />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.personalInfo')}
            </Text>
          </View>

          <InfoRow
            icon="call-outline"
            label={t('profile.phoneNumber')}
            value={userProfile.phoneNumber || t('profile.notProvided')}
            isVerified={userProfile.isPhoneVerified}
          />

          {userProfile.profile && (
            <>
              <InfoRow
                icon="calendar-outline"
                label={t('profile.dateOfBirth')}
                value={formatDate(userProfile.profile.dateOfBirth)}
              />
              <InfoRow
                icon="male-female-outline"
                label={t('profile.gender.title')}
                value={formatGender(userProfile.profile.gender)}
              />
              <InfoRow
                icon="globe-outline"
                label={t('profile.nationality')}
                value={
                  userProfile.profile.nationality || t('profile.notSpecified')
                }
              />
            </>
          )}
        </View>

        {/* Address Card */}
        {userProfile.profile &&
          (userProfile.profile.address || userProfile.profile.city) && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIconContainer,
                    { backgroundColor: '#F0FDF4' },
                  ]}
                >
                  <Ionicons
                    name="home-outline"
                    size={20}
                    color={ACCENT_GREEN}
                  />
                </View>
                <Text style={styles.sectionTitle}>
                  {t('profile.sections.address')}
                </Text>
              </View>

              <View style={styles.addressCard}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={TEXT_SECONDARY}
                />
                <View style={styles.addressContent}>
                  {userProfile.profile.address && (
                    <Text style={styles.addressLine}>
                      {userProfile.profile.address}
                    </Text>
                  )}
                  <Text style={styles.addressDetails}>
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
            </View>
          )}

        {/* Job Preferences Card */}
        {userProfile.profile && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: '#FEF3C7' },
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color={ACCENT_ORANGE}
                />
              </View>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.jobPreferences')}
              </Text>
            </View>

            <View style={styles.preferenceSection}>
              <Text style={styles.preferenceLabel}>
                {t('profile.preferredIndustries')}
              </Text>
              {userProfile.profile.industries.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tagsScroll}
                >
                  {userProfile.profile.industries.map((item) => (
                    <View key={item.industry.id} style={styles.industryTag}>
                      <Text style={styles.industryTagText}>
                        {item.industry.name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>
                  {t('profile.noIndustries')}
                </Text>
              )}
            </View>

            <InfoRow
              icon="cash-outline"
              label={t('profile.expectedSalary')}
              value={formatSalary(
                userProfile.profile.preferredSalaryMin,
                userProfile.profile.preferredSalaryMax
              )}
            />

            <InfoRow
              icon="time-outline"
              label={t('profile.workingHours')}
              value={formatWorkingHours(userProfile.profile.workingHours)}
            />

            <InfoRow
              icon="car-outline"
              label={t('profile.transportMode')}
              value={formatTransportMode(userProfile.profile.transportMode)}
            />

            {userProfile.profile.maxTravelDistance && (
              <InfoRow
                icon="navigate-outline"
                label={t('profile.maxTravelDistance')}
                value={`${userProfile.profile.maxTravelDistance} km`}
              />
            )}

            <InfoRow
              icon="calendar-check-outline"
              label={t('profile.availableFrom')}
              value={formatDate(userProfile.profile.availableFrom)}
            />
          </View>
        )}

        {/* Skills & Experience Card */}
        {userProfile.profile && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: '#F0F9FF' },
                ]}
              >
                <Ionicons name="rocket-outline" size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.skillsExperience')}
              </Text>
            </View>

            <InfoRow
              icon="trending-up-outline"
              label={t('profile.yearsOfExperience')}
              value={`${userProfile.profile.experienceYears} ${t(
                'profile.years'
              )}`}
            />

            <View style={styles.preferenceSection}>
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

            <View style={styles.preferenceSection}>
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

            {getResumeKeyForCurrentLanguage() && (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={openResume}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.resumeButtonText}>
                  {t('profile.viewResume')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: '#EFF6FF' },
              ]}
            >
              <Ionicons name="flash-outline" size={20} color={PRIMARY_BLUE} />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.quickActions')}
            </Text>
          </View>

          <ActionButton
            icon="bookmark-outline"
            title={t('profile.actions.savedJobs')}
            onPress={() => router.push('/SavedJobsScreen')}
            color={PRIMARY_BLUE}
          />
          <ActionButton
            icon="document-text-outline"
            title={t('profile.actions.myApplications')}
            onPress={() => router.push('/AppliedJobScreen')}
            color={ACCENT_GREEN}
          />
          <ActionButton
            icon="settings-outline"
            title={t('profile.actions.preferences')}
            onPress={() => router.push('/PreferencesScreen')}
            color={ACCENT_PURPLE}
          />
        </View>

        {/* Language Selection Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: '#F0F9FF' },
              ]}
            >
              <Ionicons name="globe-outline" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.language') || 'Language'}
            </Text>
          </View>

          <Text style={styles.languageSubtitle}>
            {t('profile.selectLanguage') || 'Select your preferred language'}
          </Text>

          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLanguage === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <View style={styles.languageInfo}>
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
                </View>
                {currentLanguage === lang.code && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={ACCENT_GREEN}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reports Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: '#FEF2F2' },
              ]}
            >
              <Ionicons name="flag-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.reports') || 'Reports'}
            </Text>
          </View>

          <ActionButton
            icon="flag-outline"
            title={t('profile.actions.myReports') || 'My Reports'}
            onPress={() => router.push('/(user-hidden)/report-history')}
            color="#EF4444"
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('profile.logout.button')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Components
const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: string;
  isVerified?: boolean;
}> = ({ icon, label, value, isVerified }) => (
  <View style={infoRowStyles.container}>
    <View style={infoRowStyles.iconContainer}>
      <Ionicons name={icon as any} size={18} color={TEXT_SECONDARY} />
    </View>
    <View style={infoRowStyles.content}>
      <Text style={infoRowStyles.label}>{label}</Text>
      <View style={infoRowStyles.valueContainer}>
        <Text style={infoRowStyles.value}>{value}</Text>
        {isVerified !== undefined && (
          <Ionicons
            name={isVerified ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={isVerified ? ACCENT_GREEN : TEXT_TERTIARY}
            style={infoRowStyles.verificationIcon}
          />
        )}
      </View>
    </View>
  </View>
);

const ActionButton: React.FC<{
  icon: string;
  title: string;
  onPress: () => void;
  color: string;
}> = ({ icon, title, onPress, color }) => (
  <TouchableOpacity style={actionButtonStyles.container} onPress={onPress}>
    <View
      style={[
        actionButtonStyles.iconContainer,
        { backgroundColor: `${color}10` },
      ]}
    >
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={actionButtonStyles.title}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color={TEXT_TERTIARY} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: TEXT_SECONDARY,
    marginBottom: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: CARD_BACKGROUND,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  content: {
    flex: 1,
  },
  // Hero Card
  heroCard: {
    margin: 24,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  heroGradient: {
    padding: 24,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: PRIMARY_BLUE,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Progress Card
  progressCard: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completeProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  completeProfileText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Section Cards
  sectionCard: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  // Address
  addressCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  addressContent: {
    flex: 1,
  },
  addressLine: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  // Preferences
  preferenceSection: {
    marginBottom: 20,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  tagsScroll: {
    flexDirection: 'row',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  industryTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginRight: 8,
    marginBottom: 8,
  },
  industryTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  skillTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginRight: 8,
    marginBottom: 8,
  },
  skillTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_GREEN,
  },
  languageTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginRight: 8,
    marginBottom: 8,
  },
  languageTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  emptyText: {
    fontSize: 15,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  // Resume Button
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 12,
    marginTop: 8,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Language Selection
  languageSubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginBottom: 20,
    fontWeight: '500',
  },
  languageGrid: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    gap: 16,
  },
  languageOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: PRIMARY_BLUE,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageInfo: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  languageLabelActive: {
    color: PRIMARY_BLUE,
  },
  languageName: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  languageNameActive: {
    color: PRIMARY_BLUE,
    fontWeight: '600',
  },
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  bottomSpacer: {
    height: 20,
  },
});

const infoRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: TEXT_TERTIARY,
    marginBottom: 6,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  verificationIcon: {
    marginLeft: 'auto',
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
});

export default ProfileScreen;
