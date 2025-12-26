import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

// --- Blue Theme Constants ---
const PRIMARY_BLUE = '#1E3A8A';
const SECONDARY_BLUE = '#1976D2';
const TERTIARY_BLUE = '#2196F3'; // For lighter accents
const LIGHT_BLUE_BG = '#F0F9FF'; // Very light blue for background
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1E293B';
const TEXT_GRAY = '#64748B';

// Functional colors (keep these for semantic meaning, but can be muted or blue-shifted if needed)
const SUCCESS_COLOR = '#10B981';
const ERROR_COLOR = '#EF4444';

const BLUE_GRADIENT = [PRIMARY_BLUE, SECONDARY_BLUE] as const;
const LIGHT_BLUE_GRADIENT = [SECONDARY_BLUE, TERTIARY_BLUE] as const;

interface ProfileData {
  user: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    roleLabel?: string;
  };
  company: {
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
    verificationStatus: string;
    onboardingCompleted: boolean;
    onboardingStep: number;
    industry?: {
      id: number;
      name: string;
    };
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!token || !userData) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(
        `${URL}/api/employer/profile?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }

      setProfile({
        user: {
          id: data.data.id,
          fullName: data.data.fullName,
          email: data.data.email,
          phoneNumber: data.data.phoneNumber,
          role: data.data.role,
          roleLabel: data.data.roleLabel,
        },
        company: data.data.company,
      });

      setError(null);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [currentLanguage, router, fadeAnim]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const LANGUAGES = [
    {
      code: 'en',
      label: 'EN',
      name: 'English',
      gradient: BLUE_GRADIENT,
    },
    {
      code: 'zh',
      label: '中文',
      name: 'Chinese',
      gradient: BLUE_GRADIENT,
    },
    {
      code: 'ms',
      label: 'BM',
      name: 'Bahasa Melayu',
      gradient: BLUE_GRADIENT,
    },
    {
      code: 'ta',
      label: 'தமிழ்',
      name: 'Tamil',
      gradient: BLUE_GRADIENT,
    },
  ];

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

  const handleLogout = () => {
    Alert.alert(t('profile.logout.title'), t('profile.logout.confirmation'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout.button'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/SelectRoleScreen');
        },
      },
    ]);
  };

  const getCompanySizeLabel = (size?: string) => {
    switch (size) {
      case 'STARTUP':
        return t('employerProfile.sizeStartup');
      case 'SMALL':
        return t('employerProfile.sizeSmall');
      case 'MEDIUM':
        return t('employerProfile.sizeMedium');
      case 'LARGE':
        return t('employerProfile.sizeLarge');
      case 'ENTERPRISE':
        return t('employerProfile.sizeEnterprise');
      default:
        return t('employerProfile.notSpecified');
    }
  };

  const renderInfoCard = (
    icon: string,
    label: string,
    value?: string,
    gradientColors?: readonly [string, string, ...string[]]
  ) => (
    <Animated.View
      style={[
        styles.infoCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors ?? BLUE_GRADIENT}
        style={styles.infoIconGradient}
      >
        <Ionicons name={icon as any} size={20} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {value || t('employerProfile.notProvided')}
        </Text>
      </View>
    </Animated.View>
  );

  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <LinearGradient colors={BLUE_GRADIENT} style={styles.sectionIcon}>
        <Ionicons name={icon as any} size={20} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[LIGHT_BLUE_BG, WHITE]}
          style={styles.loadingBackground}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_BLUE} />
            <Text style={styles.loadingText}>
              {t('employerProfile.loading')}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FEE2E2', '#FECACA']}
          style={styles.errorBackground}
        >
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={80}
              color={ERROR_COLOR}
            />
            <Text style={styles.errorText}>
              {error || t('employerProfile.errorNotFound')}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchProfile}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={BLUE_GRADIENT}
                style={styles.retryButtonGradient}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>
                  {t('employerProfile.tryAgain')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[LIGHT_BLUE_BG, '#FFFFFF']}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Section */}
          <LinearGradient colors={BLUE_GRADIENT} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              {/* Profile Avatar */}
              <View style={styles.avatarContainer}>
                {profile.company.logo ? (
                  <Image
                    source={{ uri: profile.company.logo }}
                    style={styles.companyLogo}
                  />
                ) : (
                  <LinearGradient
                    colors={LIGHT_BLUE_GRADIENT}
                    style={styles.companyLogoPlaceholder}
                  >
                    <Text style={styles.companyInitial}>
                      {profile.company.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                <LinearGradient
                  colors={[SUCCESS_COLOR, '#059669']}
                  style={styles.onlineIndicator}
                />
              </View>

              <Text style={styles.companyName}>{profile.company.name}</Text>

              {profile.company.description && (
                <Text style={styles.companyDescription}>
                  {profile.company.description}
                </Text>
              )}

              {/* Verification Status */}
              <View style={styles.verificationContainer}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.verificationBadge}
                >
                  <Ionicons
                    name={
                      profile.company.isVerified
                        ? 'checkmark-circle'
                        : 'time-outline'
                    }
                    size={18}
                    color={WHITE}
                  />
                  <Text
                    style={[
                      styles.verificationText,
                      {
                        color: WHITE,
                      },
                    ]}
                  >
                    {profile.company.isVerified
                      ? t('common.success')
                      : profile.company.verificationStatus}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>

          {/* Main Content */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Edit Profile Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.push('/(employer-hidden)/edit-company-profile')
              }
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={BLUE_GRADIENT}
                style={styles.editButtonGradient}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                <Text style={styles.editButtonText}>
                  {t('employerProfile.editProfile')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Company Information */}
            <View style={styles.sectionCard}>
              {renderSectionHeader(
                t('employerProfile.companyInformation'),
                'business-outline'
              )}
              {renderInfoCard(
                'layers-outline',
                t('employerProfile.industry'),
                profile.company.industry?.name,
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'people-outline',
                t('employerProfile.companySize'),
                getCompanySizeLabel(profile.company.companySize),
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'location-outline',
                t('employerProfile.address'),
                profile.company.address
                  ? `${profile.company.address}, ${profile.company.city}, ${profile.company.state} ${profile.company.postcode}`
                  : undefined,
                BLUE_GRADIENT
              )}
            </View>

            {/* Contact Information */}
            <View style={styles.sectionCard}>
              {renderSectionHeader(
                t('employerProfile.contactInformation'),
                'call-outline'
              )}
              {renderInfoCard(
                'mail-outline',
                t('employerProfile.email'),
                profile.company.email,
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'call-outline',
                t('employerProfile.phone'),
                profile.company.phone,
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'globe-outline',
                t('employerProfile.website'),
                profile.company.website,
                BLUE_GRADIENT
              )}
            </View>

            {/* Account Information */}
            <View style={styles.sectionCard}>
              {renderSectionHeader(
                t('employerProfile.accountInformation'),
                'person-outline'
              )}
              {renderInfoCard(
                'person-outline',
                t('employerProfile.fullName'),
                profile.user.fullName,
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'mail-outline',
                t('employerProfile.email'),
                profile.user.email,
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'call-outline',
                t('employerProfile.phone'),
                profile.user.phoneNumber,
                BLUE_GRADIENT
              )}
              {renderInfoCard(
                'briefcase-outline',
                t('employerProfile.role'),
                profile.user.roleLabel || profile.user.role,
                BLUE_GRADIENT
              )}
            </View>

            {/* Onboarding Progress */}
            <View style={styles.sectionCard}>
              {renderSectionHeader(
                t('employerProfile.onboardingStatus'),
                'trending-up-outline'
              )}
              <View style={styles.onboardingCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>
                    {profile.company.onboardingCompleted
                      ? t('employerProfile.onboardingCompleted')
                      : t('employerProfile.onboardingInProgress')}
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round((profile.company.onboardingStep / 5) * 100)}%
                  </Text>
                </View>

                <View style={styles.progressBarContainer}>
                  <LinearGradient
                    colors={BLUE_GRADIENT}
                    style={[
                      styles.progressBar,
                      {
                        width: `${(profile.company.onboardingStep / 5) * 100}%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.progressSteps}>
                  {t('employerProfile.stepOfTotal', {
                    step: profile.company.onboardingStep,
                    total: 5,
                  })}
                </Text>
              </View>
            </View>

            {/* Language Selection */}
            <View style={styles.sectionCard}>
              {renderSectionHeader(
                t('profile.sections.language') || 'Language',
                'language-outline'
              )}
              <Text style={styles.languageSectionSubtitle}>
                {t('profile.selectLanguage') ||
                  'Select your preferred language'}
              </Text>
              <View style={styles.languageGrid}>
                {LANGUAGES.map((lang, index) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageCard,
                      currentLanguage === lang.code &&
                        styles.languageCardActive,
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                    activeOpacity={0.8}
                  >
                    {currentLanguage === lang.code ? (
                      <LinearGradient
                        colors={lang.gradient}
                        style={styles.languageCardGradient}
                      >
                        <View style={styles.languageCardContent}>
                          <Text style={styles.languageLabelActive}>
                            {lang.label}
                          </Text>
                          <Text style={styles.languageNameActive}>
                            {lang.name}
                          </Text>
                        </View>
                        <View style={styles.selectedBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#FFFFFF"
                          />
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.languageCardContent}>
                        <Text style={styles.languageLabel}>{lang.label}</Text>
                        <Text style={styles.languageName}>{lang.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Settings */}
            <View style={styles.sectionCard}>
              {renderSectionHeader(
                t('employerProfile.settings'),
                'settings-outline'
              )}

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() =>
                  Alert.alert(
                    t('employerProfile.comingSoon'),
                    t('employerProfile.notifications')
                  )
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: LIGHT_BLUE_BG },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={PRIMARY_BLUE}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>
                    {t('employerProfile.notifications')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    Manage your notification preferences
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() =>
                  Alert.alert(
                    t('employerProfile.comingSoon'),
                    t('employerProfile.privacySettings')
                  )
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: LIGHT_BLUE_BG },
                  ]}
                >
                  <Ionicons
                    name="shield-outline"
                    size={20}
                    color={PRIMARY_BLUE}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>
                    {t('employerProfile.privacySettings')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    Control your privacy and data
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/(employer-hidden)/reports')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: LIGHT_BLUE_BG },
                  ]}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={20}
                    color={PRIMARY_BLUE}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>
                    {t('profile.sections.reports')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    View analytics and reports
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() =>
                  Alert.alert(
                    t('employerProfile.comingSoon'),
                    t('employerProfile.helpSupport')
                  )
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: LIGHT_BLUE_BG },
                  ]}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color={PRIMARY_BLUE}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingText}>
                    {t('employerProfile.helpSupport')}
                  </Text>
                  <Text style={styles.settingDescription}>
                    Get help and support
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingItem, styles.logoutItem]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={ERROR_COLOR}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.logoutText}>
                    {t('profile.logout.button')}
                  </Text>
                  <Text style={styles.logoutDescription}>
                    Sign out of your account
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Footer Space */}
            <View style={styles.footerSpace} />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BLUE_BG,
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_GRAY,
    fontWeight: '500',
  },
  errorBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  companyLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  companyLogoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  companyInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: PRIMARY_BLUE,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  companyName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  companyDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  verificationContainer: {
    alignItems: 'center',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    backdropFilter: 'blur(10px)',
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  editButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '600',
    lineHeight: 22,
  },
  onboardingCard: {
    backgroundColor: LIGHT_BLUE_BG,
    borderRadius: 16,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressSteps: {
    fontSize: 13,
    color: TEXT_GRAY,
    textAlign: 'center',
    fontWeight: '500',
  },
  languageSectionSubtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 20,
    lineHeight: 20,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  languageCard: {
    width: '48%',
    minHeight: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  languageCardActive: {
    borderWidth: 0,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  languageCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  languageCardContent: {
    alignItems: 'center',
    padding: 16,
  },
  languageLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  languageLabelActive: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  languageName: {
    fontSize: 14,
    color: TEXT_GRAY,
    textAlign: 'center',
  },
  languageNameActive: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: TEXT_GRAY,
  },
  logoutText: {
    fontSize: 16,
    color: ERROR_COLOR,
    fontWeight: '600',
    marginBottom: 2,
  },
  logoutDescription: {
    fontSize: 13,
    color: '#F87171',
  },
  footerSpace: {
    height: 30,
  },
});
