import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import VoiceTextInput from '@/components/VoiceTextInput';
import { LinearGradient } from 'expo-linear-gradient';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Company {
  id: number;
  name: string;
  logo: string | null;
  city: string;
  state: string;
  industry: {
    id: number;
    name: string;
  };
  averageRating: number;
  totalReviews: number;
  description?: string;
  companySize?: string;
}

// Color palette
const PRIMARY_BLUE = '#1E40AF';
const ACCENT_ORANGE = '#F59E0B';
const ACCENT_PURPLE = '#8B5CF6';
const LIGHT_BACKGROUND = '#F8FAFC';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const TEXT_TERTIARY = '#94A3B8';
const BORDER_COLOR = '#E2E8F0';

export default function CompaniesScreen() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(
        `${URL}/api/companies?limit=50&lang=${currentLanguage}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const renderStars = (rating: number, size: number = 14) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={
            i <= rating
              ? 'star'
              : i <= Math.floor(rating)
              ? 'star-half'
              : 'star-outline'
          }
          size={size}
          color={ACCENT_ORANGE}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCompany = ({ item, index }: { item: Company; index: number }) => (
    <TouchableOpacity
      style={[
        styles.companyCard,
        index % 2 === 0 ? styles.evenCard : styles.oddCard,
      ]}
      onPress={() => router.push(`/(user-hidden)/companies/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {/* Company Logo with Gradient Border */}
      <View style={styles.companyLogoContainer}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.companyLogo} />
        ) : (
          <LinearGradient
            colors={[PRIMARY_BLUE, '#3730A3']}
            style={styles.companyLogoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.companyLogoText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Company Information */}
      <View style={styles.companyInfo}>
        <Text style={styles.companyName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Industry Badge - Moved here */}
        <View style={styles.industryWrapper}>
          <Text style={styles.industryText} numberOfLines={1}>
            {item.industry.name}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.companyLocation}>
            {item.city}, {item.state}
          </Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          {item.totalReviews > 0 ? (
            <>
              <View style={styles.ratingRow}>
                {renderStars(item.averageRating, 14)}
                <View style={styles.ratingNumbers}>
                  <Text style={styles.ratingValue}>
                    {item.averageRating.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({item.totalReviews} {t('companies.reviews')})
                  </Text>
                </View>
              </View>
              <View style={styles.ratingBar}>
                <LinearGradient
                  colors={['#F59E0B', '#FBBF24']}
                  style={[
                    styles.ratingFill,
                    { width: `${(item.averageRating / 5) * 100}%` },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </>
          ) : (
            <View style={styles.noRatingContainer}>
              <Ionicons name="star-outline" size={16} color={TEXT_TERTIARY} />
              <Text style={styles.noReviews}>{t('companies.noReviews')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* View Button */}
      <View style={styles.viewButton}>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>{t('companies.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="business" size={28} color={PRIMARY_BLUE} />
            <Text style={styles.headerTitle}>{t('companies.title')}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {t('companies.subtitle') || 'Discover top companies'}
          </Text>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color={PRIMARY_BLUE} />
          </View>
          <VoiceTextInput
            style={styles.voiceInputContainer}
            inputStyle={styles.voiceInput}
            placeholder={t('companies.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            language={
              currentLanguage === 'zh'
                ? 'zh-CN'
                : currentLanguage === 'ms'
                ? 'ms-MY'
                : currentLanguage === 'ta'
                ? 'ta-IN'
                : 'en-US'
            }
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color={TEXT_TERTIARY} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Ionicons name="filter" size={16} color={PRIMARY_BLUE} />
            <Text style={styles.searchResultsText}>
              {filteredCompanies.length} {t('companies.searchResults')}
            </Text>
          </View>
        )}
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <View style={styles.resultsTitleContainer}>
          <Ionicons name="business-outline" size={20} color={PRIMARY_BLUE} />
          <Text style={styles.resultsTitle}>
            {t('companies.featuredCompanies')}
          </Text>
        </View>
        <View style={styles.resultsCount}>
          <Ionicons name="briefcase" size={14} color="#FFFFFF" />
          <Text style={styles.resultsCountText}>
            {filteredCompanies.length}
          </Text>
        </View>
      </View>

      {/* Companies List */}
      <FlatList
        data={filteredCompanies}
        renderItem={renderCompany}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_BLUE}
            colors={[PRIMARY_BLUE]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="business-outline"
                size={80}
                color={BORDER_COLOR}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? t('companies.noSearchResults')
                : t('companies.emptyTitle') || 'No Companies Found'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? t('companies.emptySearchDescription')
                : t('companies.emptyDescription') ||
                  'Check back later for new company listings'}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.clearSearchButtonText}>
                  {t('companies.clearSearch') || 'Clear Search'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: CARD_BACKGROUND,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Search Section
  searchSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  voiceInputContainer: {
    flex: 1,
  },
  voiceInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_PRIMARY,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  searchResultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  resultsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  resultsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  resultsCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // List Container
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  // Company Card
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  evenCard: {
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_BLUE,
  },
  oddCard: {
    borderLeftWidth: 4,
    borderLeftColor: ACCENT_PURPLE,
  },
  companyLogoContainer: {
    position: 'relative',
    marginRight: 16,
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    resizeMode: 'cover',
  },
  companyLogoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Industry Badge Styles - Updated
  industryWrapper: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  industryText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  companyInfo: {
    flex: 1,
    marginRight: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  companyLocation: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  ratingSection: {
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  reviewCount: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  ratingBar: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: 2,
  },
  noRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noReviews: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: CARD_BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  clearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  clearSearchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
