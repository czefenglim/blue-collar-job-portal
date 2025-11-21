import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface PendingJob {
  id: number;
  title: string;
  slug: string;
  description: string;
  city: string;
  state: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  approvalStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  company: {
    id: number;
    name: string;
    logo: string | null;
  };
  industry: {
    id: number;
    name: string;
  };
}

export default function AdminJobApprovalScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const fetchPendingJobs = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        Alert.alert('Error', 'Admin session expired');
        router.replace('/(admin-hidden)/login');
        return;
      }

      const response = await fetch(
        `${URL}/api/admin/jobs?approvalStatus=PENDING`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setJobs(data.data.jobs);

        // Fetch stats
        const statsResponse = await fetch(
          `${URL}/api/admin/dashboard/analytics`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats({
            pending: statsData.data.jobs.pending || 0,
            approved: statsData.data.jobs.approved || 0,
            rejected: statsData.data.jobs.rejected || 0,
          });
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Error fetching pending jobs:', error);
      Alert.alert('Error', error.message || 'Failed to fetch pending jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (jobId: number, jobTitle: string) => {
    Alert.alert(
      'Approve Job Post',
      `Are you sure you want to approve "${jobTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(jobId);
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${URL}/api/admin/jobs/${jobId}/approve`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Job approved successfully');
                fetchPendingJobs(); // Refresh list
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve job');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (jobId: number, jobTitle: string) => {
    Alert.prompt(
      'Reject Job Post',
      `Provide a reason for rejecting "${jobTitle}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Error', 'Rejection reason is required');
              return;
            }

            try {
              setProcessing(jobId);
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${URL}/api/admin/jobs/${jobId}/reject`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ reason: reason.trim() }),
                }
              );

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Job rejected');
                fetchPendingJobs(); // Refresh list
              } else {
                throw new Error(data.message);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject job');
            } finally {
              setProcessing(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderJobCard = ({ item }: { item: PendingJob }) => {
    const isProcessing = processing === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(`/(admin-hidden)/admin-job-approval/${item.id}` as Href)
        }
        disabled={isProcessing}
      >
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            {item.company.logo ? (
              <View style={styles.logoContainer}>
                <Text>🏢</Text>
              </View>
            ) : (
              <View style={[styles.logoContainer, styles.logoPlaceholder]}>
                <Ionicons name="business" size={20} color="#94a3b8" />
              </View>
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.jobTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.companyName}>{item.company.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>
              {item.city}, {item.state}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>
              {item.jobType.replace('_', ' ')}
            </Text>
          </View>
          {item.salaryMin && item.salaryMax && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>
                RM{item.salaryMin.toLocaleString()} - RM
                {item.salaryMax.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>
              Posted: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>Flagged for human review</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id, item.title)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id, item.title)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="checkmark-done-circle-outline"
        size={64}
        color="#94a3b8"
      />
      <Text style={styles.emptyTitle}>No Pending Jobs</Text>
      <Text style={styles.emptyText}>
        All job posts have been reviewed. Great job!
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading pending jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Post Approvals</Text>
        <Text style={styles.headerSubtitle}>
          {stats.pending} pending review
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, styles.approvedCard]}>
          <Text style={styles.statNumber}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statCard, styles.rejectedCard]}>
          <Text style={styles.statNumber}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPendingJobs();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: '#fef3c7',
  },
  approvedCard: {
    backgroundColor: '#d1fae5',
  },
  rejectedCard: {
    backgroundColor: '#fee2e2',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    backgroundColor: '#f1f5f9',
  },
  companyDetails: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#64748b',
  },
  cardInfo: {
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  warningText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
