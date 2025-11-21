import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', description: 'English' },
  { code: 'zh', label: '中文', name: '中文', description: 'Chinese' },
  { code: 'ms', label: 'BM', name: 'Bahasa Melayu', description: 'Malay' },
  { code: 'ta', label: 'தமிழ்', name: 'தமிழ்', description: 'Tamil' },
];

const LanguageSelectPage: React.FC = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const token = AsyncStorage.getItem('jwtToken');

  const handleConfirm = async () => {
    try {
      await AsyncStorage.setItem('preferredLanguage', selectedLanguage);
      changeLanguage(selectedLanguage);

      // Check if user has already selected a role
      const userRole = await AsyncStorage.getItem('userRole');
      const token = await AsyncStorage.getItem('jwtToken');

      if (token) {
        // User is already logged in, go to tabs
        router.push('/(tabs)');
      } else if (userRole) {
        // User has selected a role but not logged in
        if (userRole === 'employer') {
          router.push('/EmployerLoginScreen');
        } else {
          router.push('/LoginScreen');
        }
      } else {
        // New user, go to role selection
        router.push('/SelectRoleScreen');
      }
    } catch (error) {
      console.error('Error saving preferred language:', error);
    }
  };

  const getCurrentLanguage = () => {
    return LANGUAGES.find((lang) => lang.code === selectedLanguage);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Language</Text>
            <Text style={styles.subtitle}>Choose your preferred language</Text>
          </View>

          {/* Language Selection Cards */}
          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageCard,
                  selectedLanguage === lang.code && styles.languageCardActive,
                ]}
                onPress={() => setSelectedLanguage(lang.code)}
              >
                <View style={styles.cardContent}>
                  <View style={styles.languageHeader}>
                    <Text
                      style={[
                        styles.languageLabel,
                        selectedLanguage === lang.code &&
                          styles.languageLabelActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {selectedLanguage === lang.code && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIcon}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.languageName,
                      selectedLanguage === lang.code &&
                        styles.languageNameActive,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  <Text
                    style={[
                      styles.languageDescription,
                      selectedLanguage === lang.code &&
                        styles.languageDescriptionActive,
                    ]}
                  >
                    {lang.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected Language Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Selected Language</Text>
            <View style={styles.previewContent}>
              <Text style={styles.previewLabel}>
                {getCurrentLanguage()?.label}
              </Text>
              <Text style={styles.previewName}>
                {getCurrentLanguage()?.name}
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm Language</Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  languageGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  languageCard: {
    width: '48%',
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  languageCardActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E40AF',
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    flex: 1,
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  languageLabelActive: {
    color: '#FFFFFF',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  languageNameActive: {
    color: '#E2E8F0',
  },
  languageDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  languageDescriptionActive: {
    color: '#CBD5E1',
  },
  previewContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewContent: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  previewName: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
  confirmButton: {
    width: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default LanguageSelectPage;
