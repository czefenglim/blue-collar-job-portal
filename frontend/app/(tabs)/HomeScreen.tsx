import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

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
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [token, setToken] = useState<string>('');
  const isFocused = useIsFocused();

  const router = useRouter();

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
  }, [searchKeyword, selectedIndustry, locationFilter, jobs]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem('jwtToken');

      if (!userToken) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
        return;
      }

      setToken(userToken);

      await Promise.all([
        fetchUserPreferences(userToken),
        fetchIndustries(userToken),
        fetchJobs(userToken),
      ]);

      console.log('User Token:', userToken); // Debug logs

      console.log('User Preferences:', userPreferences); // Debug log
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPreferences = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/users/getPreferences`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.data);
        if (data.data.preferredLocation) {
          setLocationFilter(data.data.preferredLocation);
        }
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const fetchIndustries = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/industries`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIndustries(data.data);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const fetchJobs = async (userToken: string) => {
    try {
      const response = await fetch(`${URL}/api/jobs`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    }
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

    if (selectedIndustry) {
      filtered = filtered.filter(
        (job) => job.industry?.slug === selectedIndustry
      );
    }

    if (locationFilter.trim()) {
      filtered = filtered.filter(
        (job) =>
          job.city.toLowerCase().includes(locationFilter.toLowerCase()) ||
          job.state.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchJobs(token);
    setIsRefreshing(false);
  }, [token]);

  const clearFilters = () => {
    setSearchKeyword('');
    setSelectedIndustry('');
    setLocationFilter(userPreferences?.preferredLocation || '');
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
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
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
    <TouchableOpacity
      style={styles.jobCard}
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
          <Text style={styles.companyLogoText}>
            {item.company.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.jobHeaderInfo}>
          <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
          <TouchableOpacity
            onPress={() => toggleSaveJob(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.saveIcon}>{item.isSaved ? '🔖' : '📑'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.jobTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={styles.jobMetaContainer}>
        <View style={styles.jobMetaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.experienceLevel}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatJobType(item.jobType)}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {formatWorkingHours(item.workingHours)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.companyName} numberOfLines={1}>
        {item.company.name}
      </Text>
      <Text style={styles.location} numberOfLines={1}>
        {item.city}, {item.state}
      </Text>
    </TouchableOpacity>
  );

  const renderIndustryModal = () => (
    <Modal
      visible={showIndustryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowIndustryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Industry</Text>
            <TouchableOpacity onPress={() => setShowIndustryModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.industryOption,
              !selectedIndustry && styles.industryOptionSelected,
            ]}
            onPress={() => {
              setSelectedIndustry('');
              setShowIndustryModal(false);
            }}
          >
            <Text style={styles.industryOptionText}>All Industries</Text>
            {!selectedIndustry && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <FlatList
            data={industries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.industryOption,
                  selectedIndustry === item.slug &&
                    styles.industryOptionSelected,
                ]}
                onPress={() => {
                  setSelectedIndustry(item.slug);
                  setShowIndustryModal(false);
                }}
              >
                <Text style={styles.industryOptionText}>{item.name}</Text>
                {selectedIndustry === item.slug && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoSmall}>
            <Text style={styles.logoSmallText}>BC</Text>
          </View>
          <View>
            <Text style={styles.appTitleSmall}>Blukers Job Platform</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/ProfileScreen')}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {userPreferences && userPreferences.industries.length > 0 && (
        <View style={styles.preferencesSection}>
          <View style={styles.preferenceHeader}>
            <Text style={styles.preferenceTitle}>Your Jobs Preferences</Text>
            <TouchableOpacity onPress={() => router.push('/PreferencesScreen')}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.preferenceTags}>
            <Text style={styles.preferenceLabel}>Industry:</Text>
            {userPreferences.industries.slice(0, 3).map((industry) => (
              <View key={industry.id} style={styles.preferenceTag}>
                <Text style={styles.preferenceTagText}>{industry.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, companies..."
            placeholderTextColor="#94A3B8"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowIndustryModal(true)}
          >
            <Text style={styles.filterButtonText}>
              {selectedIndustry
                ? industries.find((i) => i.slug === selectedIndustry)?.name ||
                  'Industry'
                : 'Industry'}
            </Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.locationInputContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <TextInput
              style={styles.locationInput}
              placeholder="Location"
              placeholderTextColor="#94A3B8"
              value={locationFilter}
              onChangeText={setLocationFilter}
            />
          </View>
        </View>

        {(searchKeyword ||
          selectedIndustry ||
          locationFilter !== userPreferences?.preferredLocation) && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}{' '}
          Found
        </Text>
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJobCard}
        contentContainerStyle={styles.jobList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No jobs found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {renderIndustryModal()}
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSmall: {
    width: 40,
    height: 40,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoSmallText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#1E3A8A',
  },
  preferencesSection: {
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
  preferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  editIcon: {
    fontSize: 18,
    color: '#1E3A8A',
  },
  preferenceTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  preferenceLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 8,
  },
  preferenceTag: {
    backgroundColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  preferenceTagText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
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
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 12,
  },
  clearIcon: {
    fontSize: 18,
    color: '#94A3B8',
    paddingLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  filterArrow: {
    fontSize: 10,
    color: '#64748B',
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
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  clearFiltersButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
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
  jobList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  saveIcon: {
    fontSize: 20,
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
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748B',
  },
  industryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  industryOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  industryOptionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  checkmark: {
    fontSize: 18,
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
