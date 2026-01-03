import React, { useEffect, useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface SignUpFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

const SignUpScreen: React.FC = () => {
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [didResetAgreement, setDidResetAgreement] = useState<boolean>(false);

  // OTP State
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [timer, setTimer] = useState<number>(0);

  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Initialize agreement to unchecked by default for this sign-up session
  useEffect(() => {
    let alive = true;
    const resetAgreement = async () => {
      try {
        await AsyncStorage.setItem('agreedToTerms', 'false');
      } finally {
        if (alive) {
          setAgreeToTerms(false);
          setDidResetAgreement(true);
        }
      }
    };
    resetAgreement();
    return () => {
      alive = false;
    };
  }, []);

  // Ensure checkbox reflects latest agreement when returning from Terms screen
  useFocusEffect(
    React.useCallback(() => {
      if (!didResetAgreement) return;
      let mounted = true;
      const checkAgreement = async () => {
        const agreed = await AsyncStorage.getItem('agreedToTerms');
        if (mounted) setAgreeToTerms(agreed === 'true');
      };
      checkAgreement();
      return () => {
        mounted = false;
      };
    }, [didResetAgreement])
  );

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      Alert.alert(t('common.error'), t('signUp.errors.fullNameRequired'));
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert(t('common.error'), t('signUp.errors.emailRequired'));
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      Alert.alert(t('common.error'), t('signUp.errors.phoneRequired'));
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert(t('common.error'), t('signUp.errors.passwordRequired'));
      return false;
    }

    if (!formData.confirmPassword.trim()) {
      Alert.alert(
        t('common.error'),
        t('signUp.errors.confirmPasswordRequired')
      );
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert(t('common.error'), t('signUp.errors.invalidEmail'));
      return false;
    }

    const phoneRegex = /^(\+?6?01)[0-9]{8,9}$/;
    const cleanPhone = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert(t('common.error'), t('signUp.errors.invalidPhone'));
      return false;
    }

    if (formData.password.length < 8) {
      Alert.alert(t('common.error'), t('signUp.errors.passwordTooShort'));
      return false;
    }

    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      Alert.alert(t('common.passwordTooWeak'), t('signUp.errors.passwordWeak'));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t('common.error'), t('signUp.errors.passwordMismatch'));
      return false;
    }

    if (!agreeToTerms) {
      Alert.alert(t('common.termsRequired'), t('signUp.errors.termsRequired'));
      return false;
    }

    return true;
  };

  const handleToggleTerms = async () => {
    if (isLoading) return;
    if (agreeToTerms) {
      await AsyncStorage.setItem('agreedToTerms', 'false');
      setAgreeToTerms(false);
    } else {
      router.push('/TermsAndConditionsScreen');
    }
  };

  const handleInitiateSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const cleanPhoneNumber = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');

      const response = await fetch(`${URL}/api/auth/signup/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          phoneNumber: cleanPhoneNumber,
          password: formData.password,
          role: 'JOB_SEEKER',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      setOtpSent(true);
      setTimer(60);
      Alert.alert(t('common.success'), 'OTP sent to your email.');
    } catch (error: any) {
      console.error('Initiate sign up error:', error);
      let errorMessage = error.message || t('signUp.errors.signUpFailed');
      if (errorMessage.includes('already exists')) {
        errorMessage = t('signUp.errors.accountExists');
      }
      Alert.alert(t('common.signUpFailed'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;

    setIsLoading(true);
    try {
      // Re-use initiate endpoint to resend
      const cleanPhoneNumber = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      const response = await fetch(`${URL}/api/auth/signup/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          phoneNumber: cleanPhoneNumber,
          password: formData.password,
          role: 'JOB_SEEKER',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw data;
      }

      setTimer(60);
      Alert.alert(t('common.success'), 'OTP resent successfully.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${URL}/api/auth/signup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      await AsyncStorage.setItem('jwtToken', data.data.token);
      await AsyncStorage.setItem('userToken', data.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
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
            Authorization: `Bearer ${data.data.token}`,
          },
          body: JSON.stringify({
            preferredLanguage: backendLanguage,
          }),
        });
      }

      Alert.alert(t('signUp.success.title'), t('signUp.success.message'), [
        {
          text: t('signUp.success.continue'),
          onPress: () => {
            router.replace('/OnboardingFlow');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.startsWith('6')) {
      if (cleaned.length >= 3) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)}-${cleaned.slice(
          4,
          8
        )}-${cleaned.slice(8, 12)}`;
      }
    } else if (cleaned.startsWith('01')) {
      if (cleaned.length >= 7) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(
          7,
          11
        )}`;
      } else if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      }
    }

    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    handleInputChange('phoneNumber', formatted);
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
            <Image
              source={require('../assets/images/Logo.png')}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 2,
                borderColor: '#1E3A8A',
                marginBottom: 16,
              }}
              resizeMode="cover"
            />
            <Text style={styles.appTitle}>{t('signUp.appTitle')}</Text>
            <Text style={styles.appSubtitle}>{t('signUp.appSubtitle')}</Text>
          </View>

          {/* Sign Up Form */}
          <View style={styles.formContainer}>
            {otpSent ? (
              <View>
                <Text style={styles.welcomeText}>Verify Email</Text>
                <Text style={styles.subtitleText}>
                  Enter the code sent to {formData.email}
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        textAlign: 'center',
                        letterSpacing: 8,
                        fontSize: 24,
                        fontWeight: 'bold',
                      },
                    ]}
                    placeholder="000000"
                    placeholderTextColor="#CBD5E1"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.signUpButton,
                    isLoading && styles.signUpButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  <Text style={styles.signUpButtonText}>
                    {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setOtpSent(false)}
                    disabled={isLoading}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: '#64748B', fontSize: 14 }}>
                      Change Email
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={timer > 0 || isLoading}
                    style={{ padding: 8 }}
                  >
                    <Text
                      style={{
                        color: timer > 0 ? '#94A3B8' : '#1E3A8A',
                        fontWeight: 'bold',
                        fontSize: 14,
                      }}
                    >
                      {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.welcomeText}>
                  {t('signUp.createAccount')}
                </Text>
                <Text style={styles.subtitleText}>
                  {t('signUp.joinThousands')}
                </Text>

                {/* Full Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('signUp.fullName')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signUp.fullNamePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={formData.fullName}
                    onChangeText={(value) =>
                      handleInputChange('fullName', value)
                    }
                    autoCapitalize="words"
                    editable={!isLoading}
                    maxLength={100}
                  />
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('signUp.email')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signUp.emailPlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    maxLength={100}
                  />
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {t('signUp.phoneNumber')}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('signUp.phonePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={formData.phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={16}
                    editable={!isLoading}
                  />
                  <Text style={styles.phoneHint}>{t('signUp.phoneHint')}</Text>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('signUp.password')}</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t('signUp.passwordPlaceholder')}
                      placeholderTextColor="#94A3B8"
                      value={formData.password}
                      onChangeText={(value) =>
                        handleInputChange('password', value)
                      }
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      maxLength={128}
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
                  <Text style={styles.passwordHint}>
                    {t('signUp.passwordHint')}
                  </Text>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {t('signUp.confirmPassword')}
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t('signUp.confirmPasswordPlaceholder')}
                      placeholderTextColor="#94A3B8"
                      value={formData.confirmPassword}
                      onChangeText={(value) =>
                        handleInputChange('confirmPassword', value)
                      }
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      maxLength={128}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={isLoading}
                    >
                      <Text style={styles.eyeButtonText}>
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Terms and Conditions */}
                <View style={styles.termsContainer}>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      onPress={handleToggleTerms}
                      disabled={isLoading}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: agreeToTerms }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          agreeToTerms && styles.checkboxChecked,
                        ]}
                      >
                        {agreeToTerms && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.termsText}>
                      {t('signUp.agreeToTerms')}{' '}
                      <TouchableOpacity
                        onPress={() => router.push('/TermsAndConditionsScreen')}
                        disabled={isLoading}
                      >
                        <Text style={styles.termsLink}>
                          {t('signUp.termsOfService')}
                        </Text>
                      </TouchableOpacity>{' '}
                      {t('signUp.and')}{' '}
                      <TouchableOpacity
                        onPress={() => router.push('/TermsAndConditionsScreen')}
                        disabled={isLoading}
                      >
                        <Text style={styles.termsLink}>
                          {t('signUp.privacyPolicy')}
                        </Text>
                      </TouchableOpacity>
                    </Text>
                  </View>
                  <Text style={styles.termsHint}>
                    {t('signUp.termsClickHint')}
                  </Text>
                </View>

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={[
                    styles.signUpButton,
                    isLoading && styles.signUpButtonDisabled,
                  ]}
                  onPress={handleInitiateSignup}
                  disabled={isLoading}
                >
                  <Text style={styles.signUpButtonText}>
                    {isLoading
                      ? t('signUp.creatingAccount')
                      : t('signUp.createAccountButton')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('signUp.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.replace('/LoginScreen')}
              disabled={isLoading}
            >
              <Text style={styles.signInButtonText}>
                {t('signUp.alreadyHaveAccount')}{' '}
                <Text style={styles.signInLinkText}>{t('signUp.signIn')}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  languageSelector: {
    marginBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  eyeButtonText: {
    fontSize: 18,
  },
  passwordHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  phoneHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    flex: 1,
  },
  termsLink: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  termsHint: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 8,
    fontStyle: 'italic',
  },
  signUpButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  signUpButtonText: {
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
  signInButton: {
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    color: '#64748B',
  },
  signInLinkText: {
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

export default SignUpScreen;
