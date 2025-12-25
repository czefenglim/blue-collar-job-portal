import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

type OnboardingStep = 'company' | 'verification' | 'review' | 'complete';

interface Industry {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

export default function EmployerOnboardingFlow() {
  // Current step state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
  const [loading, setLoading] = useState(false);

  // Company form states (Step 2)
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('SMALL');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');
  const [industries, setIndustries] = useState<Industry[]>([]);

  // Step 3: Verification states
  const [businessDocument, setBusinessDocument] = useState<any>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  // Autocomplete: track auto-filled state to default fields as read-only
  const [cityAutoFilled, setCityAutoFilled] = useState(false);
  const [stateAutoFilled, setStateAutoFilled] = useState(false);
  const [postcodeAutoFilled, setPostcodeAutoFilled] = useState(false);

  // Modal states
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [showCompanySizeModal, setShowCompanySizeModal] = useState(false);

  // Step completion tracking
  const [completedSteps, setCompletedSteps] = useState({
    company: false,
    verification: false,
    review: false,
  });

  // Removed unused uploading state flags to satisfy lint rules

  const router = useRouter();
  const { t } = useLanguage();

  const URL =
    Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';
  const GOOGLE_MAPS_AUTOCOMPLETE_KEY =
    Constants.expoConfig?.extra?.GOOGLE_MAPS_AUTOCOMPLETE_KEY || '';

  const fetchIndustries = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('Authentication required');
      }
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';

      const response = await fetch(
        `${URL}/api/employer/industries?lang=${lang}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched industries:', data);
        setIndustries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  }, [URL]);

  useEffect(() => {
    fetchIndustries();
    loadUserEmail();
    loadSavedData();
  }, [fetchIndustries]);

  const loadSavedData = async () => {
    try {
      // Load company data
      const companyData = await AsyncStorage.getItem('tempCompanyData');
      if (companyData) {
        const data = JSON.parse(companyData);
        setCompanyName(data.companyName || '');
        setIndustry(data.industry || '');
        setCompanySize(data.companySize || 'SMALL');
        setAddress(data.address || '');
        setCity(data.city || '');
        setState(data.state || '');
        setPostcode(data.postcode || '');
        setDescription(data.description || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setLogo(data.logo || '');
      }

      // Load verification data
      const verificationData = await AsyncStorage.getItem(
        'tempVerificationData'
      );
      if (verificationData) {
        const data = JSON.parse(verificationData);
        setContactPhone(data.contactPhone || '');
        setBusinessEmail(data.businessEmail || '');
      }

      // Load completed steps
      const stepsData = await AsyncStorage.getItem('completedSteps');
      if (stepsData) {
        setCompletedSteps(JSON.parse(stepsData));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const loadUserEmail = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setBusinessEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading user email:', error);
    }
  };

  // Helper: parse Google Place details into address fields
  type AddressComponent = {
    long_name: string;
    short_name: string;
    types: string[];
  };
  type PlaceDetails = {
    formatted_address?: string;
    address_components?: AddressComponent[];
  };

  // Normalize Malaysian state names to simple, commonly used forms
  const normalizeMYStateName = (name: string) => {
    const n = (name || '').toLowerCase();
    if (!n) return '';
    if (n.includes('johor')) return 'Johor';
    if (n.includes('kedah')) return 'Kedah';
    if (n.includes('kelantan')) return 'Kelantan';
    if (n.includes('melaka') || n.includes('malacca')) return 'Melaka';
    if (n.includes('negeri sembilan')) return 'Negeri Sembilan';
    if (n.includes('pahang')) return 'Pahang';
    if (n.includes('perak')) return 'Perak';
    if (n.includes('perlis')) return 'Perlis';
    if (n.includes('pulau pinang') || n.includes('penang'))
      return 'Pulau Pinang';
    if (n.includes('sabah')) return 'Sabah';
    if (n.includes('sarawak')) return 'Sarawak';
    if (n.includes('selangor')) return 'Selangor';
    if (n.includes('terengganu')) return 'Terengganu';
    if (
      n.includes('wilayah persekutuan kuala lumpur') ||
      n.includes('kuala lumpur')
    )
      return 'Kuala Lumpur';
    if (n.includes('wilayah persekutuan labuan') || n.includes('labuan'))
      return 'Labuan';
    if (n.includes('putrajaya')) return 'Putrajaya';
    return name; // fallback to original if no match
  };

  const parsePlaceDetails = (details?: PlaceDetails) => {
    const comps = details?.address_components || [];
    const getComp = (type: string) =>
      comps.find((c) => c.types.includes(type))?.long_name || '';

    const locality = getComp('locality');
    const sublocality = getComp('sublocality');
    const admin1 = getComp('administrative_area_level_1');
    const postal = getComp('postal_code');

    return {
      formatted: details?.formatted_address || '',
      city: locality || sublocality || '',
      stateName: normalizeMYStateName(admin1 || ''),
      postcode: postal || '',
    };
  };

  const companySizeOptions = [
    { value: 'STARTUP', label: t('employerCompanyForm.startup') },
    { value: 'SMALL', label: t('employerCompanyForm.small') },
    { value: 'MEDIUM', label: t('employerCompanyForm.medium') },
    { value: 'LARGE', label: t('employerCompanyForm.large') },
    { value: 'ENTERPRISE', label: t('employerCompanyForm.enterprise') },
  ];

  const getSelectedIndustryName = () => {
    const selected = industries.find(
      (ind) => String(ind.id) === String(industry)
    );
    return selected ? selected.name : t('employerCompanyForm.selectIndustry');
  };

  const getSelectedCompanySizeName = () => {
    const selected = companySizeOptions.find(
      (opt) => opt.value === companySize
    );
    return selected
      ? selected.label
      : t('employerCompanyForm.selectCompanySize');
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('employerOnboarding.alerts.permissionRequiredTitle'),
          t('employerOnboarding.alerts.permissionRequiredMessage')
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
        // ✅ Store LOCAL URI (upload later on Continue)
        setLogo(result.assets[0].uri);
        console.log(
          '📸 Logo selected (will upload on Continue):',
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        t('common.error'),
        t('employerCompanyForm.errors.pickImageFailed')
      );
    }
  };

  // ✅ Upload logo to S3 (returns S3 URL)
  const uploadCompanyLogo = async (uri: string) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) throw new Error('Authentication required');

      const formData = new FormData();
      formData.append('logo', {
        uri,
        type: 'image/jpeg',
        name: 'logo.jpg',
      } as any);

      console.log('📤 Uploading company logo to S3...');

      const response = await fetch(`${URL}/api/employer/uploadCompanyLogo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload logo');
      }

      console.log('✅ Company logo uploaded to S3:', data.data.logo);
      return data.data.key; // Return S3 URL
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // ✅ Store LOCAL file info (upload later on Continue)
        setBusinessDocument(result.assets[0]);
        console.log(
          '📄 Document selected (will upload on Continue):',
          result.assets[0].name
        );
        Alert.alert(
          t('common.success'),
          t('employerVerification.success.documentSelected')
        );
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        t('common.error'),
        t('employerVerification.errors.pickDocumentFailed')
      );
    }
  };

  // ✅ Upload verification document to S3 (returns S3 URL)
  const uploadVerificationDocument = async (file: any): Promise<string> => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) throw new Error('Authentication required');

      const formData = new FormData();
      formData.append('document', {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name,
      } as any);

      console.log('📤 Uploading verification document to S3...');

      const response = await fetch(
        `${URL}/api/employer/uploadVerificationDocument`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }

      console.log('✅ Verification document uploaded to S3');
      console.log('   - S3 URL:', data.data.verificationDocument); // For display
      console.log('   - S3 Key:', data.data.key); // For storage

      // ✅ Return the KEY (not the URL)
      return data.data.key;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const validateCompanyForm = () => {
    if (!companyName || !industry || !companySize) {
      Alert.alert(
        t('validation.error'),
        t('employerCompanyForm.errors.allFieldsRequired')
      );
      return false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('validation.error'), t('validation.invalidEmail'));
      return false;
    }

    if (website && !/^https?:\/\/.+/.test(website)) {
      Alert.alert(t('validation.error'), t('validation.invalidWebsite'));
      return false;
    }

    if (description && description.length > 200) {
      Alert.alert(
        t('validation.error'),
        t('employerCompanyForm.errors.descriptionTooLong')
      );
      return false;
    }

    return true;
  };

  const validateVerificationForm = () => {
    if (!contactPhone) {
      Alert.alert(
        t('validation.error'),
        t('employerVerification.errors.phoneRequired')
      );
      return false;
    }

    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(contactPhone)) {
      Alert.alert(t('validation.error'), t('validation.invalidPhone'));
      return false;
    }

    return true;
  };

  // src/screens/EmployerOnboardingFlow.tsx

  const handleCompanySubmit = async () => {
    if (!validateCompanyForm()) return;

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData || '{}');
      const userId = user.id;

      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      // ✅ STEP 1: Create/Update company FIRST (without logo)
      const response = await fetch(`${URL}/api/employer/company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          companyName,
          industry,
          companySize,
          address,
          city,
          state,
          postcode,
          description,
          phone,
          email,
          website,
          // Logo will be uploaded separately
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create/update company');
      }

      await AsyncStorage.setItem('companyId', String(data.companyId));

      // ✅ STEP 2: Upload logo IMMEDIATELY AFTER company is created (if user selected one)
      let uploadedLogoKey: string | undefined = undefined;

      if (logo && logo.startsWith('file://')) {
        console.log('📤 Uploading logo after creating company...');

        try {
          uploadedLogoKey = await uploadCompanyLogo(logo);

          console.log('✅ Logo uploaded, key:', uploadedLogoKey);
          Alert.alert(
            t('common.success'),
            t('employerCompanyForm.success.logoUploaded')
          );
        } catch (error) {
          console.error('Error uploading logo:', error);
          Alert.alert(
            t('common.error'),
            t('employerCompanyForm.warnings.logoUploadFailed')
          );
        }
      }

      // Save temp data (use the uploaded logo key if available)
      await AsyncStorage.setItem(
        'tempCompanyData',
        JSON.stringify({
          companyName,
          industry,
          companySize,
          address,
          city,
          state,
          postcode,
          description,
          phone,
          email,
          website,
          logo: uploadedLogoKey, // Store the key (or undefined)
        })
      );

      const newCompletedSteps = { ...completedSteps, company: true };
      setCompletedSteps(newCompletedSteps);
      await AsyncStorage.setItem(
        'completedSteps',
        JSON.stringify(newCompletedSteps)
      );

      setCurrentStep('verification');
    } catch (error: any) {
      console.error('Error creating/updating company:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('employerCompanyForm.errors.createOrUpdateFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  // src/screens/EmployerOnboardingFlow.tsx

  const handleVerificationSubmit = async () => {
    if (!validateVerificationForm()) return;

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = await AsyncStorage.getItem('companyId');

      if (!token || !companyId) {
        throw new Error('Authentication required');
      }

      // ✅ STEP 1: Submit verification details FIRST
      const response = await fetch(`${URL}/api/employer/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId: parseInt(companyId),
          contactPhone,
          businessEmail,
          // Document will be uploaded separately
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit verification');
      }

      // ✅ STEP 2: Upload document IMMEDIATELY AFTER (if user selected one)
      let uploadedDocumentKey: string | undefined = undefined;

      if (businessDocument && businessDocument.uri.startsWith('file://')) {
        console.log('📤 Uploading verification document...');

        try {
          uploadedDocumentKey = await uploadVerificationDocument(
            businessDocument
          );

          console.log('✅ Document uploaded, key:', uploadedDocumentKey);
          Alert.alert(
            t('common.success'),
            t('employerVerification.success.documentUploaded')
          );
        } catch (error) {
          console.error('Error uploading document:', error);
          Alert.alert(
            t('common.error'),
            t('employerVerification.warnings.documentUploadFailed')
          );
        }
      }

      // Save temp data
      await AsyncStorage.setItem(
        'tempVerificationData',
        JSON.stringify({
          contactPhone,
          businessEmail,
          businessDocument: uploadedDocumentKey, // Store the key
        })
      );

      const newCompletedSteps = { ...completedSteps, verification: true };
      setCompletedSteps(newCompletedSteps);
      await AsyncStorage.setItem(
        'completedSteps',
        JSON.stringify(newCompletedSteps)
      );

      setCurrentStep('review');
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('employerVerification.errors.submitFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToComplete = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const companyId = await AsyncStorage.getItem('companyId');

      if (!token || !companyId) {
        throw new Error('Authentication required');
      }

      // Mark company onboarding as complete
      await fetch(
        `${URL}/api/employer/company/${companyId}/complete-onboarding`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Clear temp data after successful completion
      await AsyncStorage.removeItem('tempCompanyData');
      await AsyncStorage.removeItem('tempVerificationData');
      await AsyncStorage.removeItem('completedSteps');

      setCurrentStep('complete');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      // Proceed anyway even if API call fails
      setCurrentStep('complete');
    }
  };

  const handleComplete = () => {
    router.replace('/(employer-hidden)/pending-verification');
  };

  const handleBack = () => {
    if (currentStep === 'verification') {
      setCurrentStep('company');
    } else if (currentStep === 'review') {
      setCurrentStep('verification');
    } else if (currentStep === 'company') {
      router.back();
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'company':
        return 2;
      case 'verification':
        return 3;
      case 'review':
        return 4;
      case 'complete':
        return 5;
      default:
        return 2;
    }
  };

  const getProgress = () => {
    return (getStepNumber() / 5) * 100;
  };

  const renderProgressBar = () => {
    const steps = [
      {
        number: 2,
        label: t('employerOnboarding.steps.company'),
        key: 'company' as const,
      },
      {
        number: 3,
        label: t('employerOnboarding.steps.verification'),
        key: 'verification' as const,
      },
      {
        number: 4,
        label: t('employerOnboarding.steps.review'),
        key: 'review' as const,
      },
      {
        number: 5,
        label: t('employerOnboarding.steps.complete'),
        key: 'complete' as const,
      },
    ];

    const canNavigateToStep = (stepKey: string) => {
      if (stepKey === 'company') return true;
      if (stepKey === 'verification') return completedSteps.company;
      if (stepKey === 'review')
        return completedSteps.company && completedSteps.verification;
      if (stepKey === 'complete')
        return (
          completedSteps.company &&
          completedSteps.verification &&
          completedSteps.review
        );
      return false;
    };

    const handleStepPress = (stepKey: string) => {
      if (canNavigateToStep(stepKey)) {
        setCurrentStep(stepKey as OnboardingStep);
      } else {
        Alert.alert(
          t('employerOnboarding.alerts.stepLockedTitle'),
          t('employerOnboarding.alerts.stepLockedMessage')
        );
      }
    };

    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.stepIndicatorContainer}>
          {steps.map((step) => {
            const isActive = getStepNumber() >= step.number;
            const isClickable = canNavigateToStep(step.key);

            return (
              <TouchableOpacity
                key={step.number}
                style={styles.stepIndicator}
                onPress={() => handleStepPress(step.key)}
                disabled={!isClickable}
              >
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isActive ? '#1E3A8A' : '#E2E8F0',
                      opacity: isClickable ? 1 : 0.5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color: isActive ? '#FFFFFF' : '#64748B',
                      },
                    ]}
                  >
                    {step.number}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isActive ? '#1E3A8A' : '#64748B',
                      opacity: isClickable ? 1 : 0.5,
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${getProgress()}%`, backgroundColor: '#1E3A8A' },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderSelectionModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: any[],
    selectedValue: string,
    onSelect: (value: string) => void,
    isIndustry: boolean = false
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => (isIndustry ? String(item.id) : item.value)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  (isIndustry
                    ? String(item.id) === String(selectedValue)
                    : item.value === selectedValue) &&
                    styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onSelect(isIndustry ? String(item.id) : item.value);
                  onClose();
                }}
              >
                {isIndustry && item.icon && (
                  <Text style={styles.modalOptionIcon}>{item.icon}</Text>
                )}
                <Text
                  style={[
                    styles.modalOptionText,
                    (isIndustry
                      ? String(item.id) === String(selectedValue)
                      : item.value === selectedValue) &&
                      styles.modalOptionTextSelected,
                  ]}
                >
                  {isIndustry ? item.name : item.label}
                </Text>
                {(isIndustry
                  ? String(item.id) === String(selectedValue)
                  : item.value === selectedValue) && (
                  <Ionicons name="checkmark" size={24} color="#1E3A8A" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const renderCompanyForm = () => (
    <KeyboardAwareScrollView
      style={styles.scrollWrapper}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      nestedScrollEnabled={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.title}>{t('employerCompanyForm.title')}</Text>
        <Text style={styles.subtitle}>{t('employerCompanyForm.subtitle')}</Text>

        <View style={styles.formContainer}>
          {/* Logo Upload - Centered */}
          <View style={styles.logoContainerWrapper}>
            <Text style={styles.label}>
              {t('employerCompanyForm.logo')} ({t('common.optional')})
            </Text>
            <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#64748B" />
                  <Text style={styles.logoText}>
                    {t('employerCompanyForm.uploadLogo')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            {t('employerCompanyForm.companyName')} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('employerCompanyForm.companyName')}
            placeholderTextColor="#94A3B8"
            value={companyName}
            onChangeText={setCompanyName}
          />

          <Text style={styles.label}>
            {t('employerCompanyForm.industry')} *
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowIndustryModal(true)}
          >
            <Text
              style={[
                styles.selectButtonText,
                !industry && styles.selectButtonPlaceholder,
              ]}
            >
              {getSelectedIndustryName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>

          <Text style={styles.label}>
            {t('employerCompanyForm.companySize')} *
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCompanySizeModal(true)}
          >
            <Text
              style={[
                styles.selectButtonText,
                !companySize && styles.selectButtonPlaceholder,
              ]}
            >
              {getSelectedCompanySizeName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>

          <Text style={styles.label}>{t('employerCompanyForm.address')}</Text>
          <GooglePlacesAutocomplete
            placeholder={t('employerCompanyForm.addressPlaceholder')}
            fetchDetails
            enablePoweredByContainer={false}
            debounce={300}
            onFail={(error) => {
              console.error('Places API error:', error);
              Alert.alert(
                t('common.error'),
                'Failed to fetch address suggestions. You can type manually.'
              );
            }}
            onPress={(data, details) => {
              const parsed = parsePlaceDetails(details as PlaceDetails);
              // Fill address
              setAddress(parsed.formatted);

              // Auto-fill city/state/postcode and mark read-only by default
              if (parsed.city) {
                setCity(parsed.city);
                setCityAutoFilled(true);
              } else {
                setCityAutoFilled(false);
              }
              if (parsed.stateName) {
                setState(parsed.stateName);
                setStateAutoFilled(true);
              } else {
                setStateAutoFilled(false);
              }
              if (parsed.postcode) {
                setPostcode(parsed.postcode);
                setPostcodeAutoFilled(true);
              } else {
                setPostcodeAutoFilled(false);
              }
            }}
            query={{
              key: GOOGLE_MAPS_AUTOCOMPLETE_KEY,
              language: 'en',
              components: 'country:my',
              types: 'address',
            }}
            textInputProps={{
              style: styles.input,
              placeholderTextColor: '#94A3B8',
              value: address,
              multiline: false,
              numberOfLines: 1,
              onChangeText: (text: string) => {
                setAddress(text);
                if (!text || text.trim() === '') {
                  // Clear dependent fields when address is cleared manually
                  setCity('');
                  setState('');
                  setPostcode('');
                  setCityAutoFilled(false);
                  setStateAutoFilled(false);
                  setPostcodeAutoFilled(false);
                }
              },
            }}
            styles={{
              container: {
                flex: 0,
                width: '100%',
                alignSelf: 'stretch',
              },
              textInputContainer: {
                paddingHorizontal: 0,
                width: '100%',
                backgroundColor: 'transparent',
              },
              textInput: {
                height: 50,
                width: '100%',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 8,
                paddingHorizontal: 15,
                fontSize: 16,
                color: '#1E293B',
                backgroundColor: '#FFFFFF',
                marginBottom: 0,
                textAlign: 'left',
              },
              listView: {
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                maxHeight: 160,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
                marginTop: 4,
                marginBottom: 36,
              },
              row: {
                paddingVertical: 12,
                paddingHorizontal: 12,
              },
              separator: { height: 1, backgroundColor: '#E2E8F0' },
              description: { color: '#0F172A' },
            }}
          />

          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>{t('employerCompanyForm.city')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('employerCompanyForm.cityPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={city}
                onChangeText={(txt) => {
                  setCity(txt);
                  setCityAutoFilled(false);
                }}
                editable={!cityAutoFilled}
                onPressIn={() => setCityAutoFilled(false)}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>{t('employerCompanyForm.state')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('employerCompanyForm.statePlaceholder')}
                placeholderTextColor="#94A3B8"
                value={state}
                onChangeText={(txt) => {
                  setState(txt);
                  setStateAutoFilled(false);
                }}
                editable={!stateAutoFilled}
                onPressIn={() => setStateAutoFilled(false)}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('employerCompanyForm.postcode')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('employerCompanyForm.postcodePlaceholder')}
            placeholderTextColor="#94A3B8"
            value={postcode}
            onChangeText={(txt) => {
              setPostcode(txt);
              setPostcodeAutoFilled(false);
            }}
            keyboardType="numeric"
            editable={!postcodeAutoFilled}
            onPressIn={() => setPostcodeAutoFilled(false)}
          />

          <Text style={styles.label}>
            {t('employerCompanyForm.website')} ({t('common.optional')})
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('employerCompanyForm.websitePlaceholder')}
            placeholderTextColor="#94A3B8"
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text style={styles.label}>
            {t('employerCompanyForm.description')}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('employerCompanyForm.descriptionPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.helperText}>
            {t('employerCompanyForm.descriptionCount', {
              count: description.length,
            })}
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCompanySubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('common.continue')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );

  const renderVerificationForm = () => (
    <KeyboardAwareScrollView
      style={styles.scrollWrapper}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      nestedScrollEnabled={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.title}>{t('employerVerification.title')}</Text>
        <Text style={styles.subtitle}>
          {t('employerVerification.subtitle')}
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>
            {t('employerVerification.documentLabel')} ({t('common.optional')})
          </Text>
          <Text style={styles.helperText}>
            {t('employerVerification.documentHint')}
          </Text>
          <TouchableOpacity
            style={styles.documentButton}
            onPress={pickDocument}
          >
            <Ionicons
              name={businessDocument ? 'document-text' : 'cloud-upload'}
              size={24}
              color="#1E3A8A"
            />
            <Text style={styles.documentButtonText}>
              {businessDocument
                ? businessDocument.name
                : t('employerVerification.uploadDocument')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>
            {t('employerVerification.contactPhone')} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="+60123456789"
            placeholderTextColor="#94A3B8"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>
            {t('employerVerification.businessEmail')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="contact@company.com"
            placeholderTextColor="#94A3B8"
            value={businessEmail}
            onChangeText={setBusinessEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>
            {t('employerVerification.autoFilled')}
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerificationSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('common.continue')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );

  const renderReviewScreen = () => (
    <KeyboardAwareScrollView
      style={styles.scrollWrapper}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      nestedScrollEnabled={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.title}>{t('employerOnboarding.review.title')}</Text>
        <Text style={styles.subtitle}>
          {t('employerOnboarding.review.subtitle')}
        </Text>

        <View style={styles.reviewContainer}>
          {/* Company Information */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <Ionicons name="business" size={24} color="#1E3A8A" />
              <Text style={styles.reviewSectionTitle}>
                {t('employerCompanyForm.title')}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setCurrentStep('company')}
              >
                <Ionicons name="create-outline" size={20} color="#1E3A8A" />
                <Text style={styles.editButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {t('employerCompanyForm.companyName')}:
              </Text>
              <Text style={styles.reviewValue}>
                {companyName || t('profile.notProvided')}
              </Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {t('employerCompanyForm.industry')}:
              </Text>
              <Text style={styles.reviewValue}>
                {getSelectedIndustryName()}
              </Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {t('employerCompanyForm.companySize')}:
              </Text>
              <Text style={styles.reviewValue}>
                {getSelectedCompanySizeName()}
              </Text>
            </View>
            {city && (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>
                  {t('employerCreateJob.labels.city')}:
                </Text>
                <Text style={styles.reviewValue}>
                  {city}, {state}
                </Text>
              </View>
            )}
          </View>

          {/* Verification Information */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#1E3A8A" />
              <Text style={styles.reviewSectionTitle}>
                {t('employerVerification.title')}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setCurrentStep('verification')}
              >
                <Ionicons name="create-outline" size={20} color="#1E3A8A" />
                <Text style={styles.editButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {t('employerVerification.contactPhone')}:
              </Text>
              <Text style={styles.reviewValue}>
                {contactPhone || t('profile.notProvided')}
              </Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {t('employerVerification.businessEmail')}:
              </Text>
              <Text style={styles.reviewValue}>
                {businessEmail || t('profile.notProvided')}
              </Text>
            </View>
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>
                {t('employerVerification.documentLabel')}:
              </Text>
              <Text style={styles.reviewValue}>
                {businessDocument
                  ? businessDocument.name
                  : t('employerVerification.notUploaded')}
              </Text>
            </View>
          </View>

          {/* Important Note */}
          <View style={styles.importantNote}>
            <Ionicons name="information-circle" size={24} color="#1E3A8A" />
            <Text style={styles.importantNoteText}>
              {t('employerOnboarding.review.importantNote')}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleProceedToComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {t('employerOnboarding.completeOnboarding')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );

  const renderCompleteScreen = () => (
    <View style={styles.completeContainer}>
      <View style={styles.completeContent}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={100} color="#10B981" />
        </View>

        <Text style={styles.completeTitle}>
          {t('employerOnboarding.congratulations')}
        </Text>

        <Text style={styles.completeDescription}>
          {t('employerOnboarding.submittedForVerification')}
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
            <Text style={styles.featureText}>
              {t('employerOnboarding.features.pendingVerification')}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="mail-outline" size={24} color="#1E3A8A" />
            <Text style={styles.featureText}>
              {t('employerOnboarding.features.emailNotification')}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="briefcase-outline" size={24} color="#1E3A8A" />
            <Text style={styles.featureText}>
              {t('employerOnboarding.features.postJobsAfterApproval')}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>{t('common.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      {currentStep !== 'complete' && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('employerOnboarding.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* Progress Bar */}
      {currentStep !== 'complete' && renderProgressBar()}

      {/* Render current step */}
      {currentStep === 'company' && renderCompanyForm()}
      {currentStep === 'verification' && renderVerificationForm()}
      {currentStep === 'review' && renderReviewScreen()}
      {currentStep === 'complete' && renderCompleteScreen()}

      {/* Selection Modals */}
      {renderSelectionModal(
        showIndustryModal,
        () => setShowIndustryModal(false),
        t('employerCompanyForm.selectIndustry'),
        industries,
        industry,
        setIndustry,
        true
      )}

      {renderSelectionModal(
        showCompanySizeModal,
        () => setShowCompanySizeModal(false),
        t('employerCompanyForm.selectCompanySize'),
        companySizeOptions,
        companySize,
        setCompanySize,
        false
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollWrapper: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#64748B',
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  selectButtonPlaceholder: {
    color: '#94A3B8',
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
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionSelected: {
    backgroundColor: '#F0F4FF',
  },
  modalOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  modalOptionTextSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  logoContainerWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    color: '#64748B',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1E3A8A',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#F0F4FF',
  },
  documentButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
    backgroundColor: '#1E3A8A',
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    paddingHorizontal: 100,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  completeContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    marginBottom: 30,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#1E293B',
  },
  completeDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    color: '#64748B',
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  reviewContainer: {
    width: '100%',
  },
  reviewSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  editButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '400',
  },
  importantNote: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  importantNoteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
});
