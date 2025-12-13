import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

// Color palette
const PRIMARY_BLUE = '#1E40AF';
const ACCENT_GREEN = '#10B981';
const ACCENT_ORANGE = '#F59E0B';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const TEXT_TERTIARY = '#94A3B8';
const BORDER_COLOR = '#E2E8F0';

export default function UpdateLocationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${URL}/api/users/location`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAddress(data.data.address || '');
        setCity(data.data.city || '');
        setState(data.data.state || '');
        setPostcode(data.data.postcode || '');
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!city || !state) {
      Alert.alert(
        t('common.error'),
        t('updateLocation.alerts.validationMissingCityState')
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('jwtToken');

      const response = await fetch(`${URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address,
          city,
          state,
          postcode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          t('common.success'),
          data.geocoded
            ? t('updateLocation.alerts.successGeocoded')
            : t('updateLocation.alerts.successUpdated'),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      } else {
        const data = await response.json();
        Alert.alert(
          t('common.error'),
          data.message || t('updateLocation.alerts.updateFailed')
        );
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('updateLocation.alerts.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>
            {t('updateLocation.loading') || 'Loading your location...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="location" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>
              {t('updateLocation.heroTitle') || 'Update Your Location'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {t('updateLocation.heroSubtitle') ||
                'Set your preferred location for better job matches'}
            </Text>
          </View>

          {/* Information Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View
                style={[
                  styles.infoIconContainer,
                  { backgroundColor: '#EFF6FF' },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={PRIMARY_BLUE}
                />
              </View>
              <Text style={styles.infoTitle}>
                {t('updateLocation.infoTitle') || 'Why update location?'}
              </Text>
            </View>
            <Text style={styles.infoText}>
              {t('updateLocation.infoText') ||
                'Updating your location helps us show you jobs that are closer to you and match your preferred work area.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Address Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="home-outline"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                </View>
                <Text style={styles.label}>
                  {t('updateLocation.labels.address')}{' '}
                  <Text style={styles.optional}>({t('common.optional')})</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('updateLocation.placeholders.address')}
                placeholderTextColor={TEXT_TERTIARY}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* City Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                </View>
                <Text style={styles.label}>
                  {t('updateLocation.labels.city')}{' '}
                  <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('updateLocation.placeholders.city')}
                placeholderTextColor={TEXT_TERTIARY}
                value={city}
                onChangeText={setCity}
              />
            </View>

            {/* State Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                </View>
                <Text style={styles.label}>
                  {t('updateLocation.labels.state')}{' '}
                  <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('updateLocation.placeholders.state')}
                placeholderTextColor={TEXT_TERTIARY}
                value={state}
                onChangeText={setState}
              />
            </View>

            {/* Postcode Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={TEXT_SECONDARY}
                  />
                </View>
                <Text style={styles.label}>
                  {t('updateLocation.labels.postcode')}{' '}
                  <Text style={styles.optional}>({t('common.optional')})</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('updateLocation.placeholders.postcode')}
                placeholderTextColor={TEXT_TERTIARY}
                value={postcode}
                onChangeText={setPostcode}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                submitting && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={submitting}
            >
              <LinearGradient
                colors={
                  submitting ? ['#94A3B8', '#94A3B8'] : ['#4F46E5', '#3730A3']
                }
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {submitting ? (
                  <View style={styles.saveButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {t('updateLocation.saving') || 'Saving...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.saveButtonContent}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>
                      {t('updateLocation.actions.saveLocation')}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <View
                style={[
                  styles.tipsIconContainer,
                  { backgroundColor: '#FEF3C7' },
                ]}
              >
                <Ionicons name="bulb-outline" size={22} color={ACCENT_ORANGE} />
              </View>
              <Text style={styles.tipsTitle}>
                {t('updateLocation.tipLabel') || 'Pro Tip'}
              </Text>
            </View>
            <Text style={styles.tipsText}>
              {t('updateLocation.tipText') ||
                'Accurate location helps us show you relevant job opportunities and calculate travel distances.'}
            </Text>
            <View style={styles.tipsFooter}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={ACCENT_GREEN}
              />
              <Text style={styles.tipsFooterText}>
                {t('updateLocation.privacyNote') ||
                  'Your location data is kept private and secure'}
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: CARD_BACKGROUND,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 8,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  // Information Card
  infoCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  infoText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  // Form Card
  formCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  required: {
    color: '#EF4444',
    fontSize: 16,
  },
  optional: {
    color: TEXT_TERTIARY,
    fontWeight: '400',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  // Save Button
  saveButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  saveButtonDisabled: {
    opacity: 0.8,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Tips Card
  tipsCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  tipsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  tipsText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: 16,
  },
  tipsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tipsFooterText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    flex: 1,
  },
  bottomSpacer: {
    height: 40,
  },
});
