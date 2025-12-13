import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PaymentFailedScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleRetry = () => {
    router.replace('/(employer-hidden)/pricing');
  };

  const handleContactSupport = () => {
    // TODO: Add support contact logic
    router.replace('/(employer)/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={120} color="#EF4444" />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {t('paymentFailed.title') || 'Payment Failed'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {t('paymentFailed.message') ||
            "We couldn't process your payment. Please check your payment details and try again."}
        </Text>

        {/* Reasons Card */}
        <View style={styles.reasonsCard}>
          <Text style={styles.reasonsTitle}>
            {t('paymentFailed.reasonsTitle') || 'Common reasons:'}
          </Text>
          <View style={styles.reasonItem}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.reasonText}>
              {t('paymentFailed.reason1') || 'Insufficient funds'}
            </Text>
          </View>
          <View style={styles.reasonItem}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.reasonText}>
              {t('paymentFailed.reason2') || 'Incorrect card details'}
            </Text>
          </View>
          <View style={styles.reasonItem}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.reasonText}>
              {t('paymentFailed.reason3') || 'Card expired or blocked'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>
            {t('paymentFailed.retryButton') || 'Try Again'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <Text style={styles.supportButtonText}>
            {t('paymentFailed.contactSupport') || 'Contact Support'}
          </Text>
        </TouchableOpacity>

        {/* Skip Link */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(employer)/dashboard')}
        >
          <Text style={styles.skipButtonText}>
            {t('paymentFailed.skipForNow') || 'Skip for now'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  reasonsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  skipButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
});
