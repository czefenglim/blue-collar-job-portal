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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

// --- Theme/Style Constants (Synced with HomeScreen) ---
const PRIMARY_BLUE = '#0D47A1';
const ACCENT_ORANGE = '#FF9800';
const GRAY_TEXT = '#455A64';
const LIGHT_BACKGROUND = '#F5F5F5';
const CARD_BACKGROUND = '#FFFFFF';
const BORDER_COLOR = '#E0E0E0';
const SPACING = 16;

interface ResumeQuestion {
  id: number;
  questionId: string;
  question: string;
  type: string;
  options?: string[];
  required: boolean;
  conditionalOn?: string;
  conditionalValue?: string;
}

const ResumeQuestionsScreen: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<ResumeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const fetchQuestions = useCallback(async () => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';
      const response = await fetch(
        `${URL}/api/onboarding/getResumeQuestions?lang=${lang}`
      );
      const data = await response.json();
      setQuestions(data);
    } catch (err) {
      console.error('Failed to fetch resume questions:', err);
      Alert.alert(t('common.error'), t('onboarding.buildResume.description'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const toggleMultiSelect = (qid: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[qid]) ? prev[qid] : [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [qid]: updated };
    });
  };

  const saveResumeAnswers = async (
    formattedAnswers: { questionId: string; answer: any }[]
  ) => {
    const token = await AsyncStorage.getItem('jwtToken');
    if (!token) throw new Error('JWT token missing');
    const response = await fetch(`${URL}/api/onboarding/saveResumeAnswers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers: formattedAnswers }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || 'Failed to save resume answers');
    return data;
  };

  const generateResume = async () => {
    const token = await AsyncStorage.getItem('jwtToken');
    if (!token) throw new Error('JWT token missing');
    const response = await fetch(`${URL}/api/onboarding/generateResume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || 'Failed to generate resume');
    return data;
  };

  const handleRegenerate = async () => {
    try {
      setIsSubmitting(true);
      const formatted = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      await saveResumeAnswers(formatted);
      await generateResume();
      Alert.alert(t('common.success'), t('editProfile.resumeRegenerated'));
      router.back();
    } catch (err) {
      console.error('Regenerate resume error:', err);
      Alert.alert(t('common.error'), 'Failed to regenerate resume');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (q: ResumeQuestion) => {
    const qid = q.questionId || String(q.id);
    const value = answers[qid];

    switch (q.type) {
      case 'select':
      case 'multiselect':
        return (
          <View style={styles.optionList}>
            {(q.options || []).map((opt) => {
              const isSelected =
                q.type === 'select'
                  ? value === opt
                  : Array.isArray(value) && value.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                  ]}
                  onPress={() =>
                    q.type === 'select'
                      ? setAnswers((p) => ({ ...p, [qid]: opt }))
                      : toggleMultiSelect(qid, opt)
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={PRIMARY_BLUE}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'multiline':
        return (
          <TextInput
            style={styles.inputMultiline}
            multiline
            numberOfLines={4}
            placeholder={t('onboarding.buildResume.subtitle')}
            placeholderTextColor="#94A3B8"
            value={value || ''}
            onChangeText={(text) =>
              setAnswers((prev) => ({ ...prev, [qid]: text }))
            }
          />
        );
      default:
        return (
          <TextInput
            style={styles.input}
            keyboardType={q.type === 'number' ? 'numeric' : 'default'}
            placeholder={t('onboarding.buildResume.subtitle')}
            placeholderTextColor="#94A3B8"
            value={value?.toString() || ''}
            onChangeText={(text) =>
              setAnswers((prev) => ({
                ...prev,
                [qid]: q.type === 'number' ? Number(text) : text,
              }))
            }
          />
        );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Styled like Home Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={26} color={PRIMARY_BLUE} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {t('onboarding.buildResume.title')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('onboarding.buildResume.subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIconContainer}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={PRIMARY_BLUE}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>
              {t('onboarding.buildResume.description')}
            </Text>
            <Text style={styles.introSubtitle}>
              AI will enhance your answers into professional summaries.
            </Text>
          </View>
        </View>

        {/* Questions Section */}
        <View style={styles.questionsCard}>
          {questions.map((q, index) => (
            <View
              key={q.id}
              style={[styles.inputGroup, index === 0 && { marginTop: 0 }]}
            >
              <View style={styles.labelRow}>
                <View style={styles.dot} />
                <Text style={styles.label}>{q.question}</Text>
              </View>
              {renderQuestion(q)}
              {index < questions.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions - Styled like Job Card Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleRegenerate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {t('editProfile.regenerateAi')}
              </Text>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_BACKGROUND },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: GRAY_TEXT, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING,
    paddingVertical: SPACING,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { marginRight: 12, padding: 4 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: PRIMARY_BLUE },
  headerSubtitle: { fontSize: 13, color: GRAY_TEXT, marginTop: 2 },

  content: { padding: SPACING },

  // Intro Card
  introCard: {
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    padding: SPACING,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_BLUE,
  },
  introIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  introTitle: { fontSize: 15, fontWeight: '700', color: PRIMARY_BLUE },
  introSubtitle: { fontSize: 12, color: GRAY_TEXT, marginTop: 2 },

  // Questions Card
  questionsCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    padding: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: { marginTop: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT_ORANGE,
    marginRight: 8,
  },
  label: { fontSize: 15, fontWeight: '700', color: '#1A202C', flex: 1 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 24 },

  // Inputs
  input: {
    backgroundColor: LIGHT_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: GRAY_TEXT,
  },
  inputMultiline: {
    backgroundColor: LIGHT_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
    fontSize: 16,
    color: GRAY_TEXT,
    textAlignVertical: 'top',
  },

  // Options
  optionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionItemSelected: {
    borderColor: PRIMARY_BLUE,
    backgroundColor: '#E3F2FD',
  },
  optionText: { color: GRAY_TEXT, fontSize: 14, fontWeight: '600' },
  optionTextSelected: { color: PRIMARY_BLUE },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    padding: SPACING,
    backgroundColor: CARD_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BACKGROUND,
  },
  cancelButtonText: { color: GRAY_TEXT, fontSize: 16, fontWeight: '700' },
  submitButton: {
    flex: 2,
    height: 52,
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default ResumeQuestionsScreen;
