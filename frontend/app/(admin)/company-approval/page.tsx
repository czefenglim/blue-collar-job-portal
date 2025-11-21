import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:3000';

interface Company {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  verificationStatus: string;
  verificationDocument: string | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    phoneNumber: string | null;
  };
  industry: {
    id: number;
    name: string;
    slug: string;
  } | null;
  verification: {
    businessDocument: string | null;
    documentType: string | null;
    submittedAt: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function CompanyApprovalScreen() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPendingCompanies();
  }, [pagination.page]);

  const fetchPendingCompanies = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        Alert.alert('Error', 'Admin token not found');
        return;
      }

      const url = `${API_URL}/api/admin/companies/pending?page=${pagination.page}&limit=${pagination.limit}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCompanies(data.data.companies);
        setPagination(data.data.pagination);
      }
    } catch (error: any) {
      console.error('Error fetching pending companies:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to fetch pending companies'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingCompanies();
  };

  const handleApprove = async (companyId: number, companyName: string) => {
    Alert.alert(
      'Approve Company',
      `Are you sure you want to approve "${companyName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(companyId);
              const token = await AsyncStorage.getItem('adminToken');
              if (!token) {
                Alert.alert('Error', 'Admin token not found');
                return;
              }

              const response = await fetch(
                `${API_URL}/api/admin/companies/${companyId}/approve`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Company approved successfully');
                fetchPendingCompanies(); // Refresh list
              }
            } catch (error: any) {
              console.error('Error approving company:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to approve company'
              );
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (companyId: number, companyName: string) => {
    Alert.prompt(
      'Reject Company',
      `Please provide a reason for rejecting "${companyName}":`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Error', 'Rejection reason is required');
              return;
            }

            try {
              setProcessing(companyId);
              const token = await AsyncStorage.getItem('adminToken');
              if (!token) {
                Alert.alert('Error', 'Admin token not found');
                return;
              }

              const response = await fetch(
                `${API_URL}/api/admin/companies/${companyId}/reject`,
                {
                  method: 'POST',
                  body: JSON.stringify({ reason: reason.trim() }),
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Company rejected');
                fetchPendingCompanies(); // Refresh list
              }
            } catch (error: any) {
              console.error('Error rejecting company:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to reject company'
              );
            } finally {
              setProcessing(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderCompanyCard = ({ item }: { item: Company }) => {
    const isProcessing = processing === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(`/(admin-hidden)/company-approval/${item.id}` as Href)
        }
        disabled={isProcessing}
      >
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="business" size={24} color="#94a3b8" />
              </View>
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{item.name}</Text>
              <Text style={styles.companyEmail}>{item.user.email}</Text>
              {item.industry && (
                <View style={styles.industryBadge}>
                  <Text style={styles.industryText}>{item.industry.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>{item.user.fullName}</Text>
          </View>
          {item.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>
              Submitted: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {item.verification?.businessDocument && (
            <View style={styles.infoRow}>
              <Ionicons
                name="document-attach-outline"
                size={16}
                color="#3b82f6"
              />
              <Text style={styles.documentText}>Document attached</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id, item.name)}
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
            onPress={() => handleApprove(item.id, item.name)}
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
      <Text style={styles.emptyTitle}>No Pending Approvals</Text>
      <Text style={styles.emptyText}>
        All companies have been reviewed. Great job!
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading pending companies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          {pagination.total} pending verification
          {pagination.total !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={companies}
        renderItem={renderCompanyCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Pagination */}
      {pagination.pages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              pagination.page === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
            disabled={pagination.page === 1}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={pagination.page === 1 ? '#94a3b8' : '#3b82f6'}
            />
          </TouchableOpacity>

          <Text style={styles.paginationText}>
            Page {pagination.page} of {pagination.pages}
          </Text>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              pagination.page === pagination.pages &&
                styles.paginationButtonDisabled,
            ]}
            onPress={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            disabled={pagination.page === pagination.pages}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                pagination.page === pagination.pages ? '#94a3b8' : '#3b82f6'
              }
            />
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 16,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  logoPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  companyEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  industryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  industryText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  cardInfo: {
    marginBottom: 16,
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
  documentText: {
    fontSize: 14,
    color: '#3b82f6',
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 16,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
});
