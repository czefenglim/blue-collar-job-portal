import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useLanguage } from '../contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface LoginFormData {
  email: string;
  password: string;
}

const LoginScreen: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const router = useRouter();
  const { t } = useLanguage();

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      Alert.alert(t('common.error'), t('login.errors.emailRequired'));
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert(t('common.error'), t('login.errors.passwordRequired'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert(t('common.error'), t('login.errors.invalidEmail'));
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.data.token;
        await AsyncStorage.setItem('jwtToken', token);

        const preferredLanguage = await AsyncStorage.getItem(
          'preferredLanguage'
        );

        if (preferredLanguage) {
          const languageMap: Record<string, string> = {
            en: 'ENGLISH',
            zh: 'CHINESE',
            ms: 'MALAY',
            ta: 'TAMIL',
          };

          const backendLanguage = languageMap[preferredLanguage] || 'ENGLISH';

          await fetch(`${URL}/api/language/updateLanguage`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.data.token}`,
            },
            body: JSON.stringify({
              preferredLanguage: backendLanguage,
            }),
          });
        }

        Alert.alert(t('common.success'), t('login.success.loggedIn'));
        router.push('/HomeScreen');
      } else {
        Alert.alert(
          t('common.error'),
          data.message || t('login.errors.loginFailed')
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(t('common.error'), t('login.errors.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>BC</Text>
            </View>
            <Text style={styles.appTitle}>{t('login.appTitle')}</Text>
            <Text style={styles.appSubtitle}>{t('login.appSubtitle')}</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>{t('login.welcomeBack')}</Text>
            <Text style={styles.subtitleText}>
              {t('login.signInToContinue')}
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('login.email')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('login.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeButtonText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => router.push('/ForgotPasswordScreen')}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>
                {t('login.forgotPassword')}
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? t('login.signingIn') : t('login.signIn')}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up */}
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => router.push('/SignUpScreen')}
              disabled={isLoading}
            >
              <Text style={styles.signUpButtonText}>
                {t('login.noAccount')}{' '}
                <Text style={styles.signUpLinkText}>{t('login.signUp')}</Text>
              </Text>
            </TouchableOpacity>

            {/* Change Language Button */}
            <TouchableOpacity
              style={styles.changeLanguageButton}
              onPress={() => router.replace('/')} // navigate back to index.tsx
              disabled={isLoading}
            >
              <Text style={styles.changeLanguageText}>
                🌐 {t('common.changeLanguage') || 'Change Language'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardAvoid: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  languageSelector: { marginBottom: 20 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  appSubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center' },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 56,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    minHeight: 56,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  eyeButton: { paddingHorizontal: 16, paddingVertical: 16 },
  eyeButtonText: { fontSize: 18 },
  forgotPasswordContainer: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, color: '#1E3A8A', fontWeight: '600' },
  loginButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  signUpButton: { alignItems: 'center' },
  signUpButtonText: { fontSize: 16, color: '#64748B' },
  signUpLinkText: { color: '#1E3A8A', fontWeight: 'bold' },
  changeLanguageButton: {
    alignItems: 'center',
    marginTop: 16,
  },

  changeLanguageText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
