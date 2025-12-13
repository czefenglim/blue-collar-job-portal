import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const TermsAndConditionsScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [agreeing, setAgreeing] = useState(false);
  const [disagreeing, setDisagreeing] = useState(false);

  const handleAgree = async () => {
    if (agreeing || disagreeing) return;
    setAgreeing(true);
    await AsyncStorage.setItem('agreedToTerms', 'true');
    router.back();
  };

  const handleDisagree = async () => {
    if (agreeing || disagreeing) return;
    setDisagreeing(true);
    await AsyncStorage.setItem('agreedToTerms', 'false');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('terms.title')}</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('terms.subtitle')}</Text>
        <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>

        {/* Sample sections; replace with actual terms text as needed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('terms.section.introduction')}</Text>
          <Text style={styles.sectionText}>{t('terms.section.introductionText')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('terms.section.privacy')}</Text>
          <Text style={styles.sectionText}>{t('terms.section.privacyText')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('terms.section.usage')}</Text>
          <Text style={styles.sectionText}>{t('terms.section.usageText')}</Text>
        </View>
      </ScrollView>

      {/* Agree Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.agreeButton, (agreeing || disagreeing) && styles.agreeButtonDisabled]}
          onPress={handleAgree}
          disabled={agreeing || disagreeing}
        >
          <Text style={styles.agreeButtonText}>{t('terms.agreeButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.disagreeButton, (agreeing || disagreeing) && styles.agreeButtonDisabled]}
          onPress={handleDisagree}
          disabled={agreeing || disagreeing}
        >
          <Text style={styles.disagreeButtonText}>{t('terms.disagreeButton') || 'Disagree'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  lastUpdated: { fontSize: 12, color: '#94A3B8', marginBottom: 16 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  sectionText: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  agreeButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  agreeButtonDisabled: { backgroundColor: '#94A3B8' },
  agreeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  disagreeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disagreeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A' },
});

export default TermsAndConditionsScreen;
