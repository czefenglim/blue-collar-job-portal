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
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

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

// Prediction interface
interface RecruitmentPrediction {
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: {
    industry: string;
    location: string;
    salary: string;
    demand: string;
  };
  tips: string[];
  similarJobsCount: number;
}

// Salary Analysis interface
interface SalaryAnalysis {
  competitiveness: 'EXCELLENT' | 'COMPETITIVE' | 'BELOW_AVERAGE' | 'LOW';
  percentile: number;
  industryAverage: {
    min: number;
    max: number;
    median: number;
  };
  stateAverage: {
    min: number;
    max: number;
    median: number;
  };
  comparison: {
    vsIndustry: number;
    vsState: number;
    vsOverall: number;
  };
  recommendation: string;
  warnings: string[];
  tips: string[];
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

export default function CreateJobPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
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

  // Prediction modal state
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [prediction, setPrediction] = useState<RecruitmentPrediction | null>(
    null
  );
  const [salaryAnalysis, setSalaryAnalysis] = useState<SalaryAnalysis | null>(
    null
  );
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  useEffect(() => {
    fetchIndustries();
    fetchSkills();
  }, []);

  const fetchIndustries = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/industries?lang=${currentLanguage}` , {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setIndustries(data.data || []);
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const fetchSkills = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/onboarding/getSkills?lang=${currentLanguage}` , {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setSkills(Array.isArray(data) ? data : (data.data || []));
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
        t('validation.error'),
        t('employerCreateJob.validation.titleRequired')
      );
      return false;
    }
    if (!description.trim()) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.descriptionRequired')
      );
      return false;
    }
    if (!industryId) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.industryRequired')
      );
      return false;
    }
    if (!jobType) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.jobTypeRequired')
      );
      return false;
    }
    if (!workingHours) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.workingHoursRequired')
      );
      return false;
    }
    if (!experienceLevel) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.experienceRequired')
      );
      return false;
    }
    if (!city.trim()) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.cityRequired')
      );
      return false;
    }
    if (!state) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.stateRequired')
      );
      return false;
    }
    if (salaryMin && salaryMax && parseInt(salaryMin) > parseInt(salaryMax)) {
      Alert.alert(
        t('validation.error'),
        t('employerCreateJob.validation.minExceedsMax')
      );
      return false;
    }
    return true;
  };

  // Fetch prediction and salary analysis, then show modal
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoadingPrediction(true);
    setShowPredictionModal(true);

    try {
      const token = await AsyncStorage.getItem('jwtToken');

      // Fetch both prediction and salary analysis in parallel
      const [predictionResponse, salaryResponse] = await Promise.all([
        fetch(`${URL}/api/jobs/predict-recruitment-time`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            industryId,
            state,
            city: city.trim(),
            jobType,
            experienceLevel,
            salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
            salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
            skills: selectedSkills,
          }),
        }),
        fetch(`${URL}/api/jobs/analyze-salary`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            industryId,
            state,
            experienceLevel,
            salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
            salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
            jobType,
          }),
        }),
      ]);

      const predictionData = await predictionResponse.json();
      const salaryData = await salaryResponse.json();

      // Set prediction
      if (predictionResponse.ok && predictionData.success) {
        setPrediction(predictionData.data);
      } else {
        setPrediction({
          estimatedDaysMin: 5,
          estimatedDaysMax: 10,
          confidence: 'MEDIUM',
          factors: {
            industry: 'neutral',
            location: 'neutral',
            salary: 'neutral',
            demand: 'neutral',
          },
          tips: ['Post your job to start receiving applications'],
          similarJobsCount: 0,
        });
      }

      // Set salary analysis
      if (salaryResponse.ok && salaryData.success) {
        setSalaryAnalysis(salaryData.data);
      } else {
        setSalaryAnalysis(null);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setPrediction({
        estimatedDaysMin: 5,
        estimatedDaysMax: 10,
        confidence: 'LOW',
        factors: {
          industry: 'unknown',
          location: 'unknown',
          salary: 'unknown',
          demand: 'unknown',
        },
        tips: ['Post your job to start receiving applications'],
        similarJobsCount: 0,
      });
      setSalaryAnalysis(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  // Confirm and create job
  const handleConfirmCreate = async () => {
    setShowPredictionModal(false);
    setLoading(true);

    try {
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
        // Include prediction data
        estimatedHireDaysMin: prediction?.estimatedDaysMin,
        estimatedHireDaysMax: prediction?.estimatedDaysMax,
      };

      const response = await fetch(`${URL}/api/jobs/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create job post');
      }

      Alert.alert(t('common.success'), t('employerCreateJob.success.created'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating job:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('employerCreateJob.errors.createFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return '#10B981';
      case 'MEDIUM':
        return '#F59E0B';
      case 'LOW':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  // Get competitiveness color
  const getCompetitivenessColor = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return '#10B981';
      case 'COMPETITIVE':
        return '#3B82F6';
      case 'BELOW_AVERAGE':
        return '#F59E0B';
      case 'LOW':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  // Get competitiveness icon
  const getCompetitivenessIcon = (level: string) => {
    switch (level) {
      case 'EXCELLENT':
        return 'trending-up';
      case 'COMPETITIVE':
        return 'checkmark-circle';
      case 'BELOW_AVERAGE':
        return 'warning';
      case 'LOW':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
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
              {t('employerCreateJob.modals.selectSkills')}
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
            <Text style={styles.doneButtonText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render prediction modal with salary analysis
  const renderPredictionModal = () => (
    <Modal
      visible={showPredictionModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowPredictionModal(false)}
    >
      <View style={styles.predictionModalOverlay}>
        <ScrollView style={styles.predictionModalScroll}>
          <View style={styles.predictionModalContent}>
            {loadingPrediction ? (
              <View style={styles.predictionLoading}>
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text style={styles.predictionLoadingText}>
                  {t('employerCreateJob.prediction.loading')}
                </Text>
              </View>
            ) : (
              <>
                {/* Recruitment Time Prediction */}
                {prediction && (
                  <>
                    <View style={styles.predictionHeader}>
                      <View style={styles.predictionIconContainer}>
                        <Ionicons name="time" size={32} color="#1E3A8A" />
                      </View>
                      <Text style={styles.predictionTitle}>
                        {t('employerCreateJob.prediction.title')}
                      </Text>
                    </View>

                    <View style={styles.predictionCard}>
                      <Text style={styles.predictionMessage}>
                        {t('employerCreateJob.prediction.message', { state })}
                      </Text>
                      <View style={styles.predictionDays}>
                        <Text style={styles.predictionDaysText}>
                          {prediction.estimatedDaysMin}–
                          {prediction.estimatedDaysMax}
                        </Text>
                        <Text style={styles.predictionDaysLabel}>
                          {t('employerCreateJob.prediction.days')}
                        </Text>
                      </View>

                      <View style={styles.confidenceBadge}>
                        <View
                          style={[
                            styles.confidenceDot,
                            {
                              backgroundColor: getConfidenceColor(
                                prediction.confidence
                              ),
                            },
                          ]}
                        />
                        <Text style={styles.confidenceText}>
                          {prediction.confidence}{' '}
                          {t('employerCreateJob.prediction.confidence')}
                          {prediction.similarJobsCount > 0 &&
                            ` (${t('employerCreateJob.prediction.similarJobs', {
                              count: prediction.similarJobsCount,
                            })})`}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Salary Competitiveness Analysis */}
                {salaryAnalysis && (salaryMin || salaryMax) && (
                  <>
                    <View style={styles.sectionDivider} />

                    <View style={styles.predictionHeader}>
                      <View
                        style={[
                          styles.predictionIconContainer,
                          { backgroundColor: '#FEF3C7' },
                        ]}
                      >
                        <Ionicons name="cash" size={32} color="#F59E0B" />
                      </View>
                      <Text style={styles.predictionTitle}>
                        {t('employerCreateJob.salary.title')}
                      </Text>
                    </View>

                    <View style={styles.salaryAnalysisCard}>
                      {/* Competitiveness Badge */}
                      <View
                        style={[
                          styles.competitivenessBadge,
                          {
                            backgroundColor:
                              getCompetitivenessColor(
                                salaryAnalysis.competitiveness
                              ) + '20',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            getCompetitivenessIcon(
                              salaryAnalysis.competitiveness
                            ) as any
                          }
                          size={24}
                          color={getCompetitivenessColor(
                            salaryAnalysis.competitiveness
                          )}
                        />
                        <Text
                          style={[
                            styles.competitivenessText,
                            {
                              color: getCompetitivenessColor(
                                salaryAnalysis.competitiveness
                              ),
                            },
                          ]}
                        >
                          {t(
                            `employerCreateJob.salary.competitiveness.${salaryAnalysis.competitiveness}`
                          )}
                        </Text>
                      </View>

                      {/* Percentile */}
                      <View style={styles.percentileContainer}>
                        <Text style={styles.percentileLabel}>
                          {t('employerCreateJob.salary.percentile.label')}
                        </Text>
                        <Text style={styles.percentileValue}>
                          {t('employerCreateJob.salary.percentile.value', {
                            percentile: salaryAnalysis.percentile,
                          })}
                        </Text>
                      </View>

                      {/* Market Comparison */}
                      <View style={styles.comparisonContainer}>
                        <View style={styles.comparisonItem}>
                          <Text style={styles.comparisonLabel}>
                            {t('employerCreateJob.salary.comparison.yourOffer')}
                          </Text>
                          <Text style={styles.comparisonValue}>
                            RM {parseInt(salaryMin || '0').toLocaleString()} -
                            RM{' '}
                            {parseInt(
                              salaryMax || salaryMin || '0'
                            ).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.comparisonItem}>
                          <Text style={styles.comparisonLabel}>
                            {t(
                              'employerCreateJob.salary.comparison.marketAverage'
                            )}
                          </Text>
                          <Text style={styles.comparisonValue}>
                            RM{' '}
                            {salaryAnalysis.stateAverage.min.toLocaleString()} -
                            RM{' '}
                            {salaryAnalysis.stateAverage.max.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.comparisonItem}>
                          <Text style={styles.comparisonLabel}>
                            {t('employerCreateJob.salary.comparison.median')}
                          </Text>
                          <Text style={styles.comparisonValue}>
                            RM{' '}
                            {salaryAnalysis.stateAverage.median.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Comparison Stats */}
                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Text
                            style={[
                              styles.statValue,
                              {
                                color:
                                  salaryAnalysis.comparison.vsState >= 0
                                    ? '#10B981'
                                    : '#EF4444',
                              },
                            ]}
                          >
                            {salaryAnalysis.comparison.vsState >= 0 ? '+' : ''}
                            {salaryAnalysis.comparison.vsState}%
                          </Text>
                          <Text style={styles.statLabel}>
                            {t('employerCreateJob.salary.stats.vsState')}
                          </Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text
                            style={[
                              styles.statValue,
                              {
                                color:
                                  salaryAnalysis.comparison.vsIndustry >= 0
                                    ? '#10B981'
                                    : '#EF4444',
                              },
                            ]}
                          >
                            {salaryAnalysis.comparison.vsIndustry >= 0
                              ? '+'
                              : ''}
                            {salaryAnalysis.comparison.vsIndustry}%
                          </Text>
                          <Text style={styles.statLabel}>
                            {t('employerCreateJob.salary.stats.vsIndustry')}
                          </Text>
                        </View>
                      </View>

                      {/* Recommendation */}
                      <View style={styles.recommendationBox}>
                        <Text style={styles.recommendationText}>
                          {salaryAnalysis.recommendation}
                        </Text>
                      </View>

                      {/* Warnings */}
                      {salaryAnalysis.warnings.length > 0 && (
                        <View style={styles.warningsContainer}>
                          {salaryAnalysis.warnings.map((warning, index) => (
                            <View key={index} style={styles.warningItem}>
                              <Ionicons
                                name="warning"
                                size={16}
                                color="#EF4444"
                              />
                              <Text style={styles.warningText}>{warning}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Tips */}
                {((prediction && prediction.tips.length > 0) ||
                  (salaryAnalysis && salaryAnalysis.tips.length > 0)) && (
                  <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>
                      {t('employerCreateJob.tips.title')}
                    </Text>
                    {prediction?.tips.map((tip, index) => (
                      <View key={`pred-${index}`} style={styles.tipItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                    {salaryAnalysis?.tips.map((tip, index) => (
                      <View key={`sal-${index}`} style={styles.tipItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.predictionActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setShowPredictionModal(false)}
                  >
                    <Text style={styles.editButtonText}>
                      {t('employerCreateJob.actions.editDetails')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.proceedButton}
                    onPress={handleConfirmCreate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.proceedButtonText}>
                          {t('employerJobPosts.cta.create')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerCreateJob.sections.basicInfo')}
          </Text>

          {renderInput(t('employerCreateJob.fields.title'), title, setTitle, {
            placeholder: t('employerCreateJob.placeholders.title'),
            required: true,
            maxLength: 100,
          })}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerCompanyForm.industry')}{' '}
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

          {renderInput(
            t('jobDetails.description.title'),
            description,
            setDescription,
            {
              placeholder: t('employerCreateJob.placeholders.description'),
              required: true,
              multiline: true,
              maxLength: 2000,
            }
          )}

          {renderInput(
            t('jobDetails.requirements.title'),
            requirements,
            setRequirements,
            {
              placeholder: t('employerCreateJob.placeholders.requirements'),
              multiline: true,
              maxLength: 1000,
            }
          )}

          {renderInput(t('jobDetails.benefits.title'), benefits, setBenefits, {
            placeholder: t('employerCreateJob.placeholders.benefits'),
            multiline: true,
            maxLength: 1000,
          })}
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerCreateJob.sections.jobDetails')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('jobDetails.quickInfo.jobType')}{' '}
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
                  ? getJobTypeLabel(selectedJobType.value)
                  : t('employerCreateJob.modals.selectJobType')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('jobDetails.quickInfo.workingHours')}{' '}
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
                  ? getWorkingHoursLabel(selectedWorkingHours.value)
                  : t('employerCreateJob.modals.selectWorkingHours')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerCreateJob.fields.experienceLevel')}{' '}
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
                  ? getExperienceLabel(selectedExperience.value)
                  : t('employerCreateJob.modals.selectExperience')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerCreateJob.fields.requiredSkills')}
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
                  t('employerCreateJob.placeholders.selectSkills')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
            {selectedSkills.length > 0 && (
              <Text style={styles.helperText}>
                {t('employerCreateJob.fields.skillsSelected', {
                  count: selectedSkills.length,
                })}
              </Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('jobDetails.company.location')}
          </Text>

          <View style={styles.remoteToggle}>
            <View>
              <Text style={styles.label}>
                {t('employerCreateJob.fields.remoteWork')}
              </Text>
              <Text style={styles.helperText}>
                {t('employerCreateJob.placeholders.remoteQuestion')}
              </Text>
            </View>
            <Switch
              value={isRemote}
              onValueChange={setIsRemote}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={isRemote ? '#1E3A8A' : '#F1F5F9'}
            />
          </View>

          {renderInput(t('profile.city'), city, setCity, {
            placeholder: t('employerCreateJob.placeholders.city'),
            required: true,
          })}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('profile.state')} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStatePicker(true)}
            >
              <Text
                style={state ? styles.pickerText : styles.pickerPlaceholder}
              >
                {state || t('employerCreateJob.modals.selectState')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {renderInput(t('profile.postcode'), postcode, setPostcode, {
            placeholder: '50000',
            keyboardType: 'number-pad',
            maxLength: 5,
          })}

          {renderInput(t('profile.address'), address, setAddress, {
            placeholder: t('employerCreateJob.placeholders.fullAddress'),
            multiline: true,
          })}
        </View>

        {/* Salary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerCreateJob.sections.salary')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('employerCreateJob.fields.salaryType')}
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
                  ? getSalaryTypeLabel(selectedSalaryType.value)
                  : t('employerCreateJob.modals.selectSalaryType')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                {t('employerCreateJob.fields.minSalary')}
              </Text>
              <TextInput
                style={styles.input}
                value={salaryMin}
                onChangeText={setSalaryMin}
                placeholder={t('employerCreateJob.placeholders.minSalary')}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>
                {t('employerCreateJob.fields.maxSalary')}
              </Text>
              <TextInput
                style={styles.input}
                value={salaryMax}
                onChangeText={setSalaryMax}
                placeholder={t('employerCreateJob.placeholders.maxSalary')}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('employerCreateJob.sections.additional')}
          </Text>

          {renderInput(
            t('employerCreateJob.fields.applicationDeadline'),
            applicationDeadline,
            setApplicationDeadline,
            {
              placeholder: t('employerCreateJob.placeholders.dateOptional'),
            }
          )}

          {renderInput(
            t('employerCreateJob.fields.startDate'),
            startDate,
            setStartDate,
            {
              placeholder: t('employerCreateJob.placeholders.dateOptional'),
            }
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('employerJobPosts.cta.create')}
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
        showJobTypePicker,
        () => setShowJobTypePicker(false),
        t('employerCreateJob.modals.selectJobType'),
        JOB_TYPES,
        (value) => setJobType(value),
        (item) => getJobTypeLabel(item.value),
        (item) => item.value
      )}

      {renderPickerModal(
        showWorkingHoursPicker,
        () => setShowWorkingHoursPicker(false),
        t('employerCreateJob.modals.selectWorkingHours'),
        WORKING_HOURS,
        (value) => setWorkingHours(value),
        (item) => getWorkingHoursLabel(item.value),
        (item) => item.value
      )}

      {renderPickerModal(
        showExperiencePicker,
        () => setShowExperiencePicker(false),
        t('employerCreateJob.modals.selectExperience'),
        EXPERIENCE_LEVELS,
        (value) => setExperienceLevel(value),
        (item) => getExperienceLabel(item.value),
        (item) => item.value
      )}

      {renderPickerModal(
        showSalaryTypePicker,
        () => setShowSalaryTypePicker(false),
        t('employerCreateJob.modals.selectSalaryType'),
        SALARY_TYPES,
        (value) => setSalaryType(value),
        (item) => getSalaryTypeLabel(item.value),
        (item) => item.value
      )}

      {renderPickerModal(
        showStatePicker,
        () => setShowStatePicker(false),
        t('employerCreateJob.modals.selectState'),
        MALAYSIAN_STATES,
        (value) => setState(value),
        (item) => t(`states.${item}`),
        (item) => item
      )}

      {renderSkillsModal()}
      {renderPredictionModal()}
    </SafeAreaView>
  );
}

// Helper label resolvers
function getJobTypeLabel(value: string) {
  const { t } = useLanguage();
  switch (value) {
    case 'FULL_TIME':
      return t('jobTypes.fullTime');
    case 'PART_TIME':
      return t('jobTypes.partTime');
    case 'CONTRACT':
      return t('jobTypes.contract');
    case 'TEMPORARY':
      return t('jobTypes.temporary');
    case 'FREELANCE':
      return t('jobTypes.freelance');
    default:
      return value;
  }
}

function getWorkingHoursLabel(value: string) {
  const { t } = useLanguage();
  switch (value) {
    case 'DAY_SHIFT':
      return t('workingHours.dayShift');
    case 'NIGHT_SHIFT':
      return t('workingHours.nightShift');
    case 'ROTATING_SHIFT':
      return t('workingHours.rotatingShift');
    case 'FLEXIBLE':
      return t('workingHours.flexible');
    case 'WEEKEND_ONLY':
      return t('workingHours.weekendOnly');
    default:
      return value;
  }
}

function getExperienceLabel(value: string) {
  const { t } = useLanguage();
  switch (value) {
    case 'ENTRY_LEVEL':
      return t('experienceLevels.entryLevel');
    case 'JUNIOR':
      return t('experienceLevels.junior');
    case 'MID_LEVEL':
      return t('experienceLevels.midLevel');
    case 'SENIOR':
      return t('experienceLevels.senior');
    case 'EXPERT':
      return t('experienceLevels.expert');
    default:
      return value;
  }
}

function getSalaryTypeLabel(value: string) {
  const { t } = useLanguage();
  switch (value) {
    case 'HOURLY':
      return t('salaryTypes.hourly');
    case 'DAILY':
      return t('salaryTypes.daily');
    case 'WEEKLY':
      return t('salaryTypes.weekly');
    case 'MONTHLY':
      return t('salaryTypes.monthly');
    case 'YEARLY':
      return t('salaryTypes.yearly');
    case 'PER_PROJECT':
      return t('salaryTypes.perProject');
    default:
      return value;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
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
    height: 120,
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
    flex: 1,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  remoteToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
  },
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
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
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  skillItemText: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  doneButton: {
    backgroundColor: '#1E3A8A',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Prediction Modal Styles
  predictionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  predictionModalScroll: {
    flex: 1,
    marginTop: 60,
  },
  predictionModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: '100%',
  },
  predictionLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  predictionLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  predictionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  predictionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  predictionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  predictionHighlight: {
    fontWeight: '600',
    color: '#1E3A8A',
  },
  predictionDays: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 12,
  },
  predictionDaysText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  predictionDaysLabel: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 8,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#64748B',
  },

  // Section Divider
  sectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },

  // Salary Analysis Styles
  salaryAnalysisCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  competitivenessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  competitivenessText: {
    fontSize: 16,
    fontWeight: '700',
  },
  percentileContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  percentileLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  percentileValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  comparisonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  recommendationBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  recommendationText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  warningsContainer: {
    marginTop: 12,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },

  // Tips
  tipsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },

  // Actions
  predictionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  proceedButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
