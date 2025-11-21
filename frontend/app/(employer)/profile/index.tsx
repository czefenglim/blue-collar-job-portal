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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface ProfileData {
  user: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
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
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!token || !userData) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(`${URL}/api/employer/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
        },
        company: data.data.company,
      });

      setError(null);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace('/SelectRoleScreen');
        },
      },
    ]);
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'REJECTED':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getCompanySizeLabel = (size?: string) => {
    switch (size) {
      case 'STARTUP':
        return '1-10 employees';
      case 'SMALL':
        return '11-50 employees';
      case 'MEDIUM':
        return '51-200 employees';
      case 'LARGE':
        return '201-500 employees';
      case 'ENTERPRISE':
        return '500+ employees';
      default:
        return 'Not specified';
    }
  };

  const renderInfoCard = (icon: string, label: string, value?: string) => (
    <View style={styles.infoCard}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={20} color="#1E3A8A" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Try Again</Text>
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
          {profile.company.logo ? (
            <Image
              source={{ uri: profile.company.logo }}
              style={styles.companyLogo}
            />
          ) : (
            <View style={styles.companyLogoPlaceholder}>
              <Ionicons name="business" size={40} color="#FFFFFF" />
            </View>
          )}

          <Text style={styles.companyName}>{profile.company.name}</Text>

          {profile.company.description && (
            <Text style={styles.companyDescription}>
              {profile.company.description}
            </Text>
          )}

          {/* Verification Badge */}
          <View
            style={[
              styles.verificationBadge,
              {
                backgroundColor:
                  getVerificationStatusColor(
                    profile.company.verificationStatus
                  ) + '20',
              },
            ]}
          >
            <Ionicons
              name={
                profile.company.isVerified ? 'checkmark-circle' : 'time-outline'
              }
              size={16}
              color={getVerificationStatusColor(
                profile.company.verificationStatus
              )}
            />
            <Text
              style={[
                styles.verificationText,
                {
                  color: getVerificationStatusColor(
                    profile.company.verificationStatus
                  ),
                },
              ]}
            >
              {profile.company.isVerified
                ? 'Verified'
                : profile.company.verificationStatus}
            </Text>
          </View>

          {/* Edit Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push('/(employer-hidden)/edit-company-profile')
            }
          >
            <Ionicons name="create-outline" size={20} color="#1E3A8A" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          {renderInfoCard(
            'business-outline',
            'Industry',
            profile.company.industry?.name
          )}
          {renderInfoCard(
            'people-outline',
            'Company Size',
            getCompanySizeLabel(profile.company.companySize)
          )}
          {renderInfoCard(
            'location-outline',
            'Address',
            profile.company.address
              ? `${profile.company.address}, ${profile.company.city}, ${profile.company.state} ${profile.company.postcode}`
              : undefined
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {renderInfoCard('mail-outline', 'Email', profile.company.email)}
          {renderInfoCard('call-outline', 'Phone', profile.company.phone)}
          {renderInfoCard('globe-outline', 'Website', profile.company.website)}
        </View>

        {/* User Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          {renderInfoCard('person-outline', 'Full Name', profile.user.fullName)}
          {renderInfoCard('mail-outline', 'Email', profile.user.email)}
          {renderInfoCard('call-outline', 'Phone', profile.user.phoneNumber)}
          {renderInfoCard('briefcase-outline', 'Role', profile.user.role)}
        </View>

        {/* Onboarding Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onboarding Status</Text>
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingProgress}>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(profile.company.onboardingStep / 5) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                Step {profile.company.onboardingStep} of 5
              </Text>
            </View>

            <Text style={styles.onboardingStatus}>
              {profile.company.onboardingCompleted
                ? '✅ Onboarding completed'
                : '⏳ Onboarding in progress'}
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Coming Soon', 'Notifications settings')}
          >
            <View style={styles.settingLeft}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#64748B"
              />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-outline" size={24} color="#64748B" />
              <Text style={styles.settingText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/(employer-hidden)/reports')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#64748B" />
              <Text style={styles.settingText}>Reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Coming Soon', 'Help & Support')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#64748B" />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text style={[styles.settingText, { color: '#EF4444' }]}>
                Logout
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  companyLogoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  companyDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  onboardingCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  onboardingProgress: {
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },
  onboardingStatus: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1E293B',
  },
});
