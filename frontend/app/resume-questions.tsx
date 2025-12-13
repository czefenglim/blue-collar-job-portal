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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface ResumeQuestion {
  id: number;
  questionId: string;
  question: string;
  type: string; // select | multiselect | multiline | text | number
  options?: string[];
  required: boolean;
  conditionalOn?: string;
  conditionalValue?: string;
}

const ResumeQuestionsScreen: React.FC = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<ResumeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const fetchQuestions = useCallback(async () => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';
      const response = await fetch(`${URL}/api/onboarding/getResumeQuestions?lang=${lang}`);
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

  const saveResumeAnswers = async (formattedAnswers: { questionId: string; answer: any }[]) => {
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
    if (!response.ok) throw new Error(data?.error || 'Failed to save resume answers');
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
    if (!response.ok) throw new Error(data?.error || 'Failed to generate resume');
    return data; // { data: { key } }
  };

  const handleRegenerate = async () => {
    try {
      setIsSubmitting(true);
      // format answers
      const formatted = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
      await saveResumeAnswers(formatted);
      const data = await generateResume();
      Alert.alert(t('common.success'), t('editProfile.resumeRegenerated'));
      // Go back to EditProfile
      router.back();
    } catch (err) {
      console.error('Regenerate resume error:', err);
      Alert.alert(t('common.error'), 'Failed to regenerate resume');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => router.back();

  const renderQuestion = (q: ResumeQuestion) => {
    const qid = q.questionId || String(q.id);
    const value = answers[qid];

    switch (q.type) {
      case 'select':
        return (
          <View style={styles.optionList}>
            {(q.options || []).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionItem, value === opt && styles.optionItemSelected]}
                onPress={() => setAnswers((prev) => ({ ...prev, [qid]: opt }))}
              >
                <Text style={[styles.optionText, value === opt && styles.optionTextSelected]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'multiselect':
        return (
          <View style={styles.optionList}>
            {(q.options || []).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionItem,
                  Array.isArray(value) && value.includes(opt) && styles.optionItemSelected,
                ]}
                onPress={() => toggleMultiSelect(qid, opt)}
              >
                <Text
                  style={[
                    styles.optionText,
                    Array.isArray(value) && value.includes(opt) && styles.optionTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
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
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [qid]: text }))}
          />
        );
      case 'number':
        return (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={t('onboarding.buildResume.subtitle')}
            placeholderTextColor="#94A3B8"
            value={value?.toString() || ''}
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [qid]: Number(text) }))}
          />
        );
      case 'text':
      default:
        return (
          <TextInput
            style={styles.input}
            placeholder={t('onboarding.buildResume.subtitle')}
            placeholderTextColor="#94A3B8"
            value={value || ''}
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [qid]: text }))}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('onboarding.buildResume.title')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#1E3A8A", "#3730A3"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <LinearGradient colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]} style={styles.backButtonGradient}>
              <Text style={styles.backIcon}>←</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('onboarding.buildResume.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('onboarding.buildResume.subtitle')}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📝</Text>
            <View>
              <Text style={styles.sectionTitle}>{t('onboarding.buildResume.title')}</Text>
              <Text style={styles.sectionSubtitle}>{t('onboarding.buildResume.description')}</Text>
            </View>
          </View>

          {questions.map((q) => (
            <View key={q.id} style={styles.inputGroup}>
              <Text style={styles.label}>{q.question}</Text>
              {renderQuestion(q)}
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomButton} onPress={handleCancel} disabled={isSubmitting}>
          <LinearGradient colors={["#94A3B8", "#64748B"]} style={styles.bottomButtonGradient}>
            <Text style={styles.bottomButtonText}>{t('common.cancel')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton} onPress={handleRegenerate} disabled={isSubmitting}>
          <LinearGradient colors={["#10B981", "#059669"]} style={styles.bottomButtonGradient}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.bottomButtonText}>{t('editProfile.regenerateAi')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#334155' },
  headerGradient: { paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  backButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#FFFFFF', fontSize: 18 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#E5E7EB', fontSize: 12 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  sectionSubtitle: { fontSize: 12, color: '#475569' },
  inputGroup: { marginTop: 12 },
  label: { fontSize: 14, color: '#334155', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  inputMultiline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  optionList: { flexDirection: 'row', flexWrap: 'wrap' },
  optionItem: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  optionItemSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  optionText: { color: '#334155', fontSize: 13 },
  optionTextSelected: { color: '#312E81', fontWeight: '600' },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    gap: 12,
  },
  bottomButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  bottomButtonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  bottomButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default ResumeQuestionsScreen;

