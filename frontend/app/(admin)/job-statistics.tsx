'use client';

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Mock Data
const MOCK_OVERVIEW = {
  total: 1250,
  pending: 45,
  approved: 1180,
  rejected: 25,
};

const TABS = [
  { id: 'ranking', label: 'Job Post Ranking' },
  { id: 'shortage', label: 'App Shortage Analysis' },
  { id: 'highlights', label: 'App Highlights' },
];

export default function JobStatisticsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ranking');

  // Overview Cards Component
  const OverviewCards = () => (
    <View style={styles.statsGrid}>
      <View style={[styles.statCard, { backgroundColor: '#F8FAFC' }]}>
        <Ionicons name="briefcase-outline" size={24} color="#475569" />
        <Text style={styles.statValue}>{MOCK_OVERVIEW.total}</Text>
        <Text style={styles.statLabel}>Total Jobs</Text>
      </View>

      <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
        <Ionicons name="time-outline" size={24} color="#F97316" />
        <Text style={styles.statValue}>{MOCK_OVERVIEW.pending}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>

      <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
        <Ionicons name="checkmark-circle-outline" size={24} color="#15803D" />
        <Text style={styles.statValue}>{MOCK_OVERVIEW.approved}</Text>
        <Text style={styles.statLabel}>Approved</Text>
      </View>

      <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
        <Ionicons name="close-circle-outline" size={24} color="#DC2626" />
        <Text style={styles.statValue}>{MOCK_OVERVIEW.rejected}</Text>
        <Text style={styles.statLabel}>Rejected</Text>
      </View>
    </View>
  );

  // Job Post Ranking Content
  const JobPostRanking = () => {
    const [searchTitle, setSearchTitle] = useState('');
    const [searchCompany, setSearchCompany] = useState('');

    const MOCK_JOBS = [
      { id: 1, title: 'Warehouse Manager', company: 'Logistics Co', apps: 156 },
      { id: 2, title: 'Forklift Driver', company: 'BuildIt Inc', apps: 142 },
      { id: 3, title: 'Cleaner', company: 'Clean Fast', apps: 98 },
      {
        id: 4,
        title: 'Construction Worker',
        company: 'Mega Structures',
        apps: 87,
      },
      { id: 5, title: 'Delivery Driver', company: 'Speedy Delivery', apps: 76 },
    ];

    return (
      <View>
        {/* Filters */}
        <View style={styles.filterContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Job Title"
              value={searchTitle}
              onChangeText={setSearchTitle}
            />
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="business-outline" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Company"
              value={searchCompany}
              onChangeText={setSearchCompany}
            />
          </View>
        </View>

        {/* Ranking List */}
        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Job Title</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Company</Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}
            >
              Applications
            </Text>
          </View>
          {MOCK_JOBS.map((job, index) => (
            <TouchableOpacity
              key={job.id}
              style={[
                styles.tableRow,
                index === MOCK_JOBS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {}} // Navigate to job details
            >
              <View style={{ flex: 2 }}>
                <Text style={styles.rowTitle}>{job.title}</Text>
                <Text style={styles.rankBadge}>Rank #{index + 1}</Text>
              </View>
              <Text style={[styles.rowText, { flex: 1 }]}>{job.company}</Text>
              <Text style={[styles.rowValue, { flex: 1, textAlign: 'right' }]}>
                {job.apps}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Pagination Mock */}
          <View style={styles.pagination}>
            <TouchableOpacity style={styles.pageButton}>
              <Ionicons name="chevron-back" size={20} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.pageText}>Page 1 of 5</Text>
            <TouchableOpacity style={styles.pageButton}>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Simple Bar Chart Visualization Mock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Posting Trend</Text>
          <View style={styles.card}>
            <View style={styles.chartContainer}>
              {[20, 35, 45, 30, 50, 40, 25].map((h, i) => (
                <View key={i} style={styles.barGroup}>
                  <View
                    style={[
                      styles.bar,
                      { height: h * 1.5, backgroundColor: '#1E3A8A' },
                    ]}
                  />
                  <Text style={styles.barLabel}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.chartSubLabel}>New jobs posted this week</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application Trends</Text>
          <View style={styles.card}>
            <View style={styles.chartContainer}>
              {[60, 80, 45, 90, 30, 75, 50].map((h, i) => (
                <View key={i} style={styles.barGroup}>
                  <View
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: '#3B82F6' },
                    ]}
                  />
                  <Text style={styles.barLabel}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.chartSubLabel}>
              Total applications this week
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language Usage Trend</Text>
          <View style={styles.card}>
            {[
              { lang: 'English', pct: 65, color: '#3B82F6' },
              { lang: 'Malay', pct: 25, color: '#10B981' },
              { lang: 'Mandarin', pct: 10, color: '#F59E0B' },
            ].map((item, i) => (
              <View key={i} style={styles.languageRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.languageLabel}>{item.lang}</Text>
                </View>
                <View style={styles.languageBarBg}>
                  <View
                    style={[
                      styles.languageBar,
                      { width: `${item.pct}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
                <Text style={styles.languageValue}>{item.pct}%</Text>
              </View>
            ))}
            <Text style={styles.chartSubLabel}>
              Most used languages during job browsing
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Shortage Analysis Content
  const ShortageAnalysis = () => {
    const DATA = [
      {
        type: 'Cleaner',
        jobs: 120,
        applicants: 40,
        shortage: 'High',
        ratio: 3.0,
      },
      {
        type: 'Driver',
        jobs: 80,
        applicants: 60,
        shortage: 'Medium',
        ratio: 1.33,
      },
      {
        type: 'Retail',
        jobs: 60,
        applicants: 300,
        shortage: 'Low',
        ratio: 0.2,
      },
    ];

    return (
      <View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Shortage Index</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Job Type</Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
            >
              Jobs
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
            >
              Apps
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}
            >
              Shortage
            </Text>
          </View>
          {DATA.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                index === DATA.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[styles.rowText, { flex: 2, fontWeight: '600' }]}>
                {item.type}
              </Text>
              <Text style={[styles.rowText, { flex: 1, textAlign: 'center' }]}>
                {item.jobs}
              </Text>
              <Text style={[styles.rowText, { flex: 1, textAlign: 'center' }]}>
                {item.applicants}
              </Text>
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
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          item.shortage === 'High'
                            ? '#DC2626'
                            : item.shortage === 'Low'
                            ? '#15803D'
                            : '#F97316',
                      },
                    ]}
                  >
                    {item.shortage}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Location Heatmap (Visual Mock)
          </Text>
          <View style={styles.card}>
            {['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Selangor'].map(
              (loc, i) => (
                <View key={i} style={styles.locationRow}>
                  <Text style={styles.locationName}>{loc}</Text>
                  <View style={styles.heatmapBarBg}>
                    <LinearGradient
                      colors={['#EF4444', '#F59E0B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.heatmapBar, { width: `${80 - i * 15}%` }]}
                    />
                  </View>
                  <Text style={styles.heatmapValue}>High Demand</Text>
                </View>
              )
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Employers</Text>
          <View style={styles.card}>
            {[
              { name: 'Tech Solutions', hires: 45, rate: '92%' },
              { name: 'Green Gardens', hires: 32, rate: '88%' },
              { name: 'City Logistics', hires: 28, rate: '85%' },
            ].map((emp, i) => (
              <View
                key={i}
                style={[styles.tableRow, i === 2 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{emp.name}</Text>
                  <Text style={styles.rankBadge}>#{i + 1} Employer</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.highlightValue}>{emp.hires} Hires</Text>
                  <Text style={styles.highlightSub}>
                    {emp.rate} Success Rate
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.statLabel}>Job Success Rate</Text>
            <Text style={styles.statValue}>78%</Text>
            <Text style={styles.statSub}>Filled vs Posted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.statLabel}>Top Category</Text>
            <Text style={styles.statValue}>Retail</Text>
            <Text style={styles.statSub}>Fastest Placement</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Job Statistics</Text>
              <Text style={styles.headerSubtitle}>
                Comprehensive Analysis Dashboard
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        {/* Overview Statistics */}
        <OverviewCards />

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 16,
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
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  tabContent: {
    minHeight: 400,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  rowText: {
    fontSize: 14,
    color: '#475569',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  rankBadge: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  pageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  pageText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  barGroup: {
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 20,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    marginBottom: 16,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 8,
  },
  heatmapBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 4,
  },
  heatmapBar: {
    height: '100%',
    borderRadius: 4,
  },
  heatmapValue: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'right',
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
  },
  highlightSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  languageLabel: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  languageBarBg: {
    flex: 2,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  languageBar: {
    height: '100%',
    borderRadius: 4,
  },
  languageValue: {
    fontSize: 12,
    color: '#64748B',
    width: 30,
    textAlign: 'right',
  },
});
