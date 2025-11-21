import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function SelectRoleScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleRoleSelection = async (
    role: 'job_seeker' | 'employer' | 'admin'
  ) => {
    try {
      // Save role to AsyncStorage
      await AsyncStorage.setItem('userRole', role);

      // Navigate to appropriate screen based on role
      if (role === 'job_seeker') {
        router.push('/LoginScreen');
      } else if (role === 'employer') {
        router.push('/EmployerLoginScreen');
      } else if (role === 'admin') {
        router.push('/(admin-hidden)/login');
      }
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="briefcase" size={64} color="#1E3A8A" />
          <Text style={styles.title}>{t('selectRole.title')}</Text>
          <Text style={styles.subtitle}>{t('selectRole.subtitle')}</Text>
        </View>

        {/* Role Options */}
        <View style={styles.optionsContainer}>
          {/* Job Seeker Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleRoleSelection('job_seeker')}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.jobSeekerIcon]}>
                <Ionicons name="person" size={32} color="#1E3A8A" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.optionTitle}>
                  {t('selectRole.jobSeeker')}
                </Text>
                <Text style={styles.optionDescription}>
                  {t('selectRole.jobSeekerDesc')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
            </View>
          </TouchableOpacity>

          {/* Employer Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleRoleSelection('employer')}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.employerIcon]}>
                <Ionicons name="business" size={32} color="#F97316" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.optionTitle}>
                  {t('selectRole.employer')}
                </Text>
                <Text style={styles.optionDescription}>
                  {t('selectRole.employerDesc')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
            </View>
          </TouchableOpacity>

          {/* Admin Option */}
          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => handleRoleSelection('admin')}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.adminIcon]}>
                <Ionicons name="shield-checkmark" size={32} color="#8B5CF6" />
              </View>
              <View style={styles.cardTextContainer}>
                <View style={styles.adminTitleRow}>
                  <Text style={styles.optionTitle}>
                    {t('selectRole.admin')}
                  </Text>
                  <View style={styles.restrictedBadge}>
                    <Ionicons name="lock-closed" size={10} color="#DC2626" />
                    <Text style={styles.restrictedText}>
                      {t('selectRole.restricted')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.optionDescription}>
                  {t('selectRole.adminDesc')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#64748B"
          />
          <Text style={styles.footerText}>
            {t('selectRole.footerNote', 'Choose your role to get started')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  jobSeekerIcon: {
    backgroundColor: '#EFF6FF',
  },
  employerIcon: {
    backgroundColor: '#FFF7ED',
  },
  adminIcon: {
    backgroundColor: '#F5F3FF',
  },
  cardTextContainer: {
    flex: 1,
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  restrictedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  restrictedText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#DC2626',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
});
