import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '@/contexts/LanguageContext';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface Industry {
  id: number;
  name: string;
}

const COMPANY_SIZES = [
  { value: 'STARTUP', label: '1-10 employees' },
  { value: 'SMALL', label: '11-50 employees' },
  { value: 'MEDIUM', label: '51-200 employees' },
  { value: 'LARGE', label: '201-500 employees' },
  { value: 'ENTERPRISE', label: '500+ employees' },
];

const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
];

export default function ProfileEditPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);

  // Form state
  const [companyId, setCompanyId] = useState<number>(0);
  const [name, setName] = useState('');
  const [industryId, setIndustryId] = useState<number | undefined>();
  const [companySize, setCompanySize] = useState<string>('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');

  // Modal state
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(`${URL}/api/employer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const company = data.data.company;
      setCompanyId(company.id);
      setName(company.name || '');
      setIndustryId(company.industryId);
      setCompanySize(company.companySize || '');
      setDescription(company.description || '');
      setLogo(company.logo || '');
      setWebsite(company.website || '');
      setEmail(company.email || '');
      setPhone(company.phone || '');
      setAddress(company.address || '');
      setCity(company.city || '');
      setState(company.state || '');
      setPostcode(company.postcode || '');
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert(t('common.error'), t('employerProfile.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  const fetchIndustries = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(
        `${URL}/api/industries?lang=${currentLanguage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (response.ok) setIndustries(data.data || []);
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  }, [currentLanguage]);

  useEffect(() => {
    fetchProfile();
    fetchIndustries();
  }, [fetchProfile, fetchIndustries]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('employerProfile.permissions.cameraRollRequiredTitle'),
        t('employerProfile.permissions.cameraRollRequiredMessage')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogo(result.assets[0].uri);
      Alert.alert(t('employerProfile.note'), t('employerProfile.uploadNote'));
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(
        t('common.error'),
        t('employerProfile.validation.companyNameRequired')
      );
      return false;
    }
    if (!industryId) {
      Alert.alert(
        t('common.error'),
        t('employerProfile.validation.industryRequired')
      );
      return false;
    }
    if (!companySize) {
      Alert.alert(
        t('common.error'),
        t('employerProfile.validation.sizeRequired')
      );
      return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(
        t('common.error'),
        t('employerProfile.validation.invalidEmail')
      );
      return false;
    }
    if (website && !/^https?:\/\/.+/.test(website)) {
      Alert.alert(
        t('common.error'),
        t('employerProfile.validation.invalidWebsite')
      );
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    Alert.alert(
      t('employerProfile.saveChanges'),
      t('employerProfile.updateConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.save'),
          onPress: async () => {
            try {
              setSaving(true);
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/company/${companyId}`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: name.trim(),
                    industryId,
                    companySize,
                    description: description.trim(),
                    logo,
                    website: website.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    city: city.trim(),
                    state,
                    postcode: postcode.trim(),
                  }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.message);

              Alert.alert(t('common.success'), t('employerProfile.updated'), [
                { text: t('common.ok'), onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert(
                t('common.error'),
                error.message || t('employerProfile.updateFailed')
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options: any = {}
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label}
        {options.required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, options.multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options.placeholder}
        placeholderTextColor="#94A3B8"
        multiline={options.multiline}
        maxLength={options.maxLength}
        keyboardType={options.keyboardType}
      />
      {options.multiline && options.maxLength && (
        <Text style={styles.charCount}>
          {value.length}/{options.maxLength}
        </Text>
      )}
    </View>
  );

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: any[],
    onSelect: (item: any) => void,
    getLabel: (item: any) => string,
    getValue: (item: any) => any
  ) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalItem}
                onPress={() => {
                  onSelect(getValue(item));
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{getLabel(item)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.logoHint}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedIndustry = industries.find((i) => i.id === industryId);
  const selectedSize = COMPANY_SIZES.find((s) => s.value === companySize);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Custom Header */}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="business" size={40} color="#64748B" />
              </View>
            )}
            <View style={styles.logoEditBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.logoHint}>{t('employerProfile.logoHint')}</Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerProfile.companyInformation')}
          </Text>

          {renderInput(t('employerProfile.companyName'), name, setName, {
            placeholder: t('employerProfile.placeholders.companyName'),
            required: true,
          })}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerProfile.industry')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowIndustryPicker(true)}
            >
              <Text
                style={
                  selectedIndustry
                    ? styles.pickerText
                    : styles.pickerPlaceholder
                }
              >
                {selectedIndustry?.name ||
                  t('employerCompanyForm.selectIndustry')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerProfile.companySize')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSizePicker(true)}
            >
              <Text
                style={
                  selectedSize ? styles.pickerText : styles.pickerPlaceholder
                }
              >
                {selectedSize?.label || t('employerProfile.selectCompanySize')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {renderInput(
            t('employerProfile.description'),
            description,
            setDescription,
            {
              placeholder: t('employerProfile.placeholders.description'),
              multiline: true,
              maxLength: 500,
            }
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerProfile.contactInformation')}
          </Text>

          {renderInput(t('employerProfile.email'), email, setEmail, {
            placeholder: 'company@example.com',
            keyboardType: 'email-address',
          })}

          {renderInput(t('employerProfile.phone'), phone, setPhone, {
            placeholder: '+60123456789',
            keyboardType: 'phone-pad',
          })}

          {renderInput(t('employerProfile.website'), website, setWebsite, {
            placeholder: 'https://yourcompany.com',
            keyboardType: 'url',
          })}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerProfile.location')}
          </Text>

          {renderInput(t('employerProfile.address'), address, setAddress, {
            placeholder: t('employerProfile.placeholders.address'),
          })}

          {renderInput(t('employerProfile.city'), city, setCity, {
            placeholder: t('employerProfile.placeholders.city'),
          })}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('employerProfile.state')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStatePicker(true)}
            >
              <Text
                style={state ? styles.pickerText : styles.pickerPlaceholder}
              >
                {state || t('employerProfile.selectState')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {renderInput(t('employerProfile.postcode'), postcode, setPostcode, {
            placeholder: '50000',
            keyboardType: 'number-pad',
            maxLength: 5,
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {t('employerProfile.saveChanges')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {renderPickerModal(
        showIndustryPicker,
        () => setShowIndustryPicker(false),
        t('employerCompanyForm.selectIndustry'),
        industries,
        (id) => setIndustryId(id),
        (item) => item.name,
        (item) => item.id
      )}

      {renderPickerModal(
        showSizePicker,
        () => setShowSizePicker(false),
        t('employerProfile.selectCompanySize'),
        COMPANY_SIZES,
        (value) => setCompanySize(value),
        (item) => item.label,
        (item) => item.value
      )}

      {renderPickerModal(
        showStatePicker,
        () => setShowStatePicker(false),
        t('employerProfile.selectState'),
        MALAYSIAN_STATES,
        (value) => setState(value),
        (item) => t(`states.${item}`),
        (item) => item
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logoContainer: {
    position: 'relative',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  logoHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  pickerText: {
    fontSize: 16,
    color: '#1E293B',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1E293B',
  },
});
