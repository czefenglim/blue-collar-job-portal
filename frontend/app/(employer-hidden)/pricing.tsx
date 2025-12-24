import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface PlanFeature {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  included: boolean;
}

interface Plan {
  type: 'FREE' | 'PRO' | 'MAX';
  name: string;
  price: number;
  period: string;
  popular?: boolean;
  features: PlanFeature[];
  jobPostLimit: string;
  canReplyToReviews: boolean;
}

export default function PricingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fetchingPlans, setFetchingPlans] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<
    'FREE' | 'PRO' | 'MAX' | null
  >(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(`${URL}/api/subscription/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(`${URL}/api/subscription-plans`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        const mappedPlans: Plan[] = data.data.map((plan: any) => ({
          type: plan.type,
          name: plan.name,
          price: plan.price,
          period: t('pricing.period') || 'per month',
          popular: plan.type === 'PRO',
          jobPostLimit:
            plan.type === 'FREE'
              ? '1'
              : plan.type === 'PRO'
              ? '5'
              : t('pricing.max.unlimited') || 'Unlimited',
          canReplyToReviews: plan.type !== 'FREE',
          features: Array.isArray(plan.features)
            ? plan.features.map((feature: string) => ({
                icon: getFeatureIcon(feature),
                text: feature,
                included: true,
              }))
            : [],
        }));
        setPlans(mappedPlans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      Alert.alert(
        t('common.error'),
        t('pricing.fetchFailed') || 'Failed to load plans'
      );
    } finally {
      setFetchingPlans(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCurrentSubscription();
    fetchPlans();
  }, [fetchCurrentSubscription, fetchPlans]);

  const getFeatureIcon = (text: string): keyof typeof Ionicons.glyphMap => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('job post')) return 'briefcase';
    if (lowerText.includes('reply')) return 'chatbubble';
    if (lowerText.includes('review')) return 'eye';
    if (lowerText.includes('analytics')) return 'stats-chart';
    if (lowerText.includes('support')) return 'people';
    if (lowerText.includes('featured')) return 'rocket';
    return 'checkmark-circle';
  };

  const handleSelectPlan = async (planType: 'FREE' | 'PRO' | 'MAX') => {
    if (planType === 'FREE') {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('jwtToken');
        const response = await fetch(`${URL}/api/subscription/select-free`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          Alert.alert(t('pricing.success'), t('pricing.freeActivated'), [
            {
              text: 'OK',
              onPress: () => router.replace('/(employer)/dashboard'),
            },
          ]);
        } else {
          throw new Error(data.message);
        }
      } catch (error: any) {
        Alert.alert(
          t('common.error'),
          error.message || t('pricing.activationFailed')
        );
      } finally {
        setLoading(false);
      }
    } else {
      // PRO or MAX plan
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('jwtToken');

        // ✅ Get current Expo URL dynamically
        const expoUrl = Constants.expoConfig?.extra?.EXPO_URL;

        console.log('Using Expo URL:', expoUrl);

        const response = await fetch(
          `${URL}/api/subscription/create-checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              planType,
              expoUrl, // ✅ Send expo URL to backend
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data.data.url) {
          // Open Stripe checkout
          await Linking.openURL(data.data.url);
        } else {
          throw new Error(data.message);
        }
      } catch (error: any) {
        console.error('Checkout error:', error);
        Alert.alert(
          t('common.error'),
          error.message || t('pricing.checkoutFailed')
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      t('pricing.cancel.confirmTitle') || 'Cancel Subscription',
      t('pricing.cancel.confirmMessage') ||
        'Are you sure you want to cancel your subscription? You will be downgraded to the Free plan at the end of your billing period.',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm') || 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem('jwtToken');
              const response = await fetch(`${URL}/api/subscription/cancel`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert(
                  t('common.success'),
                  t('pricing.cancel.success') ||
                    'Subscription cancelled successfully.'
                );
                fetchCurrentSubscription(); // Refresh
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              Alert.alert(
                t('common.error'),
                error.message || 'Failed to cancel subscription.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderPlanCard = (plan: Plan) => {
    // ✅ Check if this is the current ACTIVE plan (not PENDING)
    const isCurrentPlan =
      currentSubscription?.subscription?.planType === plan.type &&
      currentSubscription?.subscription?.status === 'ACTIVE';

    // ✅ Show as pending if status is PENDING
    const isPendingPlan =
      currentSubscription?.subscription?.planType === plan.type &&
      currentSubscription?.subscription?.status === 'INACTIVE';

    return (
      <View
        key={plan.type}
        style={[
          styles.planCard,
          plan.popular && styles.planCardPopular,
          isCurrentPlan && styles.planCardCurrent,
        ]}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>
              {t('pricing.popular') || 'Most Popular'}
            </Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currency}>RM</Text>
            <Text style={styles.price}>{plan.price}</Text>
          </View>
          <Text style={styles.period}>{plan.period}</Text>
        </View>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="briefcase" size={20} color="#1E3A8A" />
            <Text style={styles.featureText}>
              {plan.jobPostLimit}{' '}
              {plan.jobPostLimit === 'Unlimited'
                ? t('pricing.jobPosts') || 'job posts'
                : plan.jobPostLimit === '1'
                ? t('pricing.jobPost') || 'job post'
                : t('pricing.jobPosts') || 'job posts'}
            </Text>
          </View>

          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons
                name={feature.included ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={feature.included ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.featureText,
                  !feature.included && styles.featureTextDisabled,
                ]}
              >
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            plan.popular && styles.selectButtonPopular,
            isCurrentPlan && styles.selectButtonCurrent,
            loading && selectedPlan === plan.type && styles.selectButtonLoading,
          ]}
          onPress={() => {
            setSelectedPlan(plan.type);
            handleSelectPlan(plan.type);
          }}
          disabled={loading || isCurrentPlan} // ✅ Only disable if ACTIVE, not PENDING
        >
          {loading && selectedPlan === plan.type ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text
              style={[
                styles.selectButtonText,
                plan.popular && styles.selectButtonTextPopular,
              ]}
            >
              {isCurrentPlan
                ? t('pricing.currentPlan') || 'Current Plan'
                : isPendingPlan
                ? t('pricing.selectPlan') || 'Select Plan' // ✅ Allow selection even if pending
                : t('pricing.selectPlan') || 'Select Plan'}
            </Text>
          )}
        </TouchableOpacity>

        {isCurrentPlan && plan.price > 0 && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>
              {t('pricing.cancelSubscription') || 'Cancel Subscription'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (fetchingPlans) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
        edges={['bottom', 'left', 'right']}
      >
        <ActivityIndicator size="large" color="#1E3A8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('pricing.title') || 'Choose Your Plan'}
          </Text>
          <Text style={styles.subtitle}>
            {t('pricing.subtitle') ||
              'Select the plan that best fits your hiring needs'}
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>{plans.map(renderPlanCard)}</View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('pricing.footerText') ||
              'All plans include access to our job seeker database and application management tools.'}
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  plansContainer: {
    gap: 20,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#1E3A8A',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  planCardCurrent: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 8,
    marginRight: 4,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  period: {
    fontSize: 14,
    color: '#64748B',
  },
  featureList: {
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  featureTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  selectButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonPopular: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  selectButtonCurrent: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  selectButtonLoading: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  selectButtonTextPopular: {
    color: '#1E3A8A',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444', // Red color
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
