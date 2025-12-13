import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../contexts/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface Skill {
  id: number;
  name: string;
}

interface Language {
  id: number;
  name: string;
}

interface UserProfile {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  preferredSalaryMin: number | null;
  preferredSalaryMax: number | null;
  availableFrom: string | null;
  workingHours: string | null;
  transportMode: string | null;
  maxTravelDistance: number | null;
  experienceYears: number;
  certifications: string[];
  // Deprecated single resume field, kept for backward compatibility
  resumeUrl: string | null;
  // Language-specific resume keys/urls
  resumeUrl_en?: string | null;
  resumeUrl_ms?: string | null;
  resumeUrl_zh?: string | null;
  resumeUrl_ta?: string | null;
  // Original uploaded resume key/url (user upload)
  resumeUrl_uploaded?: string | null;
  industries: number[];
  skills: number[];
  languages: number[];
}

const EditProfileScreen: React.FC = () => {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [token, setToken] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<UserProfile>({
    fullName: '',
    phoneNumber: '',
    dateOfBirth: null,
    gender: null,
    nationality: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    preferredSalaryMin: null,
    preferredSalaryMax: null,
    availableFrom: null,
    workingHours: null,
    transportMode: null,
    maxTravelDistance: null,
    experienceYears: 0,
    certifications: [],
    resumeUrl: null,
    resumeUrl_en: null,
    resumeUrl_ms: null,
    resumeUrl_zh: null,
    resumeUrl_ta: null,
    resumeUrl_uploaded: null,
    industries: [],
    skills: [],
    languages: [],
  });

  // Dropdown data
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  // Modal states
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAvailableFromPicker, setShowAvailableFromPicker] = useState(false);
  const [dateField, setDateField] = useState<'dateOfBirth' | 'availableFrom'>(
    'dateOfBirth'
  );

  // Enums
  const genderOptions = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
  const workingHoursOptions = [
    'DAY_SHIFT',
    'NIGHT_SHIFT',
    'ROTATING_SHIFT',
    'FLEXIBLE',
    'WEEKEND_ONLY',
  ];
  const transportModeOptions = [
    'OWN_VEHICLE',
    'PUBLIC_TRANSPORT',
    'COMPANY_TRANSPORT',
    'MOTORCYCLE',
    'BICYCLE',
    'WALKING',
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // Refresh profile when screen regains focus (e.g., after regenerating resume)
  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchUserProfile(token);
      }
    }, [token])
  );

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('editProfile.authenticationRequired'),
          t('editProfile.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);

      // Load dropdown data and user profile in parallel
      await Promise.all([
        fetchDropdownData(userToken),
        fetchUserProfile(userToken),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert(t('common.error'), t('editProfile.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const openResume = async () => {
    try {
      // Choose resume key by current language, then fallback
      let keyOrUrl: string | null = null;
      if (currentLanguage === 'ms' && formData.resumeUrl_ms)
        keyOrUrl = formData.resumeUrl_ms;
      else if (currentLanguage === 'zh' && formData.resumeUrl_zh)
        keyOrUrl = formData.resumeUrl_zh;
      else if (currentLanguage === 'ta' && formData.resumeUrl_ta)
        keyOrUrl = formData.resumeUrl_ta;
      else if (formData.resumeUrl_en) keyOrUrl = formData.resumeUrl_en;
      else if (formData.resumeUrl_uploaded)
        keyOrUrl = formData.resumeUrl_uploaded;

      if (!keyOrUrl) return;

      let targetUrl = keyOrUrl as string;
      const isHttp = /^https?:\/\//i.test(targetUrl);
      if (!isHttp) {
        const encodedKey = encodeURIComponent(targetUrl);
        const resp = await fetch(`${URL}/api/onboarding/resume/${encodedKey}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        const signedUrl =
          data?.resumeUrl ||
          data?.data?.url ||
          (typeof data === 'string' ? data : null);
        if (!signedUrl) {
          Alert.alert(t('common.error'), t('profile.errors.loadFailed'));
          return;
        }
        targetUrl = signedUrl;
      }
      await WebBrowser.openBrowserAsync(targetUrl);
    } catch (err) {
      console.error('Open resume error:', err);
      Alert.alert(t('common.error'), t('profile.errors.loadFailed'));
    }
  };

  // Determine if a resume exists for the current language; fallback to uploaded
  const getResumeKeyForCurrentLanguage = (): string | null => {
    if (currentLanguage === 'ms')
      return formData.resumeUrl_ms || formData.resumeUrl_uploaded || null;
    if (currentLanguage === 'zh')
      return formData.resumeUrl_zh || formData.resumeUrl_uploaded || null;
    if (currentLanguage === 'ta')
      return formData.resumeUrl_ta || formData.resumeUrl_uploaded || null;
    return formData.resumeUrl_en || formData.resumeUrl_uploaded || null;
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        form.append('resume', blob, asset.name || 'resume.pdf');
      } else {
        form.append('resume', {
          uri: asset.uri,
          name: asset.name || 'resume.pdf',
          type: asset.mimeType || 'application/pdf',
        } as any);
      }

      const resp = await fetch(`${URL}/api/users/uploadResume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await resp.json();
      if (!data?.success) {
        Alert.alert(t('common.error'), data?.error || 'Upload failed');
        return;
      }
      const key = data?.data?.key || null;
      // Store uploaded resume key separately
      setFormData((prev) => ({ ...prev, resumeUrl_uploaded: key }));
      // Optionally refresh profile to sync all language fields
      if (token) {
        await fetchUserProfile(token);
      }
      Alert.alert(t('common.success'), t('editProfile.resumeUploaded'));
    } catch (err) {
      console.error('Upload resume error:', err);
      Alert.alert(t('common.error'), 'Failed to upload resume');
    }
  };

  const handleRegenerateResume = async () => {
    try {
      const resp = await fetch(`${URL}/api/onboarding/generateResume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!data?.success) {
        Alert.alert(t('common.error'), data?.error || 'Generation failed');
        return;
      }
      // Resume generation updates multiple language-specific keys in profile; refresh form data
      if (token) {
        await fetchUserProfile(token);
      }
      Alert.alert(t('common.success'), t('editProfile.resumeRegenerated'));
    } catch (err) {
      console.error('Regenerate resume error:', err);
      Alert.alert(t('common.error'), 'Failed to regenerate resume');
    }
  };

  const fetchDropdownData = async (userToken: string) => {
    try {
      const [industriesRes, skillsRes, languagesRes] = await Promise.all([
        fetch(`${URL}/api/users/getIndustries`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        fetch(`${URL}/api/users/getSkills`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        fetch(`${URL}/api/users/getLanguages`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
      ]);

      if (industriesRes.ok) {
        const data = await industriesRes.json();
        setIndustries(data.data);
      }

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkills(data.data);
      }

      if (languagesRes.ok) {
        const data = await languagesRes.json();
        setLanguages(data.data);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchUserProfile = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/users/getProfile`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        const profile = data.data;

        setFormData({
          fullName: profile.fullName || '',
          phoneNumber: profile.phoneNumber || '',
          dateOfBirth: profile.profile?.dateOfBirth || null,
          gender: profile.profile?.gender || null,
          nationality: profile.profile?.nationality || '',
          address: profile.profile?.address || '',
          city: profile.profile?.city || '',
          state: profile.profile?.state || '',
          postcode: profile.profile?.postcode || '',
          preferredSalaryMin: profile.profile?.preferredSalaryMin || null,
          preferredSalaryMax: profile.profile?.preferredSalaryMax || null,
          availableFrom: profile.profile?.availableFrom || null,
          workingHours: profile.profile?.workingHours || null,
          transportMode: profile.profile?.transportMode || null,
          maxTravelDistance: profile.profile?.maxTravelDistance || null,
          experienceYears: profile.profile?.experienceYears || 0,
          certifications: profile.profile?.certifications
            ? JSON.parse(profile.profile.certifications)
            : [],
          // Backward compatibility
          resumeUrl: profile.profile?.resumeUrl || null,
          // Language-specific resume keys
          resumeUrl_en: profile.profile?.resumeUrl_en || null,
          resumeUrl_ms: profile.profile?.resumeUrl_ms || null,
          resumeUrl_zh: profile.profile?.resumeUrl_zh || null,
          resumeUrl_ta: profile.profile?.resumeUrl_ta || null,
          resumeUrl_uploaded: profile.profile?.resumeUrl_uploaded || null,
          industries:
            profile.profile?.industries?.map((ui: any) => ui.industry.id) || [],
          skills: profile.profile?.skills?.map((us: any) => us.skill.id) || [],
          languages:
            profile.profile?.languages?.map((ul: any) => ul.language.id) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Basic validation
      if (!formData.fullName.trim()) {
        Alert.alert(
          t('common.error'),
          t('editProfile.errors.fullNameRequired')
        );
        return;
      }

      const response = await fetch(`${URL}/api/users/updateProfile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert(t('common.success'), t('editProfile.success.message'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(t('common.error'), t('editProfile.errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    setShowAvailableFromPicker(false);

    if (selectedDate) {
      const isoString = selectedDate.toISOString();
      if (dateField === 'dateOfBirth') {
        setFormData((prev) => ({ ...prev, dateOfBirth: isoString }));
      } else {
        setFormData((prev) => ({ ...prev, availableFrom: isoString }));
      }
    }
  };

  const openDatePicker = (field: 'dateOfBirth' | 'availableFrom') => {
    setDateField(field);
    if (field === 'dateOfBirth') {
      setShowDatePicker(true);
    } else {
      setShowAvailableFromPicker(true);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('editProfile.selectDate');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatEnumValue = (value: string) => {
    const genderMap: { [key: string]: string } = {
      MALE: t('profile.gender.male'),
      FEMALE: t('profile.gender.female'),
      OTHER: t('profile.gender.other'),
      PREFER_NOT_TO_SAY: t('profile.gender.preferNotToSay'),
    };

    const workingHoursMap: { [key: string]: string } = {
      DAY_SHIFT: t('workingHours.dayShift'),
      NIGHT_SHIFT: t('workingHours.nightShift'),
      ROTATING_SHIFT: t('workingHours.rotatingShift'),
      FLEXIBLE: t('workingHours.flexible'),
      WEEKEND_ONLY: t('workingHours.weekendOnly'),
    };

    const transportMap: { [key: string]: string } = {
      OWN_VEHICLE: t('profile.transport.ownVehicle'),
      PUBLIC_TRANSPORT: t('profile.transport.publicTransport'),
      COMPANY_TRANSPORT: t('profile.transport.companyTransport'),
      MOTORCYCLE: t('profile.transport.motorcycle'),
      BICYCLE: t('profile.transport.bicycle'),
      WALKING: t('profile.transport.walking'),
    };

    // Check all maps
    if (genderMap[value]) return genderMap[value];
    if (workingHoursMap[value]) return workingHoursMap[value];
    if (transportMap[value]) return transportMap[value];

    // Fallback to default formatting
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleSelection = (
    type: 'industries' | 'skills' | 'languages',
    id: number
  ) => {
    setFormData((prev) => {
      const current = prev[type];
      const updated = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, [type]: updated };
    });
  };

  const getModalTitle = (type: 'industries' | 'skills' | 'languages') => {
    const titles = {
      industries: t('editProfile.modals.industries'),
      skills: t('editProfile.modals.skills'),
      languages: t('editProfile.modals.languages'),
    };
    return titles[type];
  };

  const getSelectionText = (
    type: 'industries' | 'skills' | 'languages',
    count: number
  ) => {
    const baseTexts = {
      industries: 'editProfile.industriesSelected',
      skills: 'editProfile.skillsSelected',
      languages: 'editProfile.languagesSelected',
    };

    const placeholderTexts = {
      industries: t('editProfile.selectIndustries'),
      skills: t('editProfile.selectSkills'),
      languages: t('editProfile.selectLanguages'),
    };

    return count > 0 ? t(baseTexts[type], { count }) : placeholderTexts[type];
  };

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    data: any[],
    type: 'industries' | 'skills' | 'languages'
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#1E3A8A', '#3730A3']}
            style={styles.modalHeaderGradient}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  formData[type].includes(item.id) &&
                    styles.modalOptionSelected,
                ]}
                onPress={() => toggleSelection(type, item.id)}
              >
                <Text style={styles.modalOptionText}>{item.name}</Text>
                {formData[type].includes(item.id) && (
                  <View style={styles.checkmarkCircle}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            style={styles.modalList}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalDoneButton} onPress={onClose}>
              <LinearGradient
                colors={['#4F46E5', '#3730A3']}
                style={styles.modalDoneGradient}
              >
                <Text style={styles.modalDoneText}>{t('common.done')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('editProfile.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.backButtonGradient}
            >
              <Text style={styles.backIcon}>←</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('editProfile.subtitle')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            <LinearGradient
              colors={
                isSaving ? ['#94A3B8', '#64748B'] : ['#10B981', '#059669']
              }
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <View>
              <Text style={styles.sectionTitle}>
                {t('editProfile.sections.personalInfo')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('editProfile.sections.personalInfoSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('editProfile.fullName')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, fullName: text }))
              }
              placeholder={t('editProfile.placeholders.fullName')}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.phoneNumber')}</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, phoneNumber: text }))
              }
              placeholder={t('editProfile.placeholders.phoneNumber')}
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.dateOfBirth')}</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker('dateOfBirth')}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  !formData.dateOfBirth && styles.placeholderText,
                ]}
              >
                {formatDate(formData.dateOfBirth)}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.gender.title')}</Text>
            <View style={styles.optionsContainer}>
              {genderOptions.map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.optionButton,
                    formData.gender === gender && styles.optionButtonSelected,
                  ]}
                  onPress={() => setFormData((prev) => ({ ...prev, gender }))}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.gender === gender &&
                        styles.optionButtonTextSelected,
                    ]}
                  >
                    {formatEnumValue(gender)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.nationality')}</Text>
            <TextInput
              style={styles.input}
              value={formData.nationality}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, nationality: text }))
              }
              placeholder={t('editProfile.placeholders.nationality')}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🏠</Text>
            <View>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.address')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('editProfile.sections.addressSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.address')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, address: text }))
              }
              placeholder={t('editProfile.placeholders.address')}
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>{t('profile.city')}</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, city: text }))
                }
                placeholder={t('editProfile.placeholders.city')}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>{t('profile.state')}</Text>
              <TextInput
                style={styles.input}
                value={formData.state}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, state: text }))
                }
                placeholder={t('editProfile.placeholders.state')}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.postcode')}</Text>
            <TextInput
              style={styles.input}
              value={formData.postcode}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, postcode: text }))
              }
              placeholder={t('editProfile.placeholders.postcode')}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Job Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💼</Text>
            <View>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.jobPreferences')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('editProfile.sections.jobPreferencesSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.preferredIndustries')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowIndustryModal(true)}
            >
              <Text
                style={[
                  styles.dropdownButtonText,
                  formData.industries.length === 0 && styles.placeholderText,
                ]}
              >
                {getSelectionText('industries', formData.industries.length)}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.expectedSalary')} (RM)</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <TextInput
                  style={styles.input}
                  value={formData.preferredSalaryMin?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      preferredSalaryMin: text ? parseInt(text) : null,
                    }))
                  }
                  placeholder={t('editProfile.placeholders.minSalary')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.salarySeparator}>{t('editProfile.to')}</Text>
              <View style={[styles.inputGroup, styles.flex1]}>
                <TextInput
                  style={styles.input}
                  value={formData.preferredSalaryMax?.toString() || ''}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      preferredSalaryMax: text ? parseInt(text) : null,
                    }))
                  }
                  placeholder={t('editProfile.placeholders.maxSalary')}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.workingHours')}</Text>
            <View style={styles.optionsContainer}>
              {workingHoursOptions.map((hours) => (
                <TouchableOpacity
                  key={hours}
                  style={[
                    styles.optionButton,
                    formData.workingHours === hours &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, workingHours: hours }))
                  }
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.workingHours === hours &&
                        styles.optionButtonTextSelected,
                    ]}
                  >
                    {formatEnumValue(hours)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.transportMode')}</Text>
            <View style={styles.optionsContainer}>
              {transportModeOptions.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.optionButton,
                    formData.transportMode === mode &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, transportMode: mode }))
                  }
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.transportMode === mode &&
                        styles.optionButtonTextSelected,
                    ]}
                  >
                    {formatEnumValue(mode)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('profile.maxTravelDistance')} (km)
            </Text>
            <TextInput
              style={styles.input}
              value={formData.maxTravelDistance?.toString() || ''}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  maxTravelDistance: text ? parseInt(text) : null,
                }))
              }
              placeholder={t('editProfile.placeholders.maxTravelDistance')}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.availableFrom')}</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker('availableFrom')}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  !formData.availableFrom && styles.placeholderText,
                ]}
              >
                {formatDate(formData.availableFrom)}
              </Text>
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Skills & Experience */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🚀</Text>
            <View>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.skillsExperience')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('editProfile.sections.skillsExperienceSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.yearsOfExperience')}</Text>
            <TextInput
              style={styles.input}
              value={formData.experienceYears.toString()}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  experienceYears: text ? parseInt(text) : 0,
                }))
              }
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.skills')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowSkillsModal(true)}
            >
              <Text
                style={[
                  styles.dropdownButtonText,
                  formData.skills.length === 0 && styles.placeholderText,
                ]}
              >
                {getSelectionText('skills', formData.skills.length)}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('profile.languages')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowLanguagesModal(true)}
            >
              <Text
                style={[
                  styles.dropdownButtonText,
                  formData.languages.length === 0 && styles.placeholderText,
                ]}
              >
                {getSelectionText('languages', formData.languages.length)}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Skills & Experience section ends here */}
        </View>

        {/* Resume Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📄</Text>
            <View>
              <Text style={styles.sectionTitle}>
                {t('editProfile.sections.resume')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {t('editProfile.sections.resumeSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.resumeActionContainer}>
            {/* View Resume button (on top) */}
            <TouchableOpacity
              onPress={openResume}
              disabled={!getResumeKeyForCurrentLanguage()}
              style={styles.actionButton}
            >
              <LinearGradient
                colors={
                  !getResumeKeyForCurrentLanguage()
                    ? ['#94A3B8', '#64748B']
                    : ['#4F46E5', '#3730A3']
                }
                style={styles.actionGradient}
              >
                <Text style={styles.actionButtonIcon}>🔗</Text>
                <Text style={styles.actionButtonText}>
                  {t('editProfile.viewResume')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Upload PDF button */}
            <TouchableOpacity
              onPress={handleUploadResume}
              style={styles.actionButton}
            >
              <LinearGradient
                colors={['#1E3A8A', '#3730A3']}
                style={styles.actionGradient}
              >
                <Text style={styles.actionButtonIcon}>⬆️</Text>
                <Text style={styles.actionButtonText}>
                  {t('editProfile.uploadPdf')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Regenerate (AI) button below upload */}
            <TouchableOpacity
              onPress={() => router.push('/resume-questions')}
              style={styles.actionButton}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.actionGradient}
              >
                <Text style={styles.actionButtonIcon}>🤖</Text>
                <Text style={styles.actionButtonText}>
                  {t('editProfile.regenerateAi')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Date Pickers */}
      {(showDatePicker || showAvailableFromPicker) && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Modals */}
      {renderModal(
        showIndustryModal,
        () => setShowIndustryModal(false),
        getModalTitle('industries'),
        industries,
        'industries'
      )}

      {renderModal(
        showSkillsModal,
        () => setShowSkillsModal(false),
        getModalTitle('skills'),
        skills,
        'skills'
      )}

      {renderModal(
        showLanguagesModal,
        () => setShowLanguagesModal(false),
        getModalTitle('languages'),
        languages,
        'languages'
      )}
    </SafeAreaView>
  );
};

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
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  // Resume actions enhanced styles
  resumeActionContainer: {
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  actionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actionButtonIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  calendarIcon: {
    fontSize: 18,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748B',
  },
  salarySeparator: {
    alignSelf: 'center',
    marginHorizontal: 8,
    color: '#64748B',
    fontWeight: '500',
    fontSize: 16,
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
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalList: {
    maxHeight: '70%',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalDoneButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalDoneGradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 30,
  },
});

export default EditProfileScreen;
