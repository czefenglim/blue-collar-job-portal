import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

interface JobPostLimitModalProps {
  visible: boolean;
  onClose: () => void;
  currentPlan: 'FREE' | 'PRO' | 'MAX';
  activeJobs: number;
  limit: number;
}

export default function JobPostLimitModal({
  visible,
  onClose,
  currentPlan,
  activeJobs,
  limit,
}: JobPostLimitModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleUpgrade = () => {
    onClose();
    router.push('/(employer-hidden)/pricing');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={64} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {t('jobPostLimit.title') || "You've Reached Your Limit"}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {t('jobPostLimit.message') ||
              `You've used ${activeJobs} of ${limit} job posts on the ${currentPlan} plan.`}
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>
              {t('jobPostLimit.upgradeTitle') || 'Upgrade to get:'}
            </Text>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>
                {currentPlan === 'FREE'
                  ? t('jobPostLimit.benefit1Pro') || 'Up to 5 job posts'
                  : t('jobPostLimit.benefit1Max') || 'Unlimited job posts'}
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>
                {t('jobPostLimit.benefit2') || 'Reply to company reviews'}
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.benefitText}>
                {t('jobPostLimit.benefit3') || 'Priority support'}
              </Text>
            </View>

            {currentPlan === 'FREE' && (
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.benefitText}>
                  {t('jobPostLimit.benefit4') || 'Advanced analytics'}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
          >
            <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>
              {t('jobPostLimit.upgradeButton') || 'Upgrade Plan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>
              {t('jobPostLimit.cancelButton') || 'Maybe Later'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
});
