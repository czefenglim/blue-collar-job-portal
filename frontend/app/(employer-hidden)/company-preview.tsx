import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
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

export default function CompanyPreviewScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userData || '{}');

      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      // Get employer's company
      const companyResponse = await fetch(`${URL}/api/employer/company`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const employerCompany = companyData.data;

        // Get company details with review stats
        const detailsResponse = await fetch(
          `${URL}/api/companies/${employerCompany.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          setCompany(detailsData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanyData();
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('companies.preview.title')}</Text>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>
            {t('companies.preview.badge')}
          </Text>
        </View>
      </View>

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

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#1E3A8A" />
          <Text style={styles.infoBannerText}>
            {t('companies.preview.infoBanner')}
          </Text>
        </View>

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

        {/* Reviews List (Read-only) */}
        <ReviewsList companyId={company.id} />

        <View style={{ height: 30 }} />
      </ScrollView>
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
    flex: 1,
    textAlign: 'center',
  },
  previewBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
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
