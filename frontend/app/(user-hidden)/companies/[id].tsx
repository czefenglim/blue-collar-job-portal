import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import WriteReviewModal from '@/components/WriteReviewModal';
import ReviewsList from '@/components/ReviewsList';
import { useLanguage } from '@/contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Company {
  id: number;
  name: string;
  logo: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  state: string;
  industry: {
    id: number;
    name: string;
  };
  averageRating: number;
  totalReviews: number;
}

export default function CompanyProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { t, currentLanguage } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState<any>(null);
  const [reviewsKey, setReviewsKey] = useState(0);

  const fetchCompanyData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(
        `${URL}/api/companies/${id}?lang=${currentLanguage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCompany(data.data);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentLanguage, router]);

  const checkUserReview = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      const response = await fetch(
        `${URL}/api/reviews/companies/${id}/my-review`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserReview(data.data);
      }
    } catch (error) {
      console.error('Error checking user review:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchCompanyData();
    checkUserReview();
  }, [fetchCompanyData, checkUserReview]);

  const handleReviewSubmitted = () => {
    setShowReviewModal(false);
    fetchCompanyData();
    checkUserReview();
    setReviewsKey((prev) => prev + 1); // Force reviews list to refresh
  };

  const handleEditReview = () => {
    setShowReviewModal(true);
  };

  const handleDeleteReview = () => {
    Alert.alert(
      t('companies.detail.deleteReviewTitle'),
      t('companies.detail.deleteReviewConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');
              const response = await fetch(
                `${URL}/api/reviews/${userReview.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (response.ok) {
                Alert.alert(
                  t('common.success'),
                  t('companies.detail.successReviewDeleted')
                );
                setUserReview(null);
                fetchCompanyData();
                setReviewsKey((prev) => prev + 1);
              }
            } catch (_error) {
              Alert.alert(
                t('common.error'),
                t('companies.detail.errorReviewDeleteFailed')
              );
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanyData();
    checkUserReview();
    setReviewsKey((prev) => prev + 1);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={20}
          color="#F59E0B"
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('companies.detail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Company Header */}
        <View style={styles.companyHeader}>
          {company.logo ? (
            <Image source={{ uri: company.logo }} style={styles.companyLogo} />
          ) : (
            <View style={styles.companyLogoPlaceholder}>
              <Text style={styles.companyLogoText}>
                {company.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyIndustry}>{company.industry.name}</Text>
          <Text style={styles.companyLocation}>
            📍 {company.city}, {company.state}
          </Text>
        </View>

        {/* Rating Summary */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingSummaryLeft}>
            <Text style={styles.ratingNumber}>
              {company.averageRating.toFixed(1)}
            </Text>
            {renderStars(company.averageRating)}
            <Text style={styles.totalReviews}>
              {t('companies.detail.basedOnReviews', {
                count: company.totalReviews,
              })}
            </Text>
          </View>
        </View>

        {/* User's Review Status */}
        {userReview ? (
          <View style={styles.userReviewCard}>
            <View style={styles.userReviewHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.userReviewTitle}>
                {t('companies.detail.yourReview')}
              </Text>
            </View>
            <View style={styles.userReviewContent}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= userReview.rating ? 'star' : 'star-outline'}
                    size={16}
                    color="#F59E0B"
                  />
                ))}
              </View>
              {userReview.title && (
                <Text style={styles.userReviewTitleText}>
                  {userReview.title}
                </Text>
              )}
              {userReview.comment && (
                <Text style={styles.userReviewComment}>
                  {userReview.comment}
                </Text>
              )}
            </View>
            <View style={styles.userReviewActions}>
              <TouchableOpacity
                style={styles.userReviewActionButton}
                onPress={handleEditReview}
              >
                <Ionicons name="create-outline" size={18} color="#1E3A8A" />
                <Text style={styles.userReviewActionText}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.userReviewActionButton}
                onPress={handleDeleteReview}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text
                  style={[styles.userReviewActionText, { color: '#EF4444' }]}
                >
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => setShowReviewModal(true)}
          >
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <Text style={styles.writeReviewButtonText}>
              {t('companies.detail.writeReview')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Company Details */}
        {company.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('companies.detail.about')}
            </Text>
            <Text style={styles.companyDescription}>{company.description}</Text>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('companies.detail.contactInformation')}
          </Text>
          {company.website && (
            <View style={styles.contactRow}>
              <Ionicons name="globe-outline" size={18} color="#64748B" />
              <Text style={styles.contactText}>{company.website}</Text>
            </View>
          )}
          {company.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={18} color="#64748B" />
              <Text style={styles.contactText}>{company.email}</Text>
            </View>
          )}
          {company.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={18} color="#64748B" />
              <Text style={styles.contactText}>{company.phone}</Text>
            </View>
          )}
        </View>

        {/* Reviews List */}
        <ReviewsList key={reviewsKey} companyId={parseInt(id)} />

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Write Review Modal */}
      <WriteReviewModal
        visible={showReviewModal}
        companyId={parseInt(id)}
        companyName={company.name}
        existingReview={userReview}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReviewSubmitted}
      />
    </SafeAreaView>
  );
}

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollView: {
    flex: 1,
  },
  companyHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  companyLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  companyLogoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  companyIndustry: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  companyLocation: {
    fontSize: 14,
    color: '#64748B',
  },
  ratingSummaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingSummaryLeft: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: '#64748B',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  writeReviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userReviewCard: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  userReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  userReviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  userReviewContent: {
    marginBottom: 12,
  },
  userReviewTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  userReviewComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  userReviewActions: {
    flexDirection: 'row',
    gap: 16,
  },
  userReviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userReviewActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  companyDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#475569',
  },
});
