import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function EmployerLoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();

  const URL = Constants.expoConfig?.extra?.API_BASE_URL;

  // Clean phone number - remove non-digits except + at start
  const cleanPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Ensure + is only at the start
    if (cleaned.includes('+')) {
      const hasPlus = cleaned.startsWith('+');
      cleaned = cleaned.replace(/\+/g, '');
      if (hasPlus) cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const validateInputs = () => {
    if (!email || !password) {
      Alert.alert(t('validation.error'), t('validation.allFieldsRequired'));
      return false;
    }

    // Signup-specific validation
    if (!isLogin) {
      // Validate full name
      if (!fullName || fullName.trim().length < 2) {
        Alert.alert(
          t('validation.error'),
          'Please enter your full name (at least 2 characters)'
        );
        return false;
      }

      // Validate phone number
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        Alert.alert(t('validation.error'), 'Please enter your phone number');
        return false;
      }

      const cleanedPhone = cleanPhoneNumber(phoneNumber);
      const digitsOnly = cleanedPhone.replace(/\+/g, '');

      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        Alert.alert(
          t('validation.error'),
          'Phone number must be between 10 and 15 digits\n\nExamples:\n+60123456789\n0123456789'
        );
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('validation.error'), t('validation.invalidEmail'));
      return false;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert(t('validation.error'), t('validation.passwordTooShort'));
      return false;
    }

    return true;
  };

  const handleAuthentication = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

      // Prepare request body
      const body: any = {
        email: email.trim().toLowerCase(),
        password,
      };

      // Add signup-specific fields
      if (!isLogin) {
        body.fullName = fullName.trim();
        body.phoneNumber = cleanPhoneNumber(phoneNumber);
        body.role = 'EMPLOYER';
      }

      console.log(`Calling ${endpoint} with:`, { ...body, password: '***' });

      const response = await fetch(`${URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Auth response:', data);

      if (!response.ok) {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors
            .map((err: any) => err.msg || err.message)
            .join('\n');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Authentication failed');
      }

      const token = data?.data?.token;
      const user = data?.data?.user;

      if (!token || !user) {
        throw new Error('Missing token or user data in API response');
      }

      // Store data
      await Promise.all([
        AsyncStorage.setItem('jwtToken', token),
        AsyncStorage.setItem('userToken', token),
        AsyncStorage.setItem('userData', JSON.stringify(user)),
      ]);

      console.log('✅ Stored user data:', {
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Update preferred language if set
      const preferredLanguage = await AsyncStorage.getItem('preferredLanguage');
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferredLanguage: backendLanguage,
          }),
        }).catch((err) => console.error('Language update error:', err));
      }

      const successMessage = isLogin
        ? 'Welcome back!'
        : 'Account created successfully!';

      Alert.alert('Success', successMessage, [
        {
          text: 'Continue',
          onPress: async () => {
            if (isLogin) {
              // ✅ CHECK VERIFICATION STATUS
              try {
                const verificationResponse = await fetch(
                  `${URL}/api/employer/verification/status`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                if (verificationResponse.ok) {
                  const verificationData = await verificationResponse.json();
                  const status = verificationData.data.verificationStatus;

                  if (status === 'PENDING') {
                    router.replace('/(employer-hidden)/pending-verification');
                  } else if (status === 'REJECTED') {
                    router.replace('/(employer)/rejected-verification');
                  } else if (status === 'APPROVED') {
                    router.replace('/(employer)/dashboard');
                  }
                } else {
                  // If no company found, redirect to onboarding
                  router.replace('/EmployerOnboardingFlow');
                }
              } catch (error) {
                console.error('Error checking verification status:', error);
                router.replace('/(employer)/dashboard');
              }
            } else {
              // New signup always goes to onboarding
              router.replace('/EmployerOnboardingFlow');
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Auth error:', error);

      let errorMessage =
        error.message || 'Authentication failed. Please try again.';

      // Handle specific error messages
      if (errorMessage.includes('already exists')) {
        errorMessage =
          'An account with this email already exists. Please login instead.';
      } else if (errorMessage.includes('Invalid email or password')) {
        errorMessage =
          'Invalid email or password. Please check your credentials.';
      }

      Alert.alert(isLogin ? 'Login Failed' : 'Sign Up Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Clear form when switching modes
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/SelectRoleScreen')}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

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
              <Ionicons name="briefcase" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appTitle}>
              {isLogin
                ? t('employerLogin.title')
                : t('employerLogin.registerTitle')}
            </Text>
            <Text style={styles.appSubtitle}>
              {isLogin
                ? 'Sign in to manage your job postings'
                : 'Create an employer account to start hiring'}
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </Text>
            <Text style={styles.subtitleText}>
              {isLogin
                ? 'Sign in to your employer account'
                : 'Create your employer account'}
            </Text>

            {/* Signup-only fields */}
            {!isLogin && (
              <>
                {/* Full Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {t('employerLogin.fullName')}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {t('employerLogin.phoneNumber')}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., +60123456789"
                    placeholderTextColor="#94A3B8"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                  <Text style={styles.helpText}>
                    📱 Include country code (e.g., +60 for Malaysia)
                  </Text>
                </View>
              </>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('employerLogin.email')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {t('employerLogin.password')}
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password (Login only) */}
            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/ForgotPasswordScreen')}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleAuthentication}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin
                    ? t('employerLogin.login')
                    : t('employerLogin.register')}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Toggle Auth Mode */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleAuthMode}
              disabled={loading}
            >
              <Text style={styles.toggleText}>
                {isLogin
                  ? t('employerLogin.noAccount')
                  : t('employerLogin.haveAccount')}{' '}
                <Text style={styles.toggleLinkText}>
                  {isLogin
                    ? t('employerLogin.register')
                    : t('employerLogin.login')}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Change Language Button */}
            <TouchableOpacity
              style={styles.changeLanguageButton}
              onPress={() => router.replace('/')}
              disabled={loading}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
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
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
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
  inputContainer: {
    marginBottom: 20,
  },
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
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  toggleButton: {
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    color: '#64748B',
  },
  toggleLinkText: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
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
