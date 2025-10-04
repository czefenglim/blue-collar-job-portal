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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  resumeUrl: string | null;
  industries: number[];
  skills: number[];
  languages: number[];
}

const EditProfileScreen: React.FC = () => {
  const router = useRouter();
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

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
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
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
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
          resumeUrl: profile.profile?.resumeUrl || null,
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
        Alert.alert('Error', 'Please enter your full name');
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
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
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
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatEnumValue = (value: string) => {
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
                <Text style={styles.modalDoneText}>Done</Text>
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
          <Text style={styles.loadingText}>Loading your profile...</Text>
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
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Update your information</Text>
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
                <Text style={styles.saveButtonText}>Save</Text>
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
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSubtitle}>Your basic details</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, fullName: text }))
              }
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, phoneNumber: text }))
              }
              placeholder="Enter your phone number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
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
            <Text style={styles.label}>Gender</Text>
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
            <Text style={styles.label}>Nationality</Text>
            <TextInput
              style={styles.input}
              value={formData.nationality}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, nationality: text }))
              }
              placeholder="Enter your nationality"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🏠</Text>
            <View>
              <Text style={styles.sectionTitle}>Address</Text>
              <Text style={styles.sectionSubtitle}>Your current location</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, address: text }))
              }
              placeholder="Enter your complete address"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, city: text }))
                }
                placeholder="City"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={formData.state}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, state: text }))
                }
                placeholder="State"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postcode</Text>
            <TextInput
              style={styles.input}
              value={formData.postcode}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, postcode: text }))
              }
              placeholder="Postal code"
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
              <Text style={styles.sectionTitle}>Job Preferences</Text>
              <Text style={styles.sectionSubtitle}>
                Your career requirements
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Industries</Text>
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
                {formData.industries.length > 0
                  ? `${formData.industries.length} industry selected`
                  : 'Select preferred industries'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expected Salary Range (RM)</Text>
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
                  placeholder="Minimum"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.salarySeparator}>to</Text>
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
                  placeholder="Maximum"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Working Hours</Text>
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
            <Text style={styles.label}>Transport Mode</Text>
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
            <Text style={styles.label}>Max Travel Distance (km)</Text>
            <TextInput
              style={styles.input}
              value={formData.maxTravelDistance?.toString() || ''}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  maxTravelDistance: text ? parseInt(text) : null,
                }))
              }
              placeholder="Maximum commuting distance"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Available From</Text>
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
              <Text style={styles.sectionTitle}>Skills & Experience</Text>
              <Text style={styles.sectionSubtitle}>Your qualifications</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Years of Experience</Text>
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
            <Text style={styles.label}>Skills</Text>
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
                {formData.skills.length > 0
                  ? `${formData.skills.length} skills selected`
                  : 'Select your skills'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Languages</Text>
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
                {formData.languages.length > 0
                  ? `${formData.languages.length} languages selected`
                  : 'Select languages you speak'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
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
        'Select Industries',
        industries,
        'industries'
      )}

      {renderModal(
        showSkillsModal,
        () => setShowSkillsModal(false),
        'Select Skills',
        skills,
        'skills'
      )}

      {renderModal(
        showLanguagesModal,
        () => setShowLanguagesModal(false),
        'Select Languages',
        languages,
        'languages'
      )}
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
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
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
