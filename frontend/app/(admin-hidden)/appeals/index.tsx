import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Appeal {
  id: number;
  explanation: string;
  status: string;
  createdAt: string;
  employer: {
    fullName: string;
    email: string;
  };
  job: {
    id: number;
    title: string;
    company: {
      name: string;
    };
  };
}

const AdminAppealsScreen: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const router = useRouter();

  const loadAppeals = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          {
            text: 'OK',
            onPress: () => router.replace('/(admin-hidden)/login'),
          },
        ]);
        return;
      }

      // Fetch appeals with REPORT_SUSPENSION type
      let url = `${URL}/api/job-appeals/admin/appeals?appealType=REPORT_SUSPENSION`;
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAppeals(data.data.appeals || []);
      } else {
        console.error('Failed to load appeals:', response.status);
        Alert.alert('Error', 'Failed to load appeals');
      }
    } catch (error) {
      console.error('Error loading appeals:', error);
      Alert.alert('Error', 'Failed to load appeals');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, router]);

  useFocusEffect(
    useCallback(() => {
      loadAppeals();
    }, [loadAppeals])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAppeals();
  }, [loadAppeals]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: '#F59E0B',
      UNDER_REVIEW: '#3B82F6',
      ACCEPTED: '#10B981',
      APPROVED: '#10B981',
      REJECTED: '#EF4444',
      REJECTED_FINAL: '#EF4444',
    };
    return colors[status] || '#64748B';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderAppealCard = ({ item }: { item: Appeal }) => (
    <TouchableOpacity
      style={styles.appealCard}
      onPress={() => router.push(`/(admin-hidden)/appeals/${item.id}` as Href)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.appealIdContainer}>
          <Ionicons name="alert-circle" size={20} color="#8B5CF6" />
          <Text style={styles.appealId}>Appeal #{item.id}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.jobInfo}>
        <Ionicons name="briefcase-outline" size={16} color="#1E3A8A" />
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.job.title}
        </Text>
      </View>

      <Text style={styles.companyName}>{item.job.company.name}</Text>

      <Text style={styles.explanation} numberOfLines={2}>
        {item.explanation}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.employerInfo}>
          <Ionicons name="person-outline" size={14} color="#64748B" />
          <Text style={styles.employerName}>{item.employer.fullName}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbox-ellipses-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Suspended Job Appeals</Text>
      <Text style={styles.emptyText}>
        There are no {filter !== 'all' ? filter.toLowerCase() : ''} appeals for
        suspended jobs at this time.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading appeals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Job Appeals</Text>
          <Text style={styles.headerSubtitle}>
            Suspended Jobs ({appeals.length})
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'PENDING' && styles.activeFilterTab,
          ]}
          onPress={() => setFilter('PENDING')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'PENDING' && styles.activeFilterText,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'ACCEPTED' && styles.activeFilterTab,
          ]}
          onPress={() => setFilter('ACCEPTED')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'ACCEPTED' && styles.activeFilterText,
            ]}
          >
            Approved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'REJECTED' && styles.activeFilterTab,
          ]}
          onPress={() => setFilter('REJECTED')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'REJECTED' && styles.activeFilterText,
            ]}
          >
            Rejected
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={appeals}
        renderItem={renderAppealCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  activeFilterTab: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 16,
  },
  appealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appealIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appealId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    marginLeft: 24, // Align with job title
  },
  explanation: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  employerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employerName: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
  },
});

export default AdminAppealsScreen;
