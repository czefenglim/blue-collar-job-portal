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
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Report {
  id: number;
  reportType: string;
  description: string;
  status: string;
  createdAt: string;
  job: {
    id: number;
    title: string;
    isSuspended: boolean;
    suspensionReason: string | null;
    isActive: boolean;
  };
  user: {
    fullName: string;
  };
  appeals: Array<{
    id: number;
    status: string;
  }>;
}

const EmployerReportsScreen: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        Alert.alert('Authentication Required', 'Please sign in to continue', [
          {
            text: 'OK',
            onPress: () => router.replace('/LoginScreen'),
          },
        ]);
        return;
      }

      const response = await fetch(`${URL}/api/appeals/employer/my-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.data);
      } else {
        Alert.alert('Error', 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadReports();
  }, []);

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
      RESOLVED: '#10B981',
      DISMISSED: '#64748B',
      PENDING_EMPLOYER_RESPONSE: '#8B5CF6',
    };
    return colors[status] || '#64748B';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      PENDING: 'time-outline',
      UNDER_REVIEW: 'eye-outline',
      RESOLVED: 'alert-circle',
      DISMISSED: 'checkmark-circle',
      PENDING_EMPLOYER_RESPONSE: 'chatbox-ellipses-outline',
    };
    return icons[status] || 'flag';
  };

  const getActionTakenText = (report: Report) => {
    if (report.job.isSuspended) {
      return 'Job Suspended';
    }
    if (!report.job.isActive) {
      return 'Job Deleted';
    }
    return null;
  };

  const hasActiveAppeal = (report: Report) => {
    return report.appeals.some((appeal) =>
      ['PENDING', 'UNDER_REVIEW'].includes(appeal.status)
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderReportCard = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() =>
        router.push(`/(employer-hidden)/reports/${item.id}/page` as Href)
      }
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.reportTypeContainer}>
          <Ionicons name="flag" size={20} color="#EF4444" />
          <Text style={styles.reportType}>
            {formatReportType(item.reportType)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.status) as any}
            size={14}
            color={getStatusColor(item.status)}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.jobInfo}>
        <Ionicons name="briefcase-outline" size={16} color="#1E3A8A" />
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.job.title}
        </Text>
      </View>

      <Text style={styles.reporterInfo}>Reported by {item.user.fullName}</Text>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {getActionTakenText(item) && (
          <View style={styles.actionBadge}>
            <Ionicons name="warning" size={14} color="#EF4444" />
            <Text style={styles.actionText}>{getActionTakenText(item)}</Text>
          </View>
        )}

        {hasActiveAppeal(item) && (
          <View style={styles.appealBadge}>
            <Ionicons name="chatbox" size={14} color="#8B5CF6" />
            <Text style={styles.appealText}>Appeal Pending</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="documents-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Reports</Text>
      <Text style={styles.emptyText}>
        There are no reports on your job postings.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Job Reports</Text>
          <Text style={styles.headerSubtitle}>
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </Text>
        </View>
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={
          reports.length === 0
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
  listContainer: {
    padding: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  reportCard: {
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
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reportType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
  },
  jobTitle: {
    fontSize: 15,
    color: '#1E3A8A',
    fontWeight: '600',
    flex: 1,
  },
  reporterInfo: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  appealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  appealText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
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

export default EmployerReportsScreen;
