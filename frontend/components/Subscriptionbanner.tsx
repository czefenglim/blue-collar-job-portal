import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface SubscriptionInfo {
  planType: 'FREE' | 'PRO' | 'MAX';
  jobPostLimit: number;
  activeJobPosts: number;
  remainingJobPosts: number;
  canReplyToReviews: boolean;
}

export default function SubscriptionBanner() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null
  );

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/subscription/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription({
          planType: data.data.subscription.planType,
          jobPostLimit: data.data.subscription.jobPostLimit,
          activeJobPosts: data.data.activeJobPosts,
          remainingJobPosts: data.data.remainingJobPosts,
          canReplyToReviews: data.data.subscription.canReplyToReviews,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1E3A8A" />
      </View>
    );
  }

  if (!subscription) return null;

  const getPlanColor = () => {
    switch (subscription.planType) {
      case 'FREE':
        return '#64748B';
      case 'PRO':
        return '#1E3A8A';
      case 'MAX':
        return '#7C3AED';
      default:
        return '#64748B';
    }
  };

  const getPlanIcon = () => {
    switch (subscription.planType) {
      case 'FREE':
        return 'gift';
      case 'PRO':
        return 'star';
      case 'MAX':
        return 'rocket';
      default:
        return 'gift';
    }
  };

  const getPlanName = () => {
    switch (subscription.planType) {
      case 'FREE':
        return t('subscription.freePlan') || 'Free Plan';
      case 'PRO':
        return t('subscription.proPlan') || 'Pro Plan';
      case 'MAX':
        return t('subscription.maxPlan') || 'Max Plan';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getPlanColor() }]}>
      <View style={styles.header}>
        <View style={styles.planInfo}>
          <Ionicons
            name={getPlanIcon() as any}
            size={24}
            color={getPlanColor()}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>
              {t('subscription.yourPlan') || "You're on the"} {getPlanName()}
            </Text>
            <Text style={styles.planDetails}>
              {subscription.jobPostLimit === -1
                ? t('subscription.unlimited') || 'Unlimited job posts'
                : `${subscription.remainingJobPosts} ${
                    t('subscription.remaining') || 'remaining'
                  } ${t('subscription.of') || 'of'} ${
                    subscription.jobPostLimit
                  } ${t('subscription.posts') || 'posts'}`}
              {subscription.planType !== 'FREE' &&
                ` • ${t('subscription.canReply') || 'Can reply to reviews'}`}
            </Text>
          </View>
        </View>

        {subscription.planType !== 'MAX' && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: getPlanColor() }]}
            onPress={() => router.push('/(employer-hidden)/pricing')}
          >
            <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>
              {t('subscription.upgrade') || 'Upgrade'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar (for non-unlimited plans) */}
      {subscription.jobPostLimit !== -1 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (subscription.activeJobPosts / subscription.jobPostLimit) *
                    100
                  }%`,
                  backgroundColor: getPlanColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {subscription.activeJobPosts} / {subscription.jobPostLimit}{' '}
            {t('subscription.used') || 'used'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  planDetails: {
    fontSize: 13,
    color: '#64748B',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },
});
