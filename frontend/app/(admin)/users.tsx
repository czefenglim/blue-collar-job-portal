'use client';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  company?: {
    name: string;
    isVerified: boolean;
  };
  _count: {
    applications: number;
    createdJobs: number;
  };
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, page]);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');

      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await fetch(
        `${URL}/api/admin/users?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('adminToken');
          router.replace('/(admin-hidden)/login');
        }
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (
    userId: number,
    newStatus: string,
    userName: string
  ) => {
    Alert.alert(
      `${
        newStatus === 'SUSPENDED'
          ? 'Suspend'
          : newStatus === 'ACTIVE'
          ? 'Activate'
          : 'Delete'
      } User`,
      `Are you sure you want to ${newStatus.toLowerCase()} ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'DELETED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${URL}/api/admin/users/${userId}/status`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: newStatus,
                    reason: `Updated by admin`,
                  }),
                }
              );

              const data = await response.json();

              if (response.ok && data.success) {
                Alert.alert('Success', data.message);
                fetchUsers();
              } else {
                Alert.alert('Error', data.message);
              }
            } catch (error) {
              console.error('Update status error:', error);
              Alert.alert('Error', 'Failed to update user status');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchUsers();
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      {/* User Header */}
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {item.fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'ACTIVE'
              ? styles.statusActive
              : item.status === 'SUSPENDED'
              ? styles.statusSuspended
              : styles.statusDeleted,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'ACTIVE'
                ? styles.statusTextActive
                : item.status === 'SUSPENDED'
                ? styles.statusTextSuspended
                : styles.statusTextDeleted,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      {/* User Details */}
      <View style={styles.userDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="briefcase-outline" size={16} color="#64748B" />
          <Text style={styles.detailText}>
            {item.role === 'JOB_SEEKER' ? 'Job Seeker' : 'Employer'}
          </Text>
        </View>

        {item.company && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={16} color="#64748B" />
            <Text style={styles.detailText}>{item.company.name}</Text>
            {item.company.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            )}
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748B" />
          <Text style={styles.detailText}>
            Joined {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="stats-chart-outline" size={16} color="#64748B" />
          <Text style={styles.detailText}>
            {item.role === 'JOB_SEEKER'
              ? `${item._count.applications} applications`
              : `${item._count.createdJobs} jobs posted`}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {item.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.suspendButton]}
            onPress={() =>
              handleUpdateStatus(item.id, 'SUSPENDED', item.fullName)
            }
          >
            <Ionicons name="ban-outline" size={18} color="#F97316" />
            <Text style={styles.suspendButtonText}>Suspend</Text>
          </TouchableOpacity>
        )}

        {item.status === 'SUSPENDED' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.activateButton]}
            onPress={() => handleUpdateStatus(item.id, 'ACTIVE', item.fullName)}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#15803D"
            />
            <Text style={styles.activateButtonText}>Activate</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'DELETED' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() =>
              handleUpdateStatus(item.id, 'DELETED', item.fullName)
            }
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading Users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchUsers}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              !roleFilter && styles.filterButtonActive,
            ]}
            onPress={() => setRoleFilter('')}
          >
            <Text
              style={[
                styles.filterButtonText,
                !roleFilter && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              roleFilter === 'JOB_SEEKER' && styles.filterButtonActive,
            ]}
            onPress={() => setRoleFilter('JOB_SEEKER')}
          >
            <Text
              style={[
                styles.filterButtonText,
                roleFilter === 'JOB_SEEKER' && styles.filterButtonTextActive,
              ]}
            >
              Job Seekers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              roleFilter === 'EMPLOYER' && styles.filterButtonActive,
            ]}
            onPress={() => setRoleFilter('EMPLOYER')}
          >
            <Text
              style={[
                styles.filterButtonText,
                roleFilter === 'EMPLOYER' && styles.filterButtonTextActive,
              ]}
            >
              Employers
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerPlaceholder: {
    width: 40,
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusSuspended: {
    backgroundColor: '#FEF2F2',
  },
  statusDeleted: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#15803D',
  },
  statusTextSuspended: {
    color: '#DC2626',
  },
  statusTextDeleted: {
    color: '#64748B',
  },
  userDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  suspendButton: {
    backgroundColor: '#FFF7ED',
  },
  suspendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  activateButton: {
    backgroundColor: '#F0FDF4',
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
});
