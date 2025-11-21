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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
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
  report: {
    id: number;
    reportType: string;
    job: {
      id: number;
      title: string;
      company: {
        name: string;
      };
    };
  };
}

const AdminAppealsScreen: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const router = useRouter();

  useEffect(() => {
    loadAppeals();
  }, [filter]);

  const loadAppeals = async () => {
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

      const url =
        filter === 'all'
          ? `${URL}/api/appeals/admin/appeals`
          : `${URL}/api/appeals/admin/appeals?status=${filter}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAppeals(data.data);
      } else {
        Alert.alert('Error', 'Failed to load appeals');
      }
    } catch (error) {
      console.error('Error loading appeals:', error);
      Alert.alert('Error', 'Failed to load appeals');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAppeals();
  }, [filter]);

  const formatReportType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: '#F59E0B',
      UNDER_REVIEW: '#3B82F6',
      ACCEPTED: '#10B981',
      REJECTED: '#EF4444',
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
          <Ionicons name="chatbox-ellipses" size={20} color="#8B5CF6" />
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

      <View style={styles.reportInfo}>
        <Ionicons name="flag" size={16} color="#EF4444" />
        <Text style={styles.reportType}>
          {formatReportType(item.report.reportType)}
        </Text>
      </View>

      <View style={styles.jobInfo}>
        <Ionicons name="briefcase-outline" size={16} color="#1E3A8A" />
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.report.job.title}
        </Text>
      </View>

      <Text style={styles.companyName}>{item.report.job.company.name}</Text>

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
      <Text style={styles.emptyTitle}>No Appeals</Text>
      <Text style={styles.emptyText}>
        There are no {filter !== 'all' ? filter.toLowerCase() : ''} appeals at
        this time.
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
          <Text style={styles.headerTitle}>Appeals</Text>
          <Text style={styles.headerSubtitle}>
            {appeals.length} {appeals.length === 1 ? 'appeal' : 'appeals'}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'all' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'all' && styles.filterTabTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'PENDING' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('PENDING')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'PENDING' && styles.filterTabTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'UNDER_REVIEW' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('UNDER_REVIEW')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'UNDER_REVIEW' && styles.filterTabTextActive,
              ]}
            >
              Under Review
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'ACCEPTED' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('ACCEPTED')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'ACCEPTED' && styles.filterTabTextActive,
              ]}
            >
              Accepted
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === 'REJECTED' && styles.filterTabActive,
            ]}
            onPress={() => setFilter('REJECTED')}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === 'REJECTED' && styles.filterTabTextActive,
              ]}
            >
              Rejected
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Appeals List */}
      <FlatList
        data={appeals}
        renderItem={renderAppealCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={
          appeals.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
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
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F8FAFC',
  },
  filterTabActive: {
    backgroundColor: '#1E3A8A',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  appealCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appealIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appealId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reportType: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 15,
    color: '#1E3A8A',
    fontWeight: '600',
    flex: 1,
  },
  companyName: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  explanation: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employerName: {
    fontSize: 13,
    color: '#64748B',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AdminAppealsScreen;
