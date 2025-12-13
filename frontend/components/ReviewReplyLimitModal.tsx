// File: components/ReviewReplyLimitModal.tsx
// Modal shown when free plan users try to reply to reviews

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ReviewReplyLimitModalProps {
  visible: boolean;
  onClose: () => void;
  currentPlan?: string;
}

export default function ReviewReplyLimitModal({
  visible,
  onClose,
  currentPlan = 'FREE',
}: ReviewReplyLimitModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/(employer-hidden)/pricing');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="lock-closed" size={48} color="#1E3A8A" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Upgrade to Reply to Reviews</Text>
            <Text style={styles.subtitle}>
              Replying to company reviews is a PRO/MAX feature
            </Text>

            {/* Current Plan */}
            <View style={styles.currentPlanCard}>
              <View style={styles.currentPlanHeader}>
                <Ionicons name="information-circle" size={20} color="#64748B" />
                <Text style={styles.currentPlanText}>Your Current Plan</Text>
              </View>
              <Text style={styles.currentPlanValue}>{currentPlan}</Text>
              <Text style={styles.currentPlanLimit}>
                • Cannot reply to company reviews{'\n'}• Limited to 1 job post
                {'\n'}• Basic features only
              </Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>
                Upgrade to unlock these features:
              </Text>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitText}>
                    Reply to company reviews
                  </Text>
                  <Text style={styles.benefitDescription}>
                    Engage with your reviewers and build trust
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitText}>Post more jobs</Text>
                  <Text style={styles.benefitDescription}>
                    PRO: 5 jobs | MAX: Unlimited jobs
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitText}>Advanced analytics</Text>
                  <Text style={styles.benefitDescription}>
                    Track your company's performance
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitText}>Priority support</Text>
                  <Text style={styles.benefitDescription}>
                    Get help when you need it
                  </Text>
                </View>
              </View>
            </View>

            {/* Pricing */}
            <View style={styles.pricingContainer}>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingPlan}>PRO</Text>
                <View style={styles.pricingAmount}>
                  <Text style={styles.pricingCurrency}>RM</Text>
                  <Text style={styles.pricingPrice}>30</Text>
                  <Text style={styles.pricingPeriod}>/month</Text>
                </View>
                <Text style={styles.pricingFeature}>5 job posts</Text>
                <Text style={styles.pricingFeature}>Reply to reviews ✓</Text>
              </View>

              <View style={[styles.pricingCard, styles.pricingCardPopular]}>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                </View>
                <Text style={styles.pricingPlan}>MAX</Text>
                <View style={styles.pricingAmount}>
                  <Text style={styles.pricingCurrency}>RM</Text>
                  <Text style={styles.pricingPrice}>60</Text>
                  <Text style={styles.pricingPeriod}>/month</Text>
                </View>
                <Text style={styles.pricingFeature}>Unlimited jobs</Text>
                <Text style={styles.pricingFeature}>Reply to reviews ✓</Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <Ionicons name="rocket" size={20} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>View Pricing Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  currentPlanCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  currentPlanText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
  },
  currentPlanValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#78350F',
    marginBottom: 8,
  },
  currentPlanLimit: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  pricingCardPopular: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pricingPlan: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  pricingAmount: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pricingCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 4,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pricingPeriod: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 12,
  },
  pricingFeature: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
