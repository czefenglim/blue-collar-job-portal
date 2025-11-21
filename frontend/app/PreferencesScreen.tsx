import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Industry {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

interface UserPreferences {
  industries: Industry[];
  preferredLocation?: string;
  preferredSalaryMin?: number;
  preferredSalaryMax?: number;
}

const PreferencesScreen: React.FC = () => {
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [token, setToken] = useState<string>('');

  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(
          t('preferences.authenticationRequired'),
          t('preferences.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      setToken(userToken);

      await Promise.all([
        fetchIndustries(userToken),
        fetchUserPreferences(userToken),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('preferences.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndustries = async (userToken: string) => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en'; // default to English if not set

      const response = await fetch(`${URL}/api/industries?lang=${lang}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllIndustries(data.data);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const fetchUserPreferences = async (userToken: string) => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en'; // default to English if not set

      const response = await fetch(
        `${URL}/api/users/getPreferences?lang=${lang}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const industryIds = data.data.industries.map((ind: Industry) => ind.id);
        setSelectedIndustries(industryIds);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const toggleIndustry = (industryId: number) => {
    setSelectedIndustries((prev) => {
      if (prev.includes(industryId)) {
        // Deselect if already selected
        return prev.filter((id) => id !== industryId);
      } else {
        // Prevent selecting more than 3
        if (prev.length >= 3) {
          Alert.alert(
            t('preferences.limitReached.title'),
            t('preferences.limitReached.message')
          );
          return prev; // don't add
        }
        return [...prev, industryId];
      }
    });
  };

  const handleSave = async () => {
    if (selectedIndustries.length === 0) {
      Alert.alert(
        t('preferences.noSelection.title'),
        t('preferences.noSelection.message')
      );
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(`${URL}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industries: selectedIndustries,
        }),
      });

      if (response.ok) {
        Alert.alert(t('common.success'), t('preferences.success.message'), [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert(
          t('common.error'),
          errorData.message || t('preferences.errors.updateFailed')
        );
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert(t('common.error'), t('preferences.errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const getSelectionText = () => {
    const count = selectedIndustries.length;
    if (count === 0) {
      return t('preferences.noIndustriesSelected');
    }
    return t('preferences.industriesSelected', {
      count,
      industry:
        count === 1 ? t('preferences.industry') : t('preferences.industries'),
    });
  };

  const renderIndustryItem = ({ item }: { item: Industry }) => {
    const isSelected = selectedIndustries.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.industryCard, isSelected && styles.industryCardSelected]}
        onPress={() => toggleIndustry(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.industryContent}>
          {item.icon && <Text style={styles.industryIcon}>{item.icon}</Text>}
          <Text
            style={[
              styles.industryName,
              isSelected && styles.industryNameSelected,
            ]}
          >
            {item.name}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('preferences.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('preferences.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('preferences.preferredIndustries')}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t('preferences.industriesSubtitle')}
            </Text>
          </View>

          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>{getSelectionText()}</Text>
          </View>

          <FlatList
            data={allIndustries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderIndustryItem}
            scrollEnabled={false}
            contentContainerStyle={styles.industryList}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>{t('preferences.infoText')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? t('preferences.saving') : t('preferences.saveChanges')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  selectionInfo: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
  },
  selectionText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  industryList: {
    gap: 12,
  },
  industryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  industryCardSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
  },
  industryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  industryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  industryName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  industryNameSelected: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PreferencesScreen;
