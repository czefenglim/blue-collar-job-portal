import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/utils/pushNotifications';
import VoiceTextInput from '@/components/VoiceTextInput';

// --- Theme/Style Constants ---
const PRIMARY_BLUE = '#0D47A1';
const ACCENT_ORANGE = '#FF9800';
const GRAY_TEXT = '#455A64';
const LIGHT_BACKGROUND = '#F5F5F5';
const CARD_BACKGROUND = '#FFFFFF';
const BORDER_COLOR = '#E0E0E0';

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const SPACING = 16;

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Job {
  id: number;
  title: string;
  slug: string;
  company: {
    name: string;
    logo?: string;
  };
  city: string;
  state: string;
  jobType: string;
  workingHours: string;
  experienceLevel: string;
  jobTypeLabel: string;
  workingHoursLabel: string;
  experienceLevelLabel: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  createdAt: string;
  isSaved?: boolean;
  industry: Industry;
}

interface Industry {
  id: number;
  name: string;
  slug: string;
}

interface UserPreferences {
  industries: Array<{ id: number; name: string }>;
  preferredLocation?: string;
}

const HomeScreen: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [token, setToken] = useState<string>('');
  const [hasLoadedLocation, setHasLoadedLocation] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const isFocused = useIsFocused();

  const router = useRouter();
  const { t, currentLanguage } = useLanguage();

  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = React.useRef<any>(null);
  const responseListener = React.useRef<any>(null);

  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // --- Data Fetching Hooks ---

  useEffect(() => {
    fetchUserCoordinates();
  }, [token]);

  useEffect(() => {
    if (isFocused && token) {
      console.log('🌐 Language changed, refetching data...');
      fetchUserPreferences(token);
      fetchJobs(token);
    }
  }, [currentLanguage, isFocused, token]);

  useEffect(() => {
    registerForPushNotificationsAsync();
    loadUnreadCount();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        loadUnreadCount();
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data;

        if (data.actionUrl) {
          router.push(data.actionUrl as any);
        }
      });

    return () => {
      if (notificationListener.current?.remove) {
        notificationListener.current.remove();
      }
      if (responseListener.current?.remove) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (token && distanceFilter !== undefined) {
      console.log(
        '🔄 Distance filter changed, refetching jobs with:',
        distanceFilter
      );
      if (distanceFilter === null || userCoordinates) {
        fetchJobs(token);
      }
    }
  }, [distanceFilter, token, userCoordinates]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isFocused && token) {
      fetchUserPreferences(token);
    }
  }, [isFocused, token]);

  useEffect(() => {
    applyFilters();
  }, [searchKeyword, locationFilter, jobs, userPreferences, showAllJobs]);

  // --- Data Loading Functions ---

  const loadUnreadCount = async () => {
    try {
      const userToken = await AsyncStorage.getItem('jwtToken');
      if (!userToken) return;

      const response = await fetch(`${URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.data.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert(t('home.authRequired'), t('home.signInToContinue'), [
          { text: t('common.ok'), onPress: () => router.replace('/') },
        ]);
        return;
      }

      setToken(userToken);

      const sessionLocation = await AsyncStorage.getItem(
        'sessionLocationFilter'
      );
      if (sessionLocation) {
        setLocationFilter(sessionLocation);
        setHasLoadedLocation(true);
      }

      await fetchUserCoordinates(userToken);

      await Promise.all([
        fetchUserPreferences(userToken),
        fetchJobs(userToken),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert(t('common.error'), t('home.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPreferences = async (userToken: string) => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';

      const response = await fetch(
        `${URL}/api/users/getPreferences?lang=${lang}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.data);

        if (!hasLoadedLocation && data.data.preferredLocation) {
          setLocationFilter(data.data.preferredLocation);
          await AsyncStorage.setItem(
            'sessionLocationFilter',
            data.data.preferredLocation
          );
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchUserCoordinates = async (userToken?: string) => {
    try {
      const activeToken = userToken || token;
      if (!activeToken) return;

      const response = await fetch(`${URL}/api/users/location`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.latitude && data.data.longitude) {
          setUserCoordinates({
            latitude: data.data.latitude,
            longitude: data.data.longitude,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user coordinates:', error);
    }
  };

  const fetchJobs = async (userToken: string) => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';

      let url = `${URL}/api/jobs?lang=${lang}`;

      if (distanceFilter !== null && userCoordinates) {
        url += `&distance=${distanceFilter}&userLat=${userCoordinates.latitude}&userLon=${userCoordinates.longitude}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert(t('common.error'), t('home.jobsLoadError'));
    }
  };

  // --- Filtering and Actions ---

  const clearFilters = () => {
    setSearchKeyword('');
    const preferredLoc = userPreferences?.preferredLocation || '';
    setLocationFilter(preferredLoc);
    setShowAllJobs(false);
    setDistanceFilter(null);
    AsyncStorage.setItem('sessionLocationFilter', preferredLoc);
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    if (searchKeyword.trim()) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          job.company.name.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    if (
      !showAllJobs &&
      userPreferences?.industries &&
      userPreferences.industries.length > 0
    ) {
      const preferredIndustryIds = userPreferences.industries.map(
        (ind) => ind.id
      );
      filtered = filtered.filter((job) =>
        preferredIndustryIds.includes(job.industry?.id)
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchUserPreferences(token);
    await fetchJobs(token);
    setIsRefreshing(false);
  }, [token]);

  const handleLocationChange = (text: string) => {
    setLocationFilter(text);
    AsyncStorage.setItem('sessionLocationFilter', text);
  };

  const toggleSaveJob = async (jobId: number) => {
    try {
      const response = await fetch(`${URL}/api/jobs/${jobId}/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.id === jobId ? { ...job, isSaved: data.data.isSaved } : job
          )
        );
      } else {
        Alert.alert(t('common.error'), t('home.saveJobFailed'));
      }
    } catch (error) {
      console.error('Error toggling save job:', error);
      Alert.alert(t('common.error'), t('home.saveJobFailed'));
    }
  };

  const handleReport = (jobId: number, jobTitle: string) => {
    router.push({
      pathname: '/(user-hidden)/report-job',
      params: { jobId: jobId.toString(), jobTitle },
    });
  };

  const showJobOptions = (item: Job) => {
    Alert.alert(t('home.options'), t('home.selectAction'), [
      {
        text: t('home.viewDetails'),
        onPress: () =>
          router.push({
            pathname: '/JobDetailsScreen/[slug]',
            params: { slug: item.slug },
          }),
      },
      {
        text: item.isSaved ? t('home.unsave') : t('home.save'),
        onPress: () => toggleSaveJob(item.id),
      },
      {
        text: t('home.reportJob'),
        onPress: () => handleReport(item.id, item.title),
        style: 'destructive',
      },
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
    ]);
  };

  const formatSalary = (min?: number, max?: number, type?: string) => {
    if (!min && !max) return t('home.notSpecified');

    const formatAmount = (amount: number) => {
      return `RM ${amount.toLocaleString(
        currentLanguage === 'ms' ? 'ms-MY' : 'en-US'
      )}`;
    };

    const typeLabel = type ? t(`salaryTypes.${type.toLowerCase()}`) : '';

    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? ` / ${typeLabel}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${type ? ` / ${typeLabel}` : ''}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days === 1) return t('home.today');
    if (days === 2) return t('home.yesterday');
    if (days <= 7) return t('home.daysAgo', { count: days });
    if (days <= 30) return t('home.weeksAgo', { count: Math.floor(days / 7) });
    return t('home.monthsAgo', { count: Math.floor(days / 30) });
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() =>
          router.push({
            pathname: '/JobDetailsScreen/[slug]',
            params: { slug: item.slug },
          })
        }
        activeOpacity={0.9}
      >
        {/* Top Row: Company Logo + Title + Save Button */}
        <View style={styles.jobCardHeader}>
          <View style={styles.companyLogoContainer}>
            {item.company.logo ? (
              <Image
                source={{ uri: item.company.logo }}
                style={styles.companyLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Text style={styles.companyLogoText}>
                  {item.company.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.jobTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleSaveJob(item.id);
                }}
                style={styles.saveButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={PRIMARY_BLUE}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.companyName}>{item.company.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.city}, {item.state}
              </Text>
              <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Salary Row - Changed to blue theme */}
        <View style={styles.salaryContainer}>
          <Ionicons name="cash-outline" size={20} color={PRIMARY_BLUE} />
          <Text style={styles.salaryText}>
            {formatSalary(item.salaryMin, item.salaryMax, item.salaryType)}
          </Text>
        </View>

        {/* Job Details Grid */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="time-outline" size={16} color={PRIMARY_BLUE} />
            </View>
            <Text style={styles.detailLabel}>{t('home.jobType')}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.jobTypeLabel}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons
                name="business-outline"
                size={16}
                color={PRIMARY_BLUE}
              />
            </View>
            <Text style={styles.detailLabel}>{t('home.workingHours')}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.workingHoursLabel}
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons
                name="trending-up-outline"
                size={16}
                color={PRIMARY_BLUE}
              />
            </View>
            <Text style={styles.detailLabel}>{t('home.experienceLevel')}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.experienceLevelLabel}
            </Text>
          </View>
        </View>

        {/* Bottom Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() =>
              router.push({
                pathname: '/JobDetailsScreen/[slug]',
                params: { slug: item.slug },
              })
            }
          >
            <Text style={styles.viewDetailsText}>{t('home.viewDetails')}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              showJobOptions(item);
            }}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={GRAY_TEXT} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BLUE} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('home.title')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              router.push('/(user-hidden)/notifications');
              setUnreadCount(0);
            }}
          >
            <Ionicons
              name="notifications-outline"
              size={26}
              color={PRIMARY_BLUE}
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push('/ProfileScreen')}
          >
            <Ionicons name="menu" size={28} color={PRIMARY_BLUE} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Job Preferences Section */}
            {userPreferences &&
              userPreferences.industries &&
              userPreferences.industries.length > 0 && (
                <View style={styles.preferencesSection}>
                  <View style={styles.preferenceHeader}>
                    <View style={styles.preferenceTitleRow}>
                      <Ionicons
                        name="briefcase-outline"
                        size={20}
                        color={ACCENT_ORANGE}
                      />
                      <Text style={styles.preferenceTitle}>
                        {t('home.jobPreferences')}
                      </Text>
                      <View style={styles.filterStatusBadge}>
                        <Ionicons
                          name={showAllJobs ? 'globe-outline' : 'funnel'}
                          size={14}
                          color={PRIMARY_BLUE}
                        />
                        <Text style={styles.filterStatusText}>
                          {showAllJobs ? t('home.allJobs') : t('home.filtered')}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push('/PreferencesScreen')}
                      style={styles.editButton}
                    >
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color={PRIMARY_BLUE}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.preferenceTags}>
                    <Text style={styles.preferenceLabel}>
                      {t('home.industry')}:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagsScrollContent}
                    >
                      {userPreferences.industries.map((industry, index) => (
                        <View
                          key={industry.id}
                          style={[
                            styles.preferenceTag,
                            showAllJobs && styles.preferenceTagInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.preferenceTagText,
                              showAllJobs && styles.preferenceTagTextInactive,
                            ]}
                          >
                            {industry.name}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.viewAllJobsButton,
                      showAllJobs && styles.viewAllJobsButtonActive,
                    ]}
                    onPress={() => setShowAllJobs(!showAllJobs)}
                  >
                    <Ionicons
                      name={showAllJobs ? 'funnel' : 'globe-outline'}
                      size={20}
                      color={showAllJobs ? PRIMARY_BLUE : '#FFFFFF'}
                    />
                    <Text
                      style={[
                        styles.viewAllJobsButtonText,
                        showAllJobs && styles.viewAllJobsButtonTextActive,
                      ]}
                    >
                      {showAllJobs
                        ? t('home.showFilteredJobs')
                        : t('home.viewAllJobs')}
                    </Text>
                  </TouchableOpacity>

                  {!showAllJobs && (
                    <View style={styles.infoTextContainer}>
                      <Ionicons
                        name="information-circle"
                        size={14}
                        color={GRAY_TEXT}
                      />
                      <Text style={styles.infoText}>
                        {t('home.filterActive')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

            {/* Search & Filter Section */}
            <View style={styles.filterSection}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={GRAY_TEXT}
                  style={styles.searchIcon}
                />
                <VoiceTextInput
                  style={styles.voiceInputContainer}
                  inputStyle={styles.voiceInput}
                  placeholder={t('home.searchPlaceholder')}
                  value={searchKeyword}
                  onChangeText={setSearchKeyword}
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
                {searchKeyword.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setSearchKeyword('')}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={BORDER_COLOR}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Distance Filter Section */}
              {userCoordinates && (
                <View style={styles.distanceFilterSection}>
                  <View style={styles.distanceFilterHeader}>
                    <Ionicons name="map-outline" size={16} color={GRAY_TEXT} />
                    <Text style={styles.filterLabel}>
                      {t('home.distanceFilter')}
                    </Text>
                  </View>
                  <View style={styles.distanceChipsContainer}>
                    {[null, 5, 10, 20, 50].map((distance) => (
                      <TouchableOpacity
                        key={distance === null ? 'all' : distance}
                        style={[
                          styles.distanceChip,
                          distanceFilter === distance &&
                            styles.distanceChipActive,
                        ]}
                        onPress={() => setDistanceFilter(distance)}
                      >
                        <Text
                          style={[
                            styles.distanceChipText,
                            distanceFilter === distance &&
                              styles.distanceChipTextActive,
                          ]}
                        >
                          {distance === null ? t('home.all') : `${distance}km`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Change Location Button - Moved below distance filter */}
              <TouchableOpacity
                style={styles.changeLocationButton}
                onPress={() => router.push('/(user-hidden)/update-location')}
              >
                <Ionicons
                  name="locate-outline"
                  size={18}
                  color={PRIMARY_BLUE}
                />
                <Text style={styles.changeLocationText}>
                  {t('home.changeLocation')}
                </Text>
              </TouchableOpacity>

              {/* Clear Filters Button */}
              {(searchKeyword ||
                locationFilter ||
                showAllJobs ||
                distanceFilter !== null) && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={clearFilters}
                >
                  <Ionicons
                    name="refresh-circle-outline"
                    size={18}
                    color={PRIMARY_BLUE}
                  />
                  <Text style={styles.clearFiltersText}>
                    {t('home.clearFilters')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {t('home.jobsFound', { count: filteredJobs.length })}
              </Text>
              {!showAllJobs &&
                userPreferences?.industries &&
                userPreferences.industries.length > 0 && (
                  <Text style={styles.resultsSubtext}>
                    {t('home.filteredResultsByPref')}
                  </Text>
                )}
            </View>
          </>
        }
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.jobList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_BLUE}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color={BORDER_COLOR} />
            <Text style={styles.emptyText}>{t('home.noJobs')}</Text>
            <Text style={styles.emptySubtext}>{t('home.adjustFilters')}</Text>
            {!showAllJobs &&
              userPreferences?.industries &&
              userPreferences.industries.length > 0 && (
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => setShowAllJobs(true)}
                >
                  <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyActionButtonText}>
                    {t('home.viewAllJobs')}
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

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
    color: GRAY_TEXT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING,
    paddingVertical: SPACING,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: PRIMARY_BLUE,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: CARD_BACKGROUND,
    zIndex: 1,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Job Preferences Section
  preferencesSection: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: SPACING,
    marginTop: SPACING,
    padding: SPACING,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_BLUE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  preferenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY_BLUE,
    flex: 1,
  },
  filterStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  filterStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  editButton: {
    padding: 4,
  },
  preferenceTags: {
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 14,
    color: GRAY_TEXT,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: SPACING,
  },
  preferenceTag: {
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  preferenceTagInactive: {
    backgroundColor: BORDER_COLOR,
  },
  preferenceTagText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  preferenceTagTextInactive: {
    color: GRAY_TEXT,
  },
  viewAllJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  viewAllJobsButtonActive: {
    backgroundColor: LIGHT_BACKGROUND,
    borderWidth: 1.5,
    borderColor: PRIMARY_BLUE,
  },
  viewAllJobsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllJobsButtonTextActive: {
    color: PRIMARY_BLUE,
  },
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  infoText: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontStyle: 'italic',
  },

  // Filter & Search Section
  filterSection: {
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: SPACING,
    marginTop: SPACING,
    padding: SPACING,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  voiceInputContainer: {
    flex: 1,
  },
  voiceInput: {
    flex: 1,
    fontSize: 16,
    color: GRAY_TEXT,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Distance Filter Section
  distanceFilterSection: {
    marginBottom: 16,
  },
  distanceFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAY_TEXT,
  },
  distanceChipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceChip: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  distanceChipActive: {
    backgroundColor: PRIMARY_BLUE,
    borderColor: PRIMARY_BLUE,
  },
  distanceChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  distanceChipTextActive: {
    color: '#FFFFFF',
  },

  // Change Location Button
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIGHT_BACKGROUND,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PRIMARY_BLUE,
    gap: 8,
    marginBottom: 8,
  },
  changeLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },

  // Clear Filters Button
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  clearFiltersText: {
    fontSize: 14,
    color: PRIMARY_BLUE,
    fontWeight: '600',
  },

  // Results Header
  resultsHeader: {
    paddingHorizontal: SPACING,
    paddingVertical: SPACING,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  resultsSubtext: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Job List
  jobList: {
    paddingHorizontal: SPACING,
    paddingBottom: 20,
  },

  // Job Card - Enhanced with better spacing
  jobCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    marginBottom: SPACING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTouchable: {
    padding: 0,
  },
  jobCardHeader: {
    flexDirection: 'row',
    padding: CARD_PADDING,
    paddingBottom: 12,
  },
  companyLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogo: {
    width: '100%', // Changed from '85%' to fill container
    height: '100%', // Changed from '85%' to fill container
    borderRadius: 14, // Added borderRadius to match container
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  saveButton: {
    padding: 4,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY_BLUE,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  locationText: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: '500',
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  // Salary Section - Changed to blue theme
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE', // Brighter blue background
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  salaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY_BLUE, // Changed from orange to primary blue
    flex: 1,
  },

  // Details Grid
  detailsContainer: {
    flexDirection: 'row',
    padding: CARD_PADDING,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },
  detailDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: PRIMARY_BLUE,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginRight: 12,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty List
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: GRAY_TEXT,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: GRAY_TEXT,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  emptyActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
