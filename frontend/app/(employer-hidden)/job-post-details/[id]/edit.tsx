import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../../../contexts/LanguageContext';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface Industry {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
}

const JOB_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'FREELANCE', label: 'Freelance' },
];

const WORKING_HOURS = [
  { value: 'DAY_SHIFT', label: 'Day Shift' },
  { value: 'NIGHT_SHIFT', label: 'Night Shift' },
  { value: 'ROTATING_SHIFT', label: 'Rotating Shift' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'WEEKEND_ONLY', label: 'Weekend Only' },
];

const EXPERIENCE_LEVELS = [
  { value: 'ENTRY_LEVEL', label: 'Entry Level' },
  { value: 'JUNIOR', label: 'Junior (1-2 years)' },
  { value: 'MID_LEVEL', label: 'Mid Level (3-5 years)' },
  { value: 'SENIOR', label: 'Senior (5+ years)' },
  { value: 'EXPERT', label: 'Expert (10+ years)' },
];

const SALARY_TYPES = [
  { value: 'HOURLY', label: 'Per Hour' },
  { value: 'DAILY', label: 'Per Day' },
  { value: 'WEEKLY', label: 'Per Week' },
  { value: 'MONTHLY', label: 'Per Month' },
  { value: 'YEARLY', label: 'Per Year' },
  { value: 'PER_PROJECT', label: 'Per Project' },
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

export default function EditJobPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const params = useLocalSearchParams();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [industryId, setIndustryId] = useState<number | undefined>();
  const [jobType, setJobType] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryType, setSalaryType] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [startDate, setStartDate] = useState('');

  // Modal state
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [showJobTypePicker, setShowJobTypePicker] = useState(false);
  const [showWorkingHoursPicker, setShowWorkingHoursPicker] = useState(false);
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);
  const [showSalaryTypePicker, setShowSalaryTypePicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showSkillsPicker, setShowSkillsPicker] = useState(false);

  useEffect(() => {
    fetchJobData();
    fetchIndustries();
    fetchSkills();
  }, [jobId]);

  const fetchJobData = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/jobs/getJob/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch job');
      }

      const job = data.data;

      // Populate form
      setTitle(job.title || '');
      setDescription(job.description || '');
      setRequirements(job.requirements || '');
      setBenefits(job.benefits || '');
      setIndustryId(job.industryId);
      setJobType(job.jobType || '');
      setWorkingHours(job.workingHours || '');
      setExperienceLevel(job.experienceLevel || '');
      setCity(job.city || '');
      setState(job.state || '');
      setPostcode(job.postcode || '');
      setAddress(job.address || '');
      setIsRemote(job.isRemote || false);
      setSalaryMin(job.salaryMin?.toString() || '');
      setSalaryMax(job.salaryMax?.toString() || '');
      setSalaryType(job.salaryType || '');
      setApplicationDeadline(
        job.applicationDeadline
          ? new Date(job.applicationDeadline).toISOString().split('T')[0]
          : ''
      );
      setStartDate(
        job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : ''
      );

      // Parse skills
      if (job.skills) {
        try {
          const skillIds = JSON.parse(job.skills);
          setSelectedSkills(Array.isArray(skillIds) ? skillIds : []);
        } catch (e) {
          console.error('Error parsing skills:', e);
        }
      }
    } catch (error: any) {
      console.error('Error fetching job:', error);
      Alert.alert(
        t('employerJobEdit.errors.title'),
        t('employerJobEdit.errors.loadFail')
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchIndustries = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
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
  };

  const fetchSkills = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(
        `${URL}/api/onboarding/getSkills?lang=${currentLanguage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (response.ok) setSkills(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };

  const toggleSkill = (skillId: number) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.titleRequired')
      );
      return false;
    }
    if (!description.trim()) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.descriptionRequired')
      );
      return false;
    }
    if (!industryId) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.industryRequired')
      );
      return false;
    }
    if (!jobType) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.jobTypeRequired')
      );
      return false;
    }
    if (!workingHours) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.workingHoursRequired')
      );
      return false;
    }
    if (!experienceLevel) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.experienceRequired')
      );
      return false;
    }
    if (!city.trim()) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.cityRequired')
      );
      return false;
    }
    if (!state) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.stateRequired')
      );
      return false;
    }
    if (salaryMin && salaryMax && parseInt(salaryMin) > parseInt(salaryMax)) {
      Alert.alert(
        t('employerJobEdit.validation.title'),
        t('employerJobEdit.validation.salaryMinMaxInvalid')
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    Alert.alert(
      t('employerJobEdit.submit.title'),
      t('employerJobEdit.submit.confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('employerJobEdit.submit.save'),
          onPress: async () => {
            try {
              setSaving(true);
              const token = await AsyncStorage.getItem('jwtToken');

              const payload = {
                title: title.trim(),
                description: description.trim(),
                requirements: requirements.trim() || undefined,
                benefits: benefits.trim() || undefined,
                industryId,
                jobType,
                workingHours,
                experienceLevel,
                skills:
                  selectedSkills.length > 0
                    ? JSON.stringify(selectedSkills)
                    : undefined,
                city: city.trim(),
                state,
                postcode: postcode.trim() || undefined,
                address: address.trim() || undefined,
                isRemote,
                salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
                salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
                salaryType: salaryType || undefined,
                applicationDeadline: applicationDeadline || undefined,
                startDate: startDate || undefined,
              };

              const response = await fetch(`${URL}/api/jobs/update/${jobId}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(
                  data.message || t('employerJobEdit.errors.updateFail')
                );
              }

              Alert.alert(
                t('employerJobEdit.success.title'),
                t('employerJobEdit.success.updated'),
                [
                  {
                    text: t('common.ok'),
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error updating job:', error);
              Alert.alert(
                t('employerJobEdit.errors.title'),
                error.message || t('employerJobEdit.errors.updateFail')
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

  const renderSkillsModal = () => (
    <Modal visible={showSkillsPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('employerJobEdit.pickers.selectSkills')}
            </Text>
            <TouchableOpacity onPress={() => setShowSkillsPicker(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {skills.map((skill) => (
              <TouchableOpacity
                key={skill.id}
                style={styles.skillItem}
                onPress={() => toggleSkill(skill.id)}
              >
                <Text style={styles.skillItemText}>{skill.name}</Text>
                {selectedSkills.includes(skill.id) && (
                  <Ionicons name="checkmark-circle" size={24} color="#1E3A8A" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowSkillsPicker(false)}
          >
            <Text style={styles.doneButtonText}>
              {t('employerJobEdit.pickers.done')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('employerJobEdit.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedIndustry = industries.find((i) => i.id === industryId);
  const selectedJobType = JOB_TYPES.find((t) => t.value === jobType);
  const selectedWorkingHours = WORKING_HOURS.find(
    (w) => w.value === workingHours
  );
  const selectedExperience = EXPERIENCE_LEVELS.find(
    (e) => e.value === experienceLevel
  );
  const selectedSalaryType = SALARY_TYPES.find((s) => s.value === salaryType);
  const selectedSkillsText = selectedSkills
    .map((id) => skills.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('employerJobEdit.headerTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Same sections as create page */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobEdit.sections.basicInfo')}
          </Text>

          {renderInput(t('employerJobEdit.labels.jobTitle'), title, setTitle, {
            placeholder: t('employerJobEdit.placeholders.jobTitle'),
            required: true,
            maxLength: 100,
          })}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.industry')}{' '}
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
                  t('employerJobEdit.placeholders.selectIndustry')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {renderInput(
            t('employerJobEdit.labels.description'),
            description,
            setDescription,
            {
              placeholder: t('employerJobEdit.placeholders.description'),
              required: true,
              multiline: true,
              maxLength: 2000,
            }
          )}

          {renderInput(
            t('employerJobEdit.labels.requirements'),
            requirements,
            setRequirements,
            {
              placeholder: t('employerJobEdit.placeholders.requirements'),
              multiline: true,
              maxLength: 1000,
            }
          )}

          {renderInput(
            t('employerJobEdit.labels.benefits'),
            benefits,
            setBenefits,
            {
              placeholder: t('employerJobEdit.placeholders.benefits'),
              multiline: true,
              maxLength: 1000,
            }
          )}
        </View>

        {/* Job Details - same as create */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobEdit.sections.jobDetails')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.jobType')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowJobTypePicker(true)}
            >
              <Text
                style={
                  selectedJobType ? styles.pickerText : styles.pickerPlaceholder
                }
              >
                {selectedJobType
                  ? t(`employerJobEdit.jobType.${selectedJobType.value}`)
                  : t('employerJobEdit.placeholders.selectJobType')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.workingHours')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowWorkingHoursPicker(true)}
            >
              <Text
                style={
                  selectedWorkingHours
                    ? styles.pickerText
                    : styles.pickerPlaceholder
                }
              >
                {selectedWorkingHours
                  ? t(
                      `employerJobEdit.workingHours.${selectedWorkingHours.value}`
                    )
                  : t('employerJobEdit.placeholders.selectWorkingHours')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.experienceLevel')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowExperiencePicker(true)}
            >
              <Text
                style={
                  selectedExperience
                    ? styles.pickerText
                    : styles.pickerPlaceholder
                }
              >
                {selectedExperience
                  ? t(`employerJobEdit.experience.${selectedExperience.value}`)
                  : t('employerJobEdit.placeholders.selectExperience')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.requiredSkills')}
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSkillsPicker(true)}
            >
              <Text
                style={
                  selectedSkills.length > 0
                    ? styles.pickerText
                    : styles.pickerPlaceholder
                }
                numberOfLines={2}
              >
                {selectedSkillsText ||
                  t('employerJobEdit.placeholders.selectSkills')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
            {selectedSkills.length > 0 && (
              <Text style={styles.helperText}>
                {t('employerJobEdit.labels.skillsSelected', {
                  count: selectedSkills.length,
                })}
              </Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobEdit.sections.location')}
          </Text>

          <View style={styles.remoteToggle}>
            <View>
              <Text style={styles.label}>
                {t('employerJobEdit.labels.remoteWork')}
              </Text>
              <Text style={styles.helperText}>
                {t('employerJobEdit.hints.remoteWork')}
              </Text>
            </View>
            <Switch
              value={isRemote}
              onValueChange={setIsRemote}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={isRemote ? '#1E3A8A' : '#F1F5F9'}
            />
          </View>

          {renderInput(t('employerJobEdit.labels.city'), city, setCity, {
            placeholder: t('employerJobEdit.placeholders.city'),
            required: true,
          })}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.state')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStatePicker(true)}
            >
              <Text
                style={state ? styles.pickerText : styles.pickerPlaceholder}
              >
                {state || t('employerJobEdit.placeholders.selectState')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {renderInput(
            t('employerJobEdit.labels.postcode'),
            postcode,
            setPostcode,
            {
              placeholder: t('employerJobEdit.placeholders.postcode'),
              keyboardType: 'number-pad',
              maxLength: 5,
            }
          )}

          {renderInput(
            t('employerJobEdit.labels.address'),
            address,
            setAddress,
            {
              placeholder: t('employerJobEdit.placeholders.address'),
              multiline: true,
            }
          )}
        </View>

        {/* Salary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobEdit.sections.salary')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerJobEdit.labels.salaryType')}
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSalaryTypePicker(true)}
            >
              <Text
                style={
                  selectedSalaryType
                    ? styles.pickerText
                    : styles.pickerPlaceholder
                }
              >
                {selectedSalaryType
                  ? t(`employerJobEdit.salaryType.${selectedSalaryType.value}`)
                  : t('employerJobEdit.placeholders.selectSalaryType')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                {t('employerJobEdit.labels.minSalary')}
              </Text>
              <TextInput
                style={styles.input}
                value={salaryMin}
                onChangeText={setSalaryMin}
                placeholder={t('employerJobEdit.placeholders.minSalary')}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>
                {t('employerJobEdit.labels.maxSalary')}
              </Text>
              <TextInput
                style={styles.input}
                value={salaryMax}
                onChangeText={setSalaryMax}
                placeholder={t('employerJobEdit.placeholders.maxSalary')}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerJobEdit.sections.additionalInfo')}
          </Text>

          {renderInput(
            t('employerJobEdit.labels.applicationDeadline'),
            applicationDeadline,
            setApplicationDeadline,
            {
              placeholder: t('employerJobEdit.placeholders.dateOptional'),
            }
          )}

          {renderInput(
            t('employerJobEdit.labels.startDate'),
            startDate,
            setStartDate,
            {
              placeholder: t('employerJobEdit.placeholders.dateOptional'),
            }
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('employerJobEdit.submit.saveChanges')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals - same as create page */}
      {renderPickerModal(
        showIndustryPicker,
        () => setShowIndustryPicker(false),
        t('employerJobEdit.pickers.selectIndustry'),
        industries,
        (id) => setIndustryId(id),
        (item) => item.name,
        (item) => item.id
      )}

      {renderPickerModal(
        showJobTypePicker,
        () => setShowJobTypePicker(false),
        t('employerJobEdit.pickers.selectJobType'),
        JOB_TYPES,
        (value) => setJobType(value),
        (item) => t(`employerJobEdit.jobType.${item.value}`),
        (item) => item.value
      )}

      {renderPickerModal(
        showWorkingHoursPicker,
        () => setShowWorkingHoursPicker(false),
        t('employerJobEdit.pickers.selectWorkingHours'),
        WORKING_HOURS,
        (value) => setWorkingHours(value),
        (item) => t(`employerJobEdit.workingHours.${item.value}`),
        (item) => item.value
      )}

      {renderPickerModal(
        showExperiencePicker,
        () => setShowExperiencePicker(false),
        t('employerJobEdit.pickers.selectExperience'),
        EXPERIENCE_LEVELS,
        (value) => setExperienceLevel(value),
        (item) => t(`employerJobEdit.experience.${item.value}`),
        (item) => item.value
      )}

      {renderPickerModal(
        showSalaryTypePicker,
        () => setShowSalaryTypePicker(false),
        t('employerJobEdit.pickers.selectSalaryType'),
        SALARY_TYPES,
        (value) => setSalaryType(value),
        (item) => t(`employerJobEdit.salaryType.${item.value}`),
        (item) => item.value
      )}

      {renderPickerModal(
        showStatePicker,
        () => setShowStatePicker(false),
        t('employerJobEdit.pickers.selectState'),
        MALAYSIAN_STATES,
        (value) => setState(value),
        (item) => t(`states.${item}`),
        (item) => item
      )}

      {renderSkillsModal()}
    </SafeAreaView>
  );
}

// Same styles as create page
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748B' },
  section: { backgroundColor: '#FFFFFF', marginTop: 8, padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  required: { color: '#EF4444' },
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
  textArea: { height: 120, textAlignVertical: 'top' },
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
  pickerText: { fontSize: 16, color: '#1E293B', flex: 1 },
  pickerPlaceholder: { fontSize: 16, color: '#94A3B8' },
  helperText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  remoteToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row' },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: { fontSize: 16, color: '#1E293B' },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  skillItemText: { fontSize: 16, color: '#1E293B', flex: 1 },
  doneButton: {
    backgroundColor: '#1E3A8A',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
