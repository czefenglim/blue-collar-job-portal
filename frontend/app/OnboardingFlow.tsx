import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { useLanguage } from '@/contexts/LanguageContext';

const { width } = Dimensions.get('window');

// Types
interface JobIndustry {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

interface UserProfile {
  dateOfBirth?: Date;
  gender?: '' | 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  profilePicture?: string;
  preferredSalaryMin?: number;
  preferredSalaryMax?: number;
  availableFrom?: Date;
  workingHours?:
    | 'DAY_SHIFT'
    | 'NIGHT_SHIFT'
    | 'ROTATING_SHIFT'
    | 'FLEXIBLE'
    | 'WEEKEND_ONLY';
  transportMode?:
    | 'OWN_VEHICLE'
    | 'PUBLIC_TRANSPORT'
    | 'COMPANY_TRANSPORT'
    | 'MOTORCYCLE'
    | 'BICYCLE'
    | 'WALKING';
  maxTravelDistance?: number;
  experienceYears?: number;
  skills?: string;
  languages?: string;
  certifications?: string;
}

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface ResumeQuestion {
  id: number;
  questionId: string;
  question: string;
  type: string; // "select" | "multiline" | "multiselect" | "file" | "text" | "number"
  options?: string[]; // stored as JSON in DB
  required: boolean;
  conditionalOn?: string;
  conditionalValue?: string;
}

interface Skill {
  id: number;
  name: string;
}

interface Language {
  id: number;
  name: string;
}

interface OnboardingFlowProps {
  onComplete?: (data: {
    profile: UserProfile;
    industries: number[];
    resumeAnswers: Record<string, any>;
  }) => void;
  onSkip?: () => void;
  // API functions - these should be passed from parent component
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [industries, setIndustries] = useState<JobIndustry[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<number[]>([]);

  const [showDatePicker, setShowDatePicker] = useState<
    'dob' | 'available' | null
  >(null);
  const [showStepSelector, setShowStepSelector] = useState(false);

  const [questions, setQuestions] = useState<ResumeQuestion[]>([]);

  const [resumeAnswers, setResumeAnswers] = useState<Record<string, any>>({});

  const [skills, setSkills] = useState<Skill[]>([]); // Add this
  const [languages, setLanguages] = useState<Language[]>([]); // Add this

  const [selectedSkills, setSelectedSkills] = useState<number[]>([]); // Change to number[]
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([]); // Change to numbe
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeKey, setResumeKey] = useState<string | null>(null);

  const router = useRouter();
  const { t } = useLanguage();

  const onboardingSteps = [
    {
      title: t('onboarding.welcome.title'),
      subtitle: t('onboarding.welcome.subtitle'),
      description: t('onboarding.welcome.description'),
      buttonText: t('onboarding.welcome.buttonText'),
      showSkip: true,
    },
    {
      title: t('onboarding.howItWorks.title'),
      subtitle: t('onboarding.howItWorks.subtitle'),
      description: t('onboarding.howItWorks.description'),
      buttonText: t('onboarding.howItWorks.buttonText'),
      showSkip: true,
    },
    {
      title: t('onboarding.completeProfile.title'),
      subtitle: t('onboarding.completeProfile.subtitle'),
      description: t('onboarding.completeProfile.description'),
      buttonText: t('onboarding.completeProfile.buttonText'),
      showSkip: false,
      isProfileForm: true,
    },
    {
      title: t('onboarding.chooseIndustries.title'),
      subtitle: t('onboarding.chooseIndustries.subtitle'),
      description: t('onboarding.chooseIndustries.description'),
      buttonText: t('onboarding.chooseIndustries.buttonText'),
      showSkip: false,
      isIndustrySelection: true,
    },
    {
      title: t('onboarding.buildResume.title'),
      subtitle: t('onboarding.buildResume.subtitle'),
      description: t('onboarding.buildResume.description'),
      buttonText: t('onboarding.buildResume.buttonText'),
      showSkip: false,
      isResumeQuestions: true,
    },
    {
      title: t('onboarding.previewResume.title'),
      subtitle: t('onboarding.previewResume.subtitle'),
      description: t('onboarding.previewResume.description'),
      primaryButtonText: t('onboarding.previewResume.primaryButtonText'),
      secondaryButtonText: t('onboarding.previewResume.secondaryButtonText'),
      showSkip: false,
      isResumePreview: true,
    },
    {
      title: t('onboarding.completion.title'),
      subtitle: t('onboarding.completion.subtitle'),
      description: t('onboarding.completion.description'),
      buttonText: t('onboarding.completion.buttonText'),
      showSkip: false,
    },
  ];

  // // Keys for AsyncStorage
  // const DRAFT_KEY = 'onboardingDraft';

  // useEffect(() => {
  //   const saveDraft = async () => {
  //     const draft = {
  //       profile: userProfile,
  //       industries: selectedIndustries,
  //       resumeAnswers,
  //     };
  //     try {
  //       await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  //     } catch (e) {
  //       console.error('Error saving draft:', e);
  //     }
  //   };
  //   saveDraft();
  // }, [userProfile, selectedIndustries, resumeAnswers]);

  // // Load draft on mount
  // useEffect(() => {
  //   const loadDraft = async () => {
  //     try {
  //       const stored = await AsyncStorage.getItem(DRAFT_KEY);
  //       if (stored) {
  //         const parsed = JSON.parse(stored);
  //         setUserProfile(parsed.profile || {});
  //         setSelectedIndustries(parsed.industries || []);
  //         setResumeAnswers(parsed.resumeAnswers || {});
  //       }
  //     } catch (e) {
  //       console.error('Error loading draft:', e);
  //     }
  //   };
  //   loadDraft();
  // }, []);

  // fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `${URL}/api/onboarding/getResumeQuestions`
        ); // adjust for your backend URL
        const data = await response.json();
        setQuestions(data);
      } catch (err) {
        console.error('Failed to fetch resume questions:', err);
      }
    };

    fetchQuestions();
  }, []);

  const fetchIndustries = useCallback(async () => {
    try {
      const response = await fetch(`${URL}/api/onboarding/industries`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setIndustries(data);
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  }, []);

  const getGenderLabel = (value: string) => {
    switch (value) {
      case 'MALE':
        return t('onboarding.profileForm.male');
      case 'FEMALE':
        return t('onboarding.profileForm.female');
      case 'OTHER':
        return t('onboarding.profileForm.other');
      case 'PREFER_NOT_TO_SAY':
        return t('onboarding.profileForm.preferNotToSay');
      default:
        return t('onboarding.profileForm.selectGender');
    }
  };

  const getWorkingHoursLabel = (value: string) => {
    switch (value) {
      case 'DAY_SHIFT':
        return t('onboarding.profileForm.dayShift');
      case 'NIGHT_SHIFT':
        return t('onboarding.profileForm.nightShift');
      case 'ROTATING_SHIFT':
        return t('onboarding.profileForm.rotatingShift');
      case 'FLEXIBLE':
        return t('onboarding.profileForm.flexible');
      case 'WEEKEND_ONLY':
        return t('onboarding.profileForm.weekendOnly');
      default:
        return t('onboarding.profileForm.selectWorkingHours');
    }
  };

  const getTransportLabel = (value: string) => {
    switch (value) {
      case 'OWN_VEHICLE':
        return t('onboarding.profileForm.ownVehicle');
      case 'PUBLIC_TRANSPORT':
        return t('onboarding.profileForm.publicTransport');
      case 'COMPANY_TRANSPORT':
        return t('onboarding.profileForm.companyTransport');
      case 'MOTORCYCLE':
        return t('onboarding.profileForm.motorcycle');
      case 'BICYCLE':
        return t('onboarding.profileForm.bicycle');
      case 'WALKING':
        return t('onboarding.profileForm.walking');
      default:
        return t('onboarding.profileForm.selectTransport');
    }
  };

  const saveUserProfile = async (profile: UserProfile, token: string) => {
    try {
      // Create a new object that includes both profile data AND skills/languages
      const profileWithSkillsAndLanguages = {
        ...profile, // Spread the existing profile data
        skills: selectedSkills, // Add skills array
        languages: selectedLanguages, // Add languages array
      };

      console.log('📤 Sending data to backend:', {
        profileData: profileWithSkillsAndLanguages,
        skillsCount: selectedSkills.length,
        languagesCount: selectedLanguages.length,
      });

      const response = await fetch(`${URL}/api/onboarding/saveUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileWithSkillsAndLanguages), // Send the combined data
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend error:', data);
        throw new Error(data.error || 'Failed to save user profile');
      }

      console.log('User profile saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  };

  const saveUserIndustries = async (industryIds: number[]) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) throw new Error('JWT token missing');

      const response = await fetch(`${URL}/api/onboarding/saveUserIndustries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // send JWT token
        },
        body: JSON.stringify({ industryIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend error:', data);
        throw new Error(data.error || 'Failed to save user industries');
      }

      console.log('User industries saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving user industries:', error);
      throw error; // keep throwing so handleNext can catch it
    }
  };

  // Add these functions to fetch skills and languages
  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch(`${URL}/api/onboarding/getSkills`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSkills(data);
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  }, []);

  const fetchLanguages = useCallback(async () => {
    try {
      const response = await fetch(`${URL}/api/onboarding/getLanguages`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setLanguages(data);
    } catch (error) {
      console.error('Error fetching languages:', error);
    }
  }, []);

  const fetchResumeUrl = async (key: string) => {
    // Encode the key because it may contain slashes
    const encodedKey = encodeURIComponent(key);
    const res = await fetch(`${URL}/api/onboarding/resume/${encodedKey}`);
    if (!res.ok) throw new Error('Failed to fetch resume URL');
    return await res.json(); // { resumeUrl: "https://signed-url..." }
  };

  // Call these in useEffect
  useEffect(() => {
    if (currentStep === 2) {
      // When profile form is shown
      fetchSkills();
      fetchLanguages();
    }
  }, [currentStep, fetchSkills, fetchLanguages]);

  const saveResumeAnswers = async (answers: Record<string, any>) => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) throw new Error('JWT token missing');

      // 🔥 Convert { q1: "yes", q2: "no" } → [ {questionId:"q1", answer:"yes"}, ... ]
      const formattedAnswers = Object.entries(answers).map(
        ([questionId, answer]) => ({
          questionId,
          answer,
        })
      );

      const response = await fetch(`${URL}/api/onboarding/saveResumeAnswers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend error:', data);
        throw new Error(data.error || 'Failed to save resume answers');
      }

      console.log('Resume answers saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving resume answers:', error);
      throw error;
    }
  };

  const generateResume = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) throw new Error('JWT token missing');

      const response = await fetch(`${URL}/api/onboarding/generateResume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend error:', data);
        throw new Error(data.error || 'Failed to generate resume');
      }

      console.log('✅ Resume generated successfully:', data);
      return data; // { message, resumeUrl }
    } catch (error) {
      console.error('❌ Error generating resume:', error);
      throw error;
    }
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'Permission to access camera roll is required!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      handleProfileInputChange('profilePicture', result.assets[0].uri);
    }
  };

  const handleSkillToggle = (skillId: number) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skillId)) {
        return prev.filter((id) => id !== skillId);
      } else {
        return [...prev, skillId];
      }
    });
  };

  const handleLanguageToggle = (languageId: number) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(languageId)) {
        return prev.filter((id) => id !== languageId);
      } else {
        return [...prev, languageId];
      }
    });
  };

  useEffect(() => {
    if (currentStep === 3) fetchIndustries();
  }, [currentStep, fetchIndustries]);

  const handleProfileInputChange = (field: keyof UserProfile, value: any) => {
    setUserProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleIndustryToggle = (industryId: number) => {
    setSelectedIndustries((prev) => {
      const isSelected = prev.includes(industryId);
      if (isSelected) {
        return prev.filter((id) => id !== industryId);
      } else {
        if (prev.length >= 3) {
          Alert.alert(
            t('onboarding.chooseIndustries.limitReached'),
            t('onboarding.chooseIndustries.limitMessage')
          );
          return prev;
        }
        return [...prev, industryId];
      }
    });
  };

  const validateCurrentStep = () => {
    if (currentStep === 2) {
      if (!userProfile.city || !userProfile.state) {
        Alert.alert(
          t('onboarding.profileForm.validation.requiredFields'),
          t('onboarding.profileForm.validation.cityStateRequired')
        );
        return false;
      }
    }

    if (currentStep === 3) {
      if (selectedIndustries.length === 0) {
        Alert.alert(
          t('onboarding.chooseIndustries.selectionRequired'),
          t('onboarding.chooseIndustries.selectionMessage')
        );
        return false;
      }
    }

    if (currentStep === 4) {
      const requiredQuestions = questions.filter((q) => q.required);
      for (const question of requiredQuestions) {
        if (
          !resumeAnswers[question.questionId] ||
          resumeAnswers[question.questionId].toString().trim() === ''
        ) {
          Alert.alert(
            t('onboarding.buildResume.requiredQuestion'),
            t('onboarding.buildResume.requiredMessage', {
              question: question.question,
            })
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleResumeAnswerChange = (questionId: string, value: any) => {
    setResumeAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    if (currentStep < onboardingSteps.length - 1) {
      // Save data when moving to next step
      if (currentStep === 2) {
        // step where profile is saved
        try {
          // Retrieve token from AsyncStorage
          const token = await AsyncStorage.getItem('jwtToken');
          if (!token) throw new Error('JWT token missing');

          await saveUserProfile(userProfile, token);
          console.log('Skills selected:', selectedSkills);
          console.log('Languages selected:', selectedLanguages);
        } catch (error) {
          Alert.alert('Error', 'Failed to save profile. Please try again.');
          return;
        }
      }

      if (currentStep === 3) {
        try {
          await saveUserIndustries(selectedIndustries);
        } catch (error) {
          Alert.alert(
            'Error',
            'Failed to save industry preferences. Please try again.'
          );
          return;
        }
      }

      if (currentStep === 4) {
        if (!validateCurrentStep()) return;

        try {
          // Save resume answers first
          await saveResumeAnswers(resumeAnswers);

          // Show loading
          setIsGeneratingResume(true);

          // Generate resume
          const result = await generateResume();

          // Extract key from URL
          setResumeKey(result.key);

          const resume = await fetchResumeUrl(result.key);

          // Set resume URL to display
          setResumeUrl(resume.resumeUrl);

          console.log('Signed URLL:', resumeUrl);

          // Hide loading
          setIsGeneratingResume(false);

          // Move to next step to show PDF
          setCurrentStep(currentStep + 1);
        } catch (error) {
          setIsGeneratingResume(false);
          Alert.alert('Error', 'Failed to generate resume. Please try again.');
        }

        return;
      }

      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      router.push('/HomeScreen');
    }
  };

  // const handleComplete = async () => {
  //   try {
  //     const token = await AsyncStorage.getItem('jwtToken');
  //     if (!token) throw new Error('JWT token missing');

  //     const payload = {
  //       profile: userProfile,
  //       industries: selectedIndustries,
  //       resumeAnswers,
  //     };

  //     const response = await fetch(`${URL}/api/onboarding/complete`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify(payload),
  //     });

  //     const data = await response.json();

  //     if (!response.ok) {
  //       console.error('Backend error:', data);
  //       Alert.alert('Error', data.error || 'Failed to complete onboarding');
  //       return;
  //     }

  //     console.log('Onboarding complete:', data);
  //     // Clear draft after success
  //     await AsyncStorage.removeItem(DRAFT_KEY);

  //     router.push('/HomeScreen');
  //   } catch (err) {
  //     console.error('Error completing onboarding:', err);
  //     Alert.alert('Error', 'Something went wrong. Please try again.');
  //   }
  // };

  // const handleNext = async () => {
  //   if (!validateCurrentStep()) return;

  //   if (currentStep < onboardingSteps.length - 1) {
  //     setCurrentStep(currentStep + 1);
  //   } else {
  //     // Final step → send everything in one API call
  //     handleComplete();
  //   }
  // };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepSelect = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setShowStepSelector(false);
  };

  const renderProgressBar = () => (
    <TouchableOpacity
      style={styles.progressContainer}
      onPress={() => setShowStepSelector(true)}
    >
      {onboardingSteps.map((step, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index <= currentStep
              ? styles.progressDotActive
              : styles.progressDotInactive,
            index === currentStep && styles.progressDotCurrent,
          ]}
        />
      ))}
    </TouchableOpacity>
  );

  const renderStepSelector = () => (
    <Modal
      visible={showStepSelector}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStepSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.stepSelectorContainer}>
          <Text style={styles.stepSelectorTitle}>
            {t('onboarding.stepSelector.title')}
          </Text>
          {onboardingSteps.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepSelectorItem,
                index === currentStep && styles.stepSelectorItemActive,
              ]}
              onPress={() => handleStepSelect(index)}
            >
              <View style={styles.stepSelectorItemContent}>
                <Text
                  style={[
                    styles.stepSelectorItemText,
                    index === currentStep && styles.stepSelectorItemTextActive,
                  ]}
                >
                  {index + 1}. {step.title}
                </Text>
                {index <= currentStep && (
                  <Text style={styles.stepCompletedIcon}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.stepSelectorCloseButton}
            onPress={() => setShowStepSelector(false)}
          >
            <Text style={styles.stepSelectorCloseText}>
              {t('onboarding.stepSelector.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderProfileForm = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
      {/* Profile Picture Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.profilePicture')}
        </Text>
        <View style={styles.profilePictureContainer}>
          <TouchableOpacity
            style={styles.profilePictureButton}
            onPress={handlePickImage}
          >
            {userProfile.profilePicture ? (
              <Image
                source={{ uri: userProfile.profilePicture }}
                style={styles.profilePictureImage}
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePicturePlaceholderText}>+</Text>
                <Text style={styles.profilePictureLabel}>
                  {t('onboarding.profileForm.addPhoto')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Skills Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.skills')}
        </Text>
        <Text style={styles.inputLabel}>
          {t('onboarding.profileForm.selectSkills')}
        </Text>
        <View style={styles.multiselectContainer}>
          {skills.map((skill) => (
            <TouchableOpacity
              key={skill.id}
              style={[
                styles.multiselectItem,
                selectedSkills.includes(skill.id) &&
                  styles.multiselectItemSelected,
              ]}
              onPress={() => handleSkillToggle(skill.id)}
            >
              <Text
                style={[
                  styles.multiselectItemText,
                  selectedSkills.includes(skill.id) &&
                    styles.multiselectItemTextSelected,
                ]}
              >
                {skill.name}
              </Text>
              {selectedSkills.includes(skill.id) && (
                <Text style={styles.multiselectCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Languages Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.languages')}
        </Text>
        <Text style={styles.inputLabel}>
          {t('onboarding.profileForm.selectLanguages')}
        </Text>
        <View style={styles.multiselectContainer}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.id}
              style={[
                styles.multiselectItem,
                selectedLanguages.includes(language.id) &&
                  styles.multiselectItemSelected,
              ]}
              onPress={() => handleLanguageToggle(language.id)}
            >
              <Text
                style={[
                  styles.multiselectItemText,
                  selectedLanguages.includes(language.id) &&
                    styles.multiselectItemTextSelected,
                ]}
              >
                {language.name}
              </Text>
              {selectedLanguages.includes(language.id) && (
                <Text style={styles.multiselectCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Certification Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.certifications')}
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.addCertifications')}
          </Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={userProfile.certifications || ''}
            onChangeText={(text) =>
              handleProfileInputChange('certifications', text)
            }
            placeholder={t('onboarding.profileForm.certificationsPlaceholder')}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.helperText}>
            {t('onboarding.profileForm.certificationsHelper')}
          </Text>
        </View>
      </View>

      {/* Personal Information Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.personalInfo')}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.dateOfBirth')}
          </Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker('dob')}
          >
            <Text style={styles.dateInputText}>
              {userProfile.dateOfBirth
                ? userProfile.dateOfBirth.toDateString()
                : t('onboarding.profileForm.selectDate')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.gender')}
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={userProfile.gender}
              onValueChange={(value) =>
                handleProfileInputChange('gender', value)
              }
              style={styles.picker}
            >
              <Picker.Item
                label={t('onboarding.profileForm.selectGender')}
                value=""
              />
              <Picker.Item
                label={t('onboarding.profileForm.male')}
                value="MALE"
              />
              <Picker.Item
                label={t('onboarding.profileForm.female')}
                value="FEMALE"
              />
              <Picker.Item
                label={t('onboarding.profileForm.other')}
                value="OTHER"
              />
              <Picker.Item
                label={t('onboarding.profileForm.preferNotToSay')}
                value="PREFER_NOT_TO_SAY"
              />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.nationality')}
          </Text>
          <TextInput
            style={styles.textInput}
            value={userProfile.nationality || ''}
            onChangeText={(text) =>
              handleProfileInputChange('nationality', text)
            }
            placeholder={t('onboarding.profileForm.nationalityPlaceholder')}
          />
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.addressSection')}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.address')}
          </Text>
          <TextInput
            style={styles.textInput}
            value={userProfile.address || ''}
            onChangeText={(text) => handleProfileInputChange('address', text)}
            placeholder={t('onboarding.profileForm.streetAddress')}
            multiline
          />
        </View>

        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('onboarding.profileForm.city')} *
            </Text>
            <TextInput
              style={styles.textInput}
              value={userProfile.city || ''}
              onChangeText={(text) => handleProfileInputChange('city', text)}
              placeholder={t('onboarding.profileForm.cityPlaceholder')}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('onboarding.profileForm.state')} *
            </Text>
            <TextInput
              style={styles.textInput}
              value={userProfile.state || ''}
              onChangeText={(text) => handleProfileInputChange('state', text)}
              placeholder={t('onboarding.profileForm.statePlaceholder')}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.postcode')}
          </Text>
          <TextInput
            style={styles.textInput}
            value={userProfile.postcode || ''}
            onChangeText={(text) => handleProfileInputChange('postcode', text)}
            placeholder={t('onboarding.profileForm.postcodePlaceholder')}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Job Preferences Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>
          {t('onboarding.profileForm.jobPreferences')}
        </Text>

        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('onboarding.profileForm.minSalary')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={userProfile.preferredSalaryMin?.toString() || ''}
              onChangeText={(text) =>
                handleProfileInputChange(
                  'preferredSalaryMin',
                  parseInt(text) || undefined
                )
              }
              placeholder={t('onboarding.profileForm.minSalaryPlaceholder')}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>
              {t('onboarding.profileForm.maxSalary')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={userProfile.preferredSalaryMax?.toString() || ''}
              onChangeText={(text) =>
                handleProfileInputChange(
                  'preferredSalaryMax',
                  parseInt(text) || undefined
                )
              }
              placeholder={t('onboarding.profileForm.maxSalaryPlaceholder')}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.availableFrom')}
          </Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker('available')}
          >
            <Text style={styles.dateInputText}>
              {userProfile.availableFrom
                ? userProfile.availableFrom.toDateString()
                : t('onboarding.profileForm.selectDate')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.workingHours')}
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={userProfile.workingHours}
              onValueChange={(value) =>
                handleProfileInputChange('workingHours', value)
              }
              style={styles.picker}
            >
              <Picker.Item
                label={t('onboarding.profileForm.selectWorkingHours')}
                value=""
              />
              <Picker.Item
                label={t('onboarding.profileForm.dayShift')}
                value="DAY_SHIFT"
              />
              <Picker.Item
                label={t('onboarding.profileForm.nightShift')}
                value="NIGHT_SHIFT"
              />
              <Picker.Item
                label={t('onboarding.profileForm.rotatingShift')}
                value="ROTATING_SHIFT"
              />
              <Picker.Item
                label={t('onboarding.profileForm.flexible')}
                value="FLEXIBLE"
              />
              <Picker.Item
                label={t('onboarding.profileForm.weekendOnly')}
                value="WEEKEND_ONLY"
              />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.transportMode')}
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={userProfile.transportMode}
              onValueChange={(value) =>
                handleProfileInputChange('transportMode', value)
              }
              style={styles.picker}
            >
              <Picker.Item
                label={t('onboarding.profileForm.selectTransport')}
                value=""
              />
              <Picker.Item
                label={t('onboarding.profileForm.ownVehicle')}
                value="OWN_VEHICLE"
              />
              <Picker.Item
                label={t('onboarding.profileForm.publicTransport')}
                value="PUBLIC_TRANSPORT"
              />
              <Picker.Item
                label={t('onboarding.profileForm.companyTransport')}
                value="COMPANY_TRANSPORT"
              />
              <Picker.Item
                label={t('onboarding.profileForm.motorcycle')}
                value="MOTORCYCLE"
              />
              <Picker.Item
                label={t('onboarding.profileForm.bicycle')}
                value="BICYCLE"
              />
              <Picker.Item
                label={t('onboarding.profileForm.walking')}
                value="WALKING"
              />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.maxTravelDistance')}
          </Text>
          <TextInput
            style={styles.textInput}
            value={userProfile.maxTravelDistance?.toString() || ''}
            onChangeText={(text) =>
              handleProfileInputChange(
                'maxTravelDistance',
                parseInt(text) || undefined
              )
            }
            placeholder={t('onboarding.profileForm.maxTravelPlaceholder')}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {t('onboarding.profileForm.experienceYears')}
          </Text>
          <TextInput
            style={styles.textInput}
            value={userProfile.experienceYears?.toString() || ''}
            onChangeText={(text) =>
              handleProfileInputChange('experienceYears', parseInt(text) || 0)
            }
            placeholder={t('onboarding.profileForm.experiencePlaceholder')}
            keyboardType="numeric"
          />
        </View>
      </View>

      {showDatePicker && (
        <DateTimePickerModal
          isVisible={showDatePicker !== null}
          mode="date"
          date={
            showDatePicker === 'dob'
              ? userProfile.dateOfBirth || new Date()
              : userProfile.availableFrom || new Date()
          }
          onConfirm={(selectedDate) => {
            handleProfileInputChange(
              showDatePicker === 'dob' ? 'dateOfBirth' : 'availableFrom',
              selectedDate
            );
            setShowDatePicker(null);
          }}
          onCancel={() => setShowDatePicker(null)}
        />
      )}
    </ScrollView>
  );

  const renderIndustrySelection = () => (
    <View style={styles.industriesContainer}>
      <Text style={styles.selectionCounter}>
        {t('onboarding.chooseIndustries.selectionCounter', {
          count: selectedIndustries.length,
        })}
      </Text>
      <ScrollView
        style={styles.industriesScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.industriesGrid}>
          {industries.map((industry) => {
            const isSelected = selectedIndustries.includes(industry.id);
            return (
              <TouchableOpacity
                key={industry.id}
                style={[
                  styles.industryCard,
                  isSelected && styles.industryCardSelected,
                ]}
                onPress={() => handleIndustryToggle(industry.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.industryIcon}>{industry.icon || '🔧'}</Text>
                <Text
                  style={[
                    styles.industryName,
                    isSelected && styles.industryNameSelected,
                  ]}
                >
                  {industry.name}
                </Text>
                <Text
                  style={[
                    styles.industryDescription,
                    isSelected && styles.industryDescriptionSelected,
                  ]}
                >
                  {industry.description || ''}
                </Text>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  const renderResumePreview = () => (
    <View style={{ flex: 1 }}>
      {isGeneratingResume ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10 }}>
            {t('onboarding.previewResume.generating')}
          </Text>
        </View>
      ) : resumeUrl ? (
        <View style={styles.resumePreviewContainer}>
          <View style={styles.resumePlaceholder}>
            <Text style={styles.resumeIcon}>📄</Text>
            <Text style={styles.resumeTitle}>
              {t('onboarding.previewResume.resumeReady')}
            </Text>
            <Text style={styles.resumeDescription}>
              {t('onboarding.previewResume.resumeDescription')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewResumeButton}
            onPress={() => WebBrowser.openBrowserAsync(resumeUrl)}
          >
            <Text style={styles.viewResumeButtonText}>
              {t('onboarding.previewResume.viewResume')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text>{t('onboarding.previewResume.noResume')}</Text>
        </View>
      )}
    </View>
  );

  const renderResumeQuestions = () => (
    <ScrollView
      style={styles.questionsContainer}
      showsVerticalScrollIndicator={false}
    >
      {questions.map((question, index) => (
        <View key={question.questionId} style={styles.questionGroup}>
          <Text style={styles.questionTitle}>
            {index + 1}. {question.question}
            {question.required && (
              <Text style={styles.requiredAsterisk}> *</Text>
            )}
          </Text>

          {question.type === 'multiline' && (
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={resumeAnswers[question.questionId] || ''}
              onChangeText={(text) =>
                handleResumeAnswerChange(question.questionId, text)
              }
              placeholder="Your answer..."
              multiline
              numberOfLines={4}
            />
          )}

          {question.type === 'select' && (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={resumeAnswers[question.questionId] || ''}
                onValueChange={(value) =>
                  handleResumeAnswerChange(question.questionId, value)
                }
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Select an option" value="" />
                {question.options?.map((option, idx) => (
                  <Picker.Item key={idx} label={option} value={option} />
                ))}
              </Picker>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const currentStepData = onboardingSteps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← {t('common.back')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderProgressBar()}

        <View style={styles.headerRight}>
          {currentStepData.showSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>{t('common.skip')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading overlay */}
      {isGeneratingResume && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            {t('onboarding.previewResume.generating')}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>BC</Text>
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{currentStepData.title}</Text>
          <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>

          {currentStepData.isProfileForm && renderProfileForm()}
          {currentStepData.isIndustrySelection && renderIndustrySelection()}
          {currentStepData.isResumeQuestions && renderResumeQuestions()}
          {currentStepData.isResumePreview && renderResumePreview()}

          {!currentStepData.isProfileForm &&
            !currentStepData.isIndustrySelection &&
            !currentStepData.isResumeQuestions && (
              <Text style={styles.description}>
                {currentStepData.description}
              </Text>
            )}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      {currentStepData.isResumePreview ? (
        <View style={styles.previewButtonsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={generateResume}
          >
            <Text style={styles.buttonText}>
              {currentStepData.secondaryButtonText}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {currentStepData.primaryButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.buttonText}>{currentStepData.buttonText}</Text>
        </TouchableOpacity>
      )}

      {renderStepSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    width: 80,
    justifyContent: 'flex-start',
  },
  headerRight: {
    width: 80,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#1E3A8A',
  },
  progressDotInactive: {
    backgroundColor: '#E2E8F0',
  },
  progressDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1E3A8A',
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#1E3A8A',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },

  // Form Styles
  formContainer: {
    width: '100%',
    maxHeight: 500,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'visible',
  },
  picker: {
    height: 200,
  },
  pickerItem: {
    fontSize: 18,
    color: '#000', // 👈 ensures items are visible
  },
  // Industry Selection Styles
  industriesContainer: {
    width: '100%',
    maxHeight: 500,
  },
  selectionCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 16,
  },
  industriesScroll: {
    width: '100%',
  },
  industriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  industryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  industryCardSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#F0F4FF',
  },
  industryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  industryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  industryNameSelected: {
    color: '#1E3A8A',
  },
  industryDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  industryDescriptionSelected: {
    color: '#475569',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1E3A8A',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Resume Questions Styles
  questionsContainer: {
    width: '100%',
    maxHeight: 500,
  },
  questionGroup: {
    marginBottom: 24,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#DC2626',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepSelectorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: width - 80,
    maxHeight: '80%',
  },
  stepSelectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepSelectorItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepSelectorItemActive: {
    backgroundColor: '#F0F4FF',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  stepSelectorItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepSelectorItemText: {
    fontSize: 16,
    color: '#64748B',
    flex: 1,
  },
  stepSelectorItemTextActive: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  stepCompletedIcon: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepSelectorCloseButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  stepSelectorCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottom Container Styles
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nextButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
    marginHorizontal: 24,
  },
  nextButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Profile Picture Styles
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePictureButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#1E3A8A',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  profilePicturePlaceholderText: {
    fontSize: 32,
    color: '#64748B',
    fontWeight: '300',
  },
  profilePictureLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },

  // Multiselect Styles
  multiselectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  multiselectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  multiselectItemSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  multiselectItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  multiselectItemTextSelected: {
    color: '#FFFFFF',
  },
  multiselectCheckmark: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Helper Text
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // ensure it’s on top
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  previewButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginHorizontal: 24,
  },

  button: {
    flex: 1, // <-- ensures they take equal width
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  regenerateButton: {
    backgroundColor: '#f44336',
    marginRight: 8, // spacing between buttons
  },

  continueButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1E3A8A', // blue
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#007AFF', // red
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  resumePreviewContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumePlaceholder: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resumeIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  resumeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  resumeDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  viewResumeButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  viewResumeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default OnboardingFlow;
