'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import DateTimePickerModal from 'react-native-modal-datetime-picker';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

// Color Palette
const COLORS = {
  primary: '#1E3A8A', // Deep Blue
  primaryLight: '#3B82F6', // Lighter Blue
  secondary: '#F97316', // Orange
  success: '#10B981', // Green
  danger: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  lightBlue: '#EFF6FF',
  lightGreen: '#F0FDF4',
  lightOrange: '#FFF7ED',
  lightRed: '#FEF2F2',
  dark: '#1E293B',
  grayDark: '#475569',
  gray: '#64748B',
  grayLight: '#94A3B8',
  grayLighter: '#E2E8F0',
  white: '#FFFFFF',
  background: '#F8FAFC',
};

const TABS = [
  { id: 'ranking', label: 'Job Post Rank', icon: 'trending-up' },
  { id: 'shortage', label: 'Shortage', icon: 'alert-circle' },
  { id: 'highlights', label: 'Highlights', icon: 'trophy' },
];

export default function JobStatisticsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ranking');

  // State for fetched data
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [jobRanking, setJobRanking] = useState([]);

  const [languageUsage, setLanguageUsage] = useState([]);
  const [shortageAnalysis, setShortageAnalysis] = useState([]);
  const [highlights, setHighlights] = useState({
    locations: [],
    employers: [],
  });

  // State for TrendChart
  const [trendType, setTrendType] = useState<'job' | 'application'>('job');
  const [trendFilter, setTrendFilter] = useState<'week' | 'month' | 'year'>(
    'week'
  );
  const [trendDate, setTrendDate] = useState(new Date());

  const fetchWithAuth = async (endpoint: string) => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        router.replace('/(admin-hidden)/login');
        return null;
      }

      const response = await fetch(`${URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return data.data;
      } else {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('adminToken');
          router.replace('/(admin-hidden)/login');
        }
        return null;
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  };

  const fetchAllData = async () => {
    try {
      const [overview, ranking, languages, shortage, highlightData] =
        await Promise.all([
          fetchWithAuth('/api/statistics/overview'),
          fetchWithAuth('/api/statistics/ranking'),
          fetchWithAuth('/api/statistics/language'),
          fetchWithAuth('/api/statistics/shortage'),
          fetchWithAuth('/api/statistics/highlights'),
        ]);

      if (overview) setOverviewStats(overview);
      if (ranking) setJobRanking(ranking);
      if (languages) setLanguageUsage(languages);
      if (shortage) setShortageAnalysis(shortage);
      if (highlightData) setHighlights(highlightData);

      // Initial fetch for trend data
      await fetchTrendData();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchTrendData = async () => {
    const data = await fetchWithAuth(
      `/api/statistics/trends?type=${trendType}&filter=${trendFilter}&date=${trendDate.toISOString()}`
    );
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchTrendData();
  }, [trendType, trendFilter, trendDate]);

  const onRefresh = useCallback(() => {
    fetchAllData();
  }, []);

  // Overview Cards Component
  const OverviewCards = () => (
    <View style={styles.statsGrid}>
      {[
        {
          label: 'Total Jobs',
          value: overviewStats.total,
          icon: 'briefcase-outline',
          color: COLORS.primary,
          bgColor: COLORS.lightBlue,
          gradient: ['#EFF6FF', '#DBEAFE'],
        },
        {
          label: 'Pending',
          value: overviewStats.pending,
          icon: 'time-outline',
          color: COLORS.secondary,
          bgColor: COLORS.lightOrange,
          gradient: ['#FFF7ED', '#FFEDD5'],
        },
        {
          label: 'Approved',
          value: overviewStats.approved,
          icon: 'checkmark-circle-outline',
          color: COLORS.success,
          bgColor: COLORS.lightGreen,
          gradient: ['#F0FDF4', '#DCFCE7'],
        },
        {
          label: 'Rejected',
          value: overviewStats.rejected,
          icon: 'close-circle-outline',
          color: COLORS.danger,
          bgColor: COLORS.lightRed,
          gradient: ['#FEF2F2', '#FEE2E2'],
        },
      ].map((stat, index) => (
        <LinearGradient
          key={index}
          colors={stat.gradient}
          style={[styles.statCard, styles.statCardShadow]}
        >
          <View style={styles.statIconContainer}>
            <View
              style={[
                styles.statIconCircle,
                { backgroundColor: `${stat.color}15` },
              ]}
            >
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
          </View>
          <Text style={styles.statValue}>{stat.value.toLocaleString()}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </LinearGradient>
      ))}
    </View>
  );

  // Enhanced TrendChart Component
  const TrendChart = ({
    title,
    subLabel,
    baseColor,
    type,
  }: {
    title: string;
    subLabel: string;
    baseColor: string;
    type: 'job' | 'application';
  }) => {
    // We use the parent state for filters to avoid unnecessary re-fetches or complex prop drilling
    // but for this specific implementation where we have two charts, we need to handle them carefully.
    // Actually, the requirement was to show trends. The current UI shows two charts: "Job Posting Trend" and "Application Trends".
    // My previous fetch logic uses a single set of state variables for trend type.
    // I should probably separate them or allow the component to control the type.

    // To keep it simple and consistent with the design which shows both charts,
    // I will use local state for the filter/date but trigger the fetch with a callback or use a specific effect.
    // However, to avoid complexity, I'll just use the props to display data if I fetch both upfront,
    // or I can make the chart component self-contained with its own fetch logic?
    // No, better to keep data fetching in the parent.

    // Let's modify the parent to fetch both or handle the type change.
    // The current `fetchTrendData` uses `trendType`.
    // If I want to show two charts simultaneously, I need data for both.

    // Let's stick to the previous implementation where I added `trendType` to state.
    // But wait, the UI displays BOTH charts.
    // So I should fetch both or have separate states.

    // Actually, looking at the UI, it displays "Job Posting Trend" AND "Application Trends".
    // So I should probably fetch both types of data.

    // Let's adjust `TrendChart` to take `data` as a prop, and handle filter/date locally?
    // If I handle filter/date locally, I need to fetch data when they change.

    // Let's refactor `TrendChart` to handle its own state and fetching?
    // That might be cleaner.

    const [localFilter, setLocalFilter] = useState<'week' | 'month' | 'year'>(
      'week'
    );
    const [localDate, setLocalDate] = useState(new Date());
    const [localData, setLocalData] = useState<
      { label: string; value: number }[]
    >([]);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    useEffect(() => {
      const fetchData = async () => {
        const data = await fetchWithAuth(
          `/api/statistics/trends?type=${type}&filter=${localFilter}&date=${localDate.toISOString()}`
        );
        if (data) setLocalData(data);
      };
      fetchData();
    }, [localFilter, localDate, type]);

    const showDatePicker = () => {
      setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
      setDatePickerVisibility(false);
    };

    const handleConfirm = (date: Date) => {
      setLocalDate(date);
      hideDatePicker();
    };

    const getDateLabel = () => {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      if (localFilter === 'week') {
        const start = new Date(localDate);
        start.setDate(localDate.getDate() - localDate.getDay() + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString(
          'en-US',
          options
        )} - ${end.toLocaleDateString('en-US', options)}`;
      } else if (localFilter === 'month') {
        return localDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      } else {
        return localDate.getFullYear().toString();
      }
    };

    const handlePrev = () => {
      const newDate = new Date(localDate);
      if (localFilter === 'week') newDate.setDate(newDate.getDate() - 7);
      else if (localFilter === 'month')
        newDate.setMonth(newDate.getMonth() - 1);
      else newDate.setFullYear(newDate.getFullYear() - 1);
      setLocalDate(newDate);
    };

    const handleNext = () => {
      const newDate = new Date(localDate);
      if (localFilter === 'week') newDate.setDate(newDate.getDate() + 7);
      else if (localFilter === 'month')
        newDate.setMonth(newDate.getMonth() + 1);
      else newDate.setFullYear(newDate.getFullYear() + 1);

      const today = new Date();
      const checkDate = new Date(newDate);
      // Compare dates only to avoid time issues
      if (checkDate.setHours(0, 0, 0, 0) <= today.setHours(0, 0, 0, 0)) {
        setLocalDate(newDate);
      }
    };

    const maxValue = Math.max(...localData.map((d) => d.value), 1); // Avoid division by zero

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subLabel}</Text>
          </View>
          <View style={styles.filterTabs}>
            {(['week', 'month', 'year'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterTab,
                  localFilter === f && { backgroundColor: baseColor },
                ]}
                onPress={() => setLocalFilter(f)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    localFilter === f && styles.activeFilterTabText,
                  ]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.cardShadow]}>
          <View style={styles.dateControl}>
            <TouchableOpacity onPress={handlePrev} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={showDatePicker}
              style={styles.dateLabelContainer}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.dateLabel}>{getDateLabel()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <View style={styles.chartContainer}>
            {localData.length > 0 ? (
              localData.map((item, i) => (
                <View key={i} style={styles.barGroup}>
                  <Text style={styles.barValue}>{item.value}</Text>
                  <LinearGradient
                    colors={[baseColor, `${baseColor}CC`]}
                    style={[
                      styles.bar,
                      {
                        height: (item.value / maxValue) * 120,
                        minHeight: 8,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              ))
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: COLORS.gray }}>No data available</Text>
              </View>
            )}
          </View>
        </View>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
          date={localDate}
          maximumDate={new Date()}
        />
      </View>
    );
  };

  // Job Post Ranking Content
  const JobPostRanking = () => {
    const [searchTitle, setSearchTitle] = useState('');
    const [searchCompany, setSearchCompany] = useState('');

    const filteredJobs = jobRanking.filter((job: any) => {
      const matchTitle = job.title
        .toLowerCase()
        .includes(searchTitle.toLowerCase());
      const matchCompany = job.company
        .toLowerCase()
        .includes(searchCompany.toLowerCase());
      return matchTitle && matchCompany;
    });

    return (
      <View>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Job Title..."
              placeholderTextColor={COLORS.grayLight}
              value={searchTitle}
              onChangeText={setSearchTitle}
            />
            {searchTitle.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTitle('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.grayLight}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="business-outline" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Company..."
              placeholderTextColor={COLORS.grayLight}
              value={searchCompany}
              onChangeText={setSearchCompany}
            />
            {searchCompany.length > 0 && (
              <TouchableOpacity onPress={() => setSearchCompany('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.grayLight}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ranking List */}
        <View style={[styles.card, styles.cardShadow]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Top Job Posts</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Table Header removed for list style layout */}

          {filteredJobs.length > 0 ? (
            filteredJobs.map((job: any, index: number) => (
              <TouchableOpacity
                key={job.id || index}
                style={[
                  styles.tableRow,
                  index === filteredJobs.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {/* Rank Badge - Left */}
                <View
                  style={[styles.rankBadge, index < 3 && styles.topRankBadge]}
                >
                  <Text
                    style={[styles.rankText, index < 3 && styles.topRankText]}
                  >
                    #{index + 1}
                  </Text>
                </View>

                {/* Middle Content - Title, Company, Trend */}
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {job.title}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        { fontSize: 13, marginRight: 8, maxWidth: '70%' },
                      ]}
                      numberOfLines={1}
                    >
                      {job.company}
                    </Text>

                    {/* Trend Inline */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Ionicons
                        name={
                          job.trend === 'up'
                            ? 'trending-up'
                            : job.trend === 'down'
                            ? 'trending-down'
                            : 'remove'
                        }
                        size={12}
                        color={
                          job.trend === 'up'
                            ? COLORS.success
                            : job.trend === 'down'
                            ? COLORS.danger
                            : COLORS.gray
                        }
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '500',
                          color:
                            job.trend === 'up'
                              ? COLORS.success
                              : job.trend === 'down'
                              ? COLORS.danger
                              : COLORS.gray,
                        }}
                      >
                        {job.trend === 'up'
                          ? '+12%'
                          : job.trend === 'down'
                          ? '-5%'
                          : '0%'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Content - Apps */}
                <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                  <Text style={styles.rowValue}>{job.apps}</Text>
                  <Text style={styles.rowSubText}>applications</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: COLORS.gray }}>No jobs found</Text>
            </View>
          )}
        </View>

        {/* Charts Section */}
        <TrendChart
          title="Job Posting Trend"
          subLabel="New jobs posted over time"
          baseColor={COLORS.primary}
          type="job"
        />

        <TrendChart
          title="Application Trends"
          subLabel="Total applications received"
          baseColor={COLORS.primaryLight}
          type="application"
        />

        {/* Language Usage */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Language Usage</Text>
            <Text style={styles.sectionSubtitle}>
              Most used during job browsing
            </Text>
          </View>
          <View style={[styles.card, styles.cardShadow]}>
            {languageUsage.length > 0 ? (
              languageUsage.map((item: any, i: number) => (
                <View key={i} style={styles.languageRow}>
                  <View style={styles.languageInfo}>
                    <View
                      style={[
                        styles.languageIconContainer,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text style={styles.languageLabel}>{item.lang}</Text>
                  </View>
                  <View style={styles.languageStats}>
                    <View style={styles.languageBarBg}>
                      <LinearGradient
                        colors={[item.color, `${item.color}CC`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.languageBar, { width: `${item.pct}%` }]}
                      />
                    </View>
                    <Text style={styles.languageValue}>{item.pct}%</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.gray }}>
                  No language data available
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Shortage Analysis Content
  const ShortageAnalysis = () => {
    return (
      <View>
        <View style={[styles.card, styles.cardShadow]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Job Shortage Index</Text>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: COLORS.danger }]}
                />
                <Text style={styles.legendText}>High</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: COLORS.warning },
                  ]}
                />
                <Text style={styles.legendText}>Medium</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: COLORS.success },
                  ]}
                />
                <Text style={styles.legendText}>Low</Text>
              </View>
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>JOB TYPE</Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
            >
              JOBS
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
            >
              APPS
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}
            >
              SHORTAGE
            </Text>
          </View>

          {shortageAnalysis.length > 0 ? (
            shortageAnalysis.map((item: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index === shortageAnalysis.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={[styles.rowText, { fontWeight: '600' }]}>
                    {item.type}
                  </Text>
                  <View style={styles.trendContainer}>
                    <Ionicons
                      name={
                        item.trend === 'up'
                          ? 'trending-up'
                          : item.trend === 'down'
                          ? 'trending-down'
                          : 'remove'
                      }
                      size={12}
                      color={
                        item.trend === 'up'
                          ? COLORS.success
                          : item.trend === 'down'
                          ? COLORS.danger
                          : COLORS.gray
                      }
                    />
                    <Text
                      style={[
                        styles.trendText,
                        {
                          color:
                            item.trend === 'up'
                              ? COLORS.success
                              : item.trend === 'down'
                              ? COLORS.danger
                              : COLORS.gray,
                        },
                      ]}
                    >
                      {item.trend === 'up'
                        ? 'Increasing'
                        : item.trend === 'down'
                        ? 'Decreasing'
                        : 'Stable'}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.rowValue}>{item.jobs}</Text>
                  <Text style={styles.rowSubText}>open</Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.rowValue}>{item.applicants}</Text>
                  <Text style={styles.rowSubText}>total</Text>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.shortage === 'High'
                            ? '#FEF2F2'
                            : item.shortage === 'Low'
                            ? '#F0FDF4'
                            : '#FFF7ED',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            item.shortage === 'High'
                              ? COLORS.danger
                              : item.shortage === 'Low'
                              ? COLORS.success
                              : COLORS.warning,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.shortage === 'High'
                              ? COLORS.danger
                              : item.shortage === 'Low'
                              ? COLORS.success
                              : COLORS.warning,
                        },
                      ]}
                    >
                      {item.shortage}
                    </Text>
                  </View>
                  <Text style={styles.ratioText}>Ratio: {item.ratio}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: COLORS.gray }}>No data available</Text>
            </View>
          )}
        </View>

        {/* Location Heatmap */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location Heatmap</Text>
            <Text style={styles.sectionSubtitle}>Demand by region</Text>
          </View>
          <View style={[styles.card, styles.cardShadow]}>
            {highlights.locations && highlights.locations.length > 0 ? (
              highlights.locations.map((loc: any, i: number) => (
                <View key={i} style={styles.locationRow}>
                  <View style={styles.locationInfo}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.locationName}>{loc.name}</Text>
                  </View>
                  <View style={styles.heatmapContainer}>
                    <LinearGradient
                      colors={['#EF4444', '#F59E0B', '#10B981']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.heatmapBar, { width: `${100 - i * 15}%` }]}
                    />
                    <Text style={styles.heatmapValue}>{loc.value} jobs</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.gray }}>
                  No location data available
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Highlights Content
  const Highlights = () => {
    return (
      <View>
        {/* Top Employers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performing Employers</Text>
            <Text style={styles.sectionSubtitle}>
              Based on hiring success rate
            </Text>
          </View>
          <View style={[styles.card, styles.cardShadow]}>
            {highlights.employers && highlights.employers.length > 0 ? (
              highlights.employers.map((emp: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.tableRow,
                    i === highlights.employers.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={[
                        styles.employerRank,
                        i < 3 && styles.topEmployerRank,
                      ]}
                    >
                      <Text
                        style={[
                          styles.employerRankText,
                          i < 3 && styles.topEmployerRankText,
                        ]}
                      >
                        #{i + 1}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.rowTitle}>{emp.name}</Text>
                      <View style={styles.trendContainer}>
                        <Ionicons
                          name={
                            emp.trend === 'up'
                              ? 'trending-up'
                              : emp.trend === 'down'
                              ? 'trending-down'
                              : 'remove'
                          }
                          size={12}
                          color={
                            emp.trend === 'up'
                              ? COLORS.success
                              : emp.trend === 'down'
                              ? COLORS.danger
                              : COLORS.gray
                          }
                        />
                        <Text
                          style={[
                            styles.trendText,
                            {
                              color:
                                emp.trend === 'up'
                                  ? COLORS.success
                                  : emp.trend === 'down'
                                  ? COLORS.danger
                                  : COLORS.gray,
                            },
                          ]}
                        >
                          {emp.trend === 'up'
                            ? 'Improving'
                            : emp.trend === 'down'
                            ? 'Declining'
                            : 'Stable'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.highlightValue}>{emp.hires} Hires</Text>
                    <View style={styles.successRateContainer}>
                      <LinearGradient
                        colors={['#10B981', '#34D399']}
                        style={[
                          styles.successRateBadge,
                          { width: `${parseInt(emp.rate)}%` },
                        ]}
                      />
                      <Text style={styles.highlightSub}>
                        {emp.rate} Success Rate
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: COLORS.gray }}>
                  No employer data available
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['#F0FDF4', '#DCFCE7']}
            style={[styles.highlightCard, styles.cardShadow]}
          >
            <View style={styles.highlightIconContainer}>
              <Ionicons
                name="checkmark-done-circle"
                size={32}
                color={COLORS.success}
              />
            </View>
            <Text style={styles.highlightCardValue}>78%</Text>
            <Text style={styles.highlightCardLabel}>Job Success Rate</Text>
            <Text style={styles.highlightCardSub}>Filled vs Posted</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={[styles.highlightCard, styles.cardShadow]}
          >
            <View style={styles.highlightIconContainer}>
              <Ionicons name="flash" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.highlightCardValue}>Retail</Text>
            <Text style={styles.highlightCardLabel}>Top Category</Text>
            <Text style={styles.highlightCardSub}>Fastest Placement</Text>
          </LinearGradient>
        </View>

        {/* Additional Stats */}
        <View style={[styles.card, styles.cardShadow, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>Quick Stats</Text>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStat}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
              <Text style={styles.quickStatValue}>3.2 days</Text>
              <Text style={styles.quickStatLabel}>Avg. Time to Fill</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="people" size={20} color={COLORS.primaryLight} />
              <Text style={styles.quickStatValue}>24.5</Text>
              <Text style={styles.quickStatLabel}>Avg. Applicants</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="star" size={20} color={COLORS.secondary} />
              <Text style={styles.quickStatValue}>4.8/5</Text>
              <Text style={styles.quickStatLabel}>Employer Rating</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Overview Statistics */}
          <OverviewCards />

          {/* Tabs */}
          <View style={[styles.tabContainer, styles.cardShadow]}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={activeTab === tab.id ? COLORS.primary : COLORS.gray}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'ranking' && <JobPostRanking />}
            {activeTab === 'shortage' && <ShortageAnalysis />}
            {activeTab === 'highlights' && <Highlights />}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.lightBlue,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabContent: {
    minHeight: 400,
  },
  searchSection: {
    gap: 12,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLighter,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.dark,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLighter,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLighter,
    paddingBottom: 12,
    marginBottom: 12,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLighter,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  rowText: {
    fontSize: 14,
    color: COLORS.grayDark,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rowSubText: {
    fontSize: 11,
    color: COLORS.grayLight,
    marginTop: 2,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grayLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topRankBadge: {
    backgroundColor: COLORS.primary,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
  },
  topRankText: {
    color: COLORS.white,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLighter,
    borderRadius: 10,
    padding: 4,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterTabText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: COLORS.white,
  },
  dateControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
    paddingHorizontal: 4,
  },
  barGroup: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bar: {
    width: 14,
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
    marginTop: 8,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.grayDark,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratioText: {
    fontSize: 10,
    color: COLORS.grayLight,
    marginTop: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.gray,
  },
  locationRow: {
    marginBottom: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  heatmapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heatmapBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  heatmapValue: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
    width: 60,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.success,
  },
  highlightSub: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  successRateContainer: {
    position: 'relative',
    marginTop: 6,
  },
  successRateBadge: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
    opacity: 0.2,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  languageIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  languageStats: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.grayLighter,
    borderRadius: 4,
  },
  languageBar: {
    height: '100%',
    borderRadius: 4,
  },
  languageValue: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  highlightCard: {
    flex: 1,
    minWidth: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  highlightIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  highlightCardLabel: {
    fontSize: 14,
    color: COLORS.grayDark,
    fontWeight: '600',
    marginBottom: 4,
  },
  highlightCardSub: {
    fontSize: 11,
    color: COLORS.grayLight,
  },
  employerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grayLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topEmployerRank: {
    backgroundColor: COLORS.primary,
  },
  employerRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
  },
  topEmployerRankText: {
    color: COLORS.white,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
  },
});
