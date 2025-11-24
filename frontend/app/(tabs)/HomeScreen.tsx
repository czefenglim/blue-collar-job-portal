import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/utils/pushNotifications';

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
    // Register for push notifications
    registerForPushNotificationsAsync();

    // Load unread count
    loadUnreadCount();

    // Listen for notifications
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        loadUnreadCount();
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data;

        // Navigate based on notification data
        if (data.actionUrl) {
          router.push(data.actionUrl as any);
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Add this useEffect after line 130 (after the other useEffects)
  useEffect(() => {
    if (token && distanceFilter !== undefined) {
      console.log(
        '🔄 Distance filter changed, refetching jobs with:',
        distanceFilter
      );
      fetchJobs(token);
    }
  }, [distanceFilter, token]); // Watch for distanceFilter changes

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

  // const fetchJobs = async (userToken: string) => {
  //   try {
  //     const storedLang = await AsyncStorage.getItem('preferredLanguage');
  //     const lang = storedLang || 'en';

  //     const response = await fetch(`${URL}/api/jobs?lang=${lang}`, {
  //       headers: { Authorization: `Bearer ${userToken}` },
  //     });
  //     if (response.ok) {
  //       const data = await response.json();
  //       setJobs(data.data);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching jobs:', error);
  //     Alert.alert(t('common.error'), t('home.jobsLoadError'));
  //   }
  // };

  const fetchUserCoordinates = async () => {
    try {
      if (!token) return;

      const response = await fetch(`${URL}/api/users/location`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.latitude && data.data.longitude) {
          setUserCoordinates({
            latitude: data.data.latitude,
            longitude: data.data.longitude,
          });
          console.log(
            'User coordinates are:',
            data.data.latitude,
            data.data.longitude
          );
        }
      }
    } catch (error) {
      console.error('Error fetching user coordinates:', error);
    }
  };

  // Update fetchJobs function
  const fetchJobs = async (userToken: string) => {
    try {
      const storedLang = await AsyncStorage.getItem('preferredLanguage');
      const lang = storedLang || 'en';

      let url = `${URL}/api/jobs?lang=${lang}`;

      // Add distance filter if available
      if (distanceFilter && userCoordinates) {
        url += `&distance=${distanceFilter}&userLat=${userCoordinates.latitude}&userLon=${userCoordinates.longitude}`;
      }

      console.log('Distance filter:', distanceFilter);
      console.log('User coordinates:', userCoordinates);

      console.log('Fetching jobs with URL:', url);

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

  // Update the clearFilters function
  const clearFilters = () => {
    setSearchKeyword('');
    const preferredLoc = userPreferences?.preferredLocation || '';
    setLocationFilter(preferredLoc);
    setShowAllJobs(false);
    setDistanceFilter(null); // ADD THIS
    AsyncStorage.setItem('sessionLocationFilter', preferredLoc);
  };

  // const clearFilters = () => {
  //     setSearchKeyword('');
  //     const preferredLoc = userPreferences?.preferredLocation || '';
  //     setLocationFilter(preferredLoc);
  //     setShowAllJobs(false);
  //     AsyncStorage.setItem('sessionLocationFilter', preferredLoc);
  //   };
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
      }
    } catch (error) {
      console.error('Error toggling save job:', error);
      Alert.alert('Error', 'Failed to save job. Please try again.');
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
    if (!min && !max) return 'Not Specified';

    const formatAmount = (amount: number) => {
      return `RM ${amount.toLocaleString()}`;
    };

    if (min && max) {
      return `${formatAmount(min)} - ${formatAmount(max)}${
        type ? `/${type.toLowerCase()}` : ''
      }`;
    }
    return `${formatAmount(min || max!)}${
      type ? `/${type.toLowerCase()}` : ''
    }`;
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

  const formatJobType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatWorkingHours = (hours: string) => {
    return hours
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
        activeOpacity={0.7}
      >
        <View style={styles.jobCardHeader}>
          <View style={styles.companyLogoContainer}>
            {item.company.logo ? (
              <Image
                source={{ uri: item.company.logo }}
                style={styles.companyLogo}
              />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Text style={styles.companyLogoText}>
                  {item.company.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.jobHeaderInfo}>
            <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                toggleSaveJob(item.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.saveButton}
            >
              <Ionicons
                name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color="#1E3A8A"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                showJobOptions(item);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.moreButton}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.jobMetaContainer}>
          <View style={styles.jobMetaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatJobType(item.jobType)}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {formatWorkingHours(item.workingHours)}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.experienceLevel.replace('_', ' ')}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.companyName}>{item.company.name}</Text>
        <Text style={styles.location}>
          📍 {item.city}, {item.state}
        </Text>
        <Text style={styles.salary}>
          💰 {formatSalary(item.salaryMin, item.salaryMax, item.salaryType)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <Ionicons name="notifications-outline" size={28} color="#1E3A8A" />
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
            <Ionicons name="menu" size={28} color="#1E3A8A" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {userPreferences &&
              userPreferences.industries &&
              userPreferences.industries.length > 0 && (
                <View style={styles.preferencesSection}>
                  {/* Filter Status Badge */}
                  <View style={styles.filterStatusBadge}>
                    <Ionicons
                      name={showAllJobs ? 'globe-outline' : 'funnel'}
                      size={16}
                      color="#1E3A8A"
                    />
                    <Text style={styles.filterStatusText}>
                      {showAllJobs ? t('home.allJobs') : t('home.filtered')}
                    </Text>
                  </View>

                  <View style={styles.preferenceHeader}>
                    <View style={styles.preferenceTitleRow}>
                      <Ionicons
                        name="briefcase-outline"
                        size={18}
                        color="#F97316"
                      />
                      <Text style={styles.preferenceTitle}>
                        {t('home.jobPreferences')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push('/PreferencesScreen')}
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color="#1E3A8A"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.preferenceTags}>
                    <Text style={styles.preferenceLabel}>
                      {t('home.industry')}:
                    </Text>
                    {userPreferences.industries.slice(0, 3).map((industry) => (
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
                    {userPreferences.industries.length > 3 && (
                      <View
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
                          +{userPreferences.industries.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* View All Jobs Button */}
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
                      color={showAllJobs ? '#1E3A8A' : '#FFFFFF'}
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

                  {/* Info Text */}
                  {!showAllJobs && (
                    <View style={styles.infoTextContainer}>
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color="#64748B"
                      />
                      <Text style={styles.infoText}>
                        {t('home.filterActive')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

            <View style={styles.filterSection}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('home.searchPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={searchKeyword}
                  onChangeText={setSearchKeyword}
                />
                {searchKeyword.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchKeyword('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filterRow}>
                {userCoordinates && (
                  <View style={styles.distanceFilterContainer}>
                    <Text style={styles.filterLabel}>Distance:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.distanceChipsScroll}
                    >
                      <TouchableOpacity
                        style={[
                          styles.distanceChip,
                          distanceFilter === null && styles.distanceChipActive,
                        ]}
                        onPress={() => {
                          setDistanceFilter(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.distanceChipText,
                            distanceFilter === null &&
                              styles.distanceChipTextActive,
                          ]}
                        >
                          All
                        </Text>
                      </TouchableOpacity>
                      {[5, 10, 20, 50].map((distance) => (
                        <TouchableOpacity
                          key={distance}
                          style={[
                            styles.distanceChip,
                            distanceFilter === distance &&
                              styles.distanceChipActive,
                          ]}
                          onPress={() => {
                            setDistanceFilter(distance);
                            console.log('Distance filter set to:', distance);
                          }}
                        >
                          <Ionicons
                            name="location"
                            size={14}
                            color={
                              distanceFilter === distance
                                ? '#FFFFFF'
                                : '#1E3A8A'
                            }
                          />
                          <Text
                            style={[
                              styles.distanceChipText,
                              distanceFilter === distance &&
                                styles.distanceChipTextActive,
                            ]}
                          >
                            {distance}km
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Change Location Button */}
                <TouchableOpacity
                  style={styles.changeLocationButton}
                  onPress={() => router.push('/(user-hidden)/update-location')}
                >
                  <Ionicons name="location-outline" size={18} color="#1E3A8A" />
                  <Text style={styles.changeLocationText}>Change Location</Text>
                </TouchableOpacity>
              </View>

              {(searchKeyword || locationFilter || showAllJobs) && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={clearFilters}
                >
                  <Ionicons name="refresh" size={16} color="#1E3A8A" />
                  <Text style={styles.clearFiltersText}>
                    {t('home.clearFilters')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {t('home.jobsFound', { count: filteredJobs.length })}
              </Text>
              {!showAllJobs &&
                userPreferences?.industries &&
                userPreferences.industries.length > 0 && (
                  <Text style={styles.resultsSubtext}>
                    {t('home.filteredResults')}
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
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
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
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  menuButton: {
    padding: 8,
  },
  preferencesSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filterStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  preferenceTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  preferenceLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 8,
    fontWeight: '500',
  },
  preferenceTag: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  preferenceTagInactive: {
    backgroundColor: '#E2E8F0',
  },
  preferenceTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  preferenceTagTextInactive: {
    color: '#64748B',
  },
  viewAllJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  viewAllJobsButtonActive: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  viewAllJobsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllJobsButtonTextActive: {
    color: '#1E3A8A',
  },
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  resultsSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  jobList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTouchable: {
    padding: 16,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden', // ✅ Important for clipping
  },

  // ✅ NEW: Company logo image style
  companyLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // ✅ UPDATED: Placeholder for no logo
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  companyLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jobHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeAgo: {
    fontSize: 12,
    color: '#64748B',
  },
  saveButton: {
    padding: 4,
  },
  moreButton: {
    padding: 4,
    marginLeft: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 24,
  },
  jobMetaContainer: {
    marginBottom: 12,
  },
  jobMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  salary: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  emptyActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  distanceFilterContainer: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  distanceChipsScroll: {
    flexDirection: 'row',
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  distanceChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  distanceChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  distanceChipTextActive: {
    color: '#FFFFFF',
  },
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  changeLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
});

export default HomeScreen;
