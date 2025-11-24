import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface JobPost {
  id: number;
  title: string;
  slug: string;
  jobType: string;
  city: string;
  state: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isActive: boolean;
  approvalStatus:
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED_AI'
    | 'APPEALED'
    | 'REJECTED_FINAL';
  rejectionReason: string | null;
  viewCount: number;
  applicationCount: number;
  estimatedHireDaysMin: number | null;
  estimatedHireDaysMax: number | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    applications: number;
  };
  // ✅ Add company field
  company: {
    id: number;
    name: string;
    logo: string | null;
  };
}

export default function JobPostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    | 'all'
    | 'APPROVED'
    | 'PENDING'
    | 'REJECTED_AI'
    | 'APPEALED'
    | 'REJECTED_FINAL'
  >('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'closed'>(
    'all'
  );
  const [error, setError] = useState<string | null>(null);

  // Appeal Modal State
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [selectedJobForAppeal, setSelectedJobForAppeal] =
    useState<JobPost | null>(null);
  const [appealExplanation, setAppealExplanation] = useState('');
  const [appealEvidence, setAppealEvidence] = useState<any[]>([]);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, statusFilter, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  const fetchJobs = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      const response = await fetch(`${URL}/api/employer/jobs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('Fetched jobs:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch jobs');
      }

      setJobs(data.data || []);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      setError(error.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Filter by approval status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.approvalStatus === statusFilter);
    }

    // Filter by active/closed status
    if (activeFilter === 'active') {
      filtered = filtered.filter((job) => job.isActive);
    } else if (activeFilter === 'closed') {
      filtered = filtered.filter((job) => !job.isActive);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.city.toLowerCase().includes(query) ||
          job.state.toLowerCase().includes(query)
      );
    }

    setFilteredJobs(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const getApprovalStatusBadge = (
    status:
      | 'PENDING'
      | 'APPROVED'
      | 'REJECTED_AI'
      | 'APPEALED'
      | 'REJECTED_FINAL'
  ) => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: '#d1fae5',
          color: '#10b981',
          icon: 'checkmark-circle',
          text: 'Approved',
        };
      case 'PENDING':
        return {
          bg: '#fef3c7',
          color: '#f59e0b',
          icon: 'hourglass',
          text: 'Under Review',
        };
      case 'REJECTED_AI':
        return {
          bg: '#fee2e2',
          color: '#ef4444',
          icon: 'close-circle',
          text: 'Rejected by AI',
        };
      case 'APPEALED':
        return {
          bg: '#dbeafe',
          color: '#3b82f6',
          icon: 'document-text',
          text: 'Appeal Submitted',
        };
      case 'REJECTED_FINAL':
        return {
          bg: '#fecaca',
          color: '#dc2626',
          icon: 'ban',
          text: 'Final Rejection',
        };
    }
  };

  const handleOpenAppealModal = (job: JobPost) => {
    setSelectedJobForAppeal(job);
    setAppealExplanation('');
    setAppealEvidence([]);
    setAppealModalVisible(true);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        setAppealEvidence((prev) => [...prev, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setAppealEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAppeal = async () => {
    if (!selectedJobForAppeal) return;

    if (!appealExplanation.trim()) {
      Alert.alert('Error', 'Please provide an explanation for your appeal');
      return;
    }

    setSubmittingAppeal(true);

    try {
      const token = await AsyncStorage.getItem('jwtToken');

      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append('explanation', appealExplanation);

      // Add evidence files
      appealEvidence.forEach((file, index) => {
        formData.append('evidence', {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name || `evidence-${index}`,
        } as any);
      });

      const response = await fetch(
        `${URL}/api/job-appeals/employer/jobs/${selectedJobForAppeal.id}/appeal`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit appeal');
      }

      Alert.alert(
        'Appeal Submitted',
        'Your appeal has been submitted and will be reviewed by our team.',
        [
          {
            text: 'OK',
            onPress: () => {
              setAppealModalVisible(false);
              fetchJobs(); // Refresh jobs list
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting appeal:', error);
      Alert.alert('Error', error.message || 'Failed to submit appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleToggleStatus = async (jobId: number, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Close Job Post' : 'Activate Job Post',
      `Are you sure you want to ${
        currentStatus ? 'close' : 'activate'
      } this job post?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/jobs/${jobId}/toggle-status`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to update status');
              }

              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId ? { ...job, isActive: !currentStatus } : job
                )
              );

              Alert.alert('Success', data.message);
            } catch (error: any) {
              console.error('Error toggling status:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to update job status'
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteJob = async (jobId: number, jobTitle: string) => {
    Alert.alert(
      'Delete Job Post',
      `Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwtToken');

              const response = await fetch(
                `${URL}/api/employer/jobs/${jobId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Failed to delete job');
              }

              setJobs((prev) => prev.filter((job) => job.id !== jobId));

              Alert.alert('Success', 'Job post deleted successfully');
            } catch (error: any) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', error.message || 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const handleViewRejectionReason = (title: string, reason: string | null) => {
    Alert.alert('Job Rejected', reason || 'No rejection reason provided', [
      { text: 'OK' },
    ]);
  };

  const renderStatusFilterButton = (
    label: string,
    value:
      | 'all'
      | 'APPROVED'
      | 'PENDING'
      | 'REJECTED_AI'
      | 'APPEALED'
      | 'REJECTED_FINAL',
    count: number
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === value && styles.filterButtonActive,
      ]}
      onPress={() => setStatusFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          statusFilter === value && styles.filterButtonTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderActiveFilterButton = (
    label: string,
    value: 'all' | 'active' | 'closed',
    count: number
  ) => (
    <TouchableOpacity
      style={[
        styles.secondaryFilterButton,
        activeFilter === value && styles.secondaryFilterButtonActive,
      ]}
      onPress={() => setActiveFilter(value)}
    >
      <Text
        style={[
          styles.secondaryFilterText,
          activeFilter === value && styles.secondaryFilterTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderJobCard = ({ item }: { item: JobPost }) => {
    const approvalBadge = getApprovalStatusBadge(item.approvalStatus);
    const canAppeal = item.approvalStatus === 'REJECTED_AI';

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() =>
          router.push(`/(employer-hidden)/job-post-details/${item.id}` as Href)
        }
      >
        <View style={styles.jobCardHeader}>
          {/* ✅ Company Logo */}
          <View style={styles.companyLogoContainer}>
            {item.company?.logo ? (
              <Image
                source={{ uri: item.company.logo }}
                style={styles.companyLogo}
              />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Text style={styles.companyLogoText}>
                  {item.company?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.jobMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#64748B" />
                <Text style={styles.metaText}>
                  {item.city}, {item.state}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={14} color="#64748B" />
                <Text style={styles.metaText}>
                  {item.jobType.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Approval Status Badge */}
          <View
            style={[
              styles.approvalStatusBadge,
              { backgroundColor: approvalBadge.bg },
            ]}
          >
            <Ionicons
              name={approvalBadge.icon as any}
              size={14}
              color={approvalBadge.color}
            />
            <Text
              style={[
                styles.approvalStatusText,
                { color: approvalBadge.color },
              ]}
            >
              {approvalBadge.text}
            </Text>
          </View>
        </View>

        {/* Active/Closed Badge - Only show for approved jobs */}
        {item.approvalStatus === 'APPROVED' && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.isActive ? '#10B98115' : '#64748B15' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.isActive ? '#10B981' : '#64748B' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: item.isActive ? '#10B981' : '#64748B' },
              ]}
            >
              {item.isActive ? 'Active' : 'Closed'}
            </Text>
          </View>
        )}

        {item.salaryMin && item.salaryMax && (
          <View style={styles.salaryContainer}>
            <Ionicons name="cash-outline" size={16} color="#1E3A8A" />
            <Text style={styles.salaryText}>
              RM {item.salaryMin.toLocaleString()} - RM{' '}
              {item.salaryMax.toLocaleString()}
            </Text>
          </View>
        )}

        {/* ✅ NEW: Estimated Hire Time */}
        {item.approvalStatus === 'APPROVED' &&
          (item.estimatedHireDaysMin || item.estimatedHireDaysMax) && (
            <View style={styles.estimationContainer}>
              <Ionicons name="time-outline" size={16} color="#8B5CF6" />
              <Text style={styles.estimationText}>
                Est. hire time: {item.estimatedHireDaysMin}–
                {item.estimatedHireDaysMax} days
              </Text>
            </View>
          )}

        {/* Approval Status Messages */}
        {item.approvalStatus === 'PENDING' && (
          <View style={styles.pendingInfo}>
            <Ionicons name="information-circle" size={16} color="#f59e0b" />
            <Text style={styles.pendingText}>
              Your job post is being reviewed by our AI system. You'll be
              notified once approved.
            </Text>
          </View>
        )}

        {item.approvalStatus === 'REJECTED_AI' && (
          <View style={styles.rejectionContainer}>
            <TouchableOpacity
              style={styles.rejectionBox}
              onPress={() =>
                handleViewRejectionReason(item.title, item.rejectionReason)
              }
            >
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.rejectionText} numberOfLines={2}>
                {item.rejectionReason ||
                  'This job post was rejected by AI. Tap to view details.'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ef4444" />
            </TouchableOpacity>

            {/* Appeal Button */}
            <TouchableOpacity
              style={styles.appealButton}
              onPress={() => handleOpenAppealModal(item)}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.appealButtonText}>Appeal Decision</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.approvalStatus === 'APPEALED' && (
          <View style={styles.appealedInfo}>
            <Ionicons name="document-text" size={16} color="#3b82f6" />
            <Text style={styles.appealedText}>
              Your appeal is being reviewed by our team. We'll notify you of the
              decision soon.
            </Text>
          </View>
        )}

        {item.approvalStatus === 'REJECTED_FINAL' && (
          <View style={styles.finalRejectionBox}>
            <Ionicons name="ban" size={16} color="#dc2626" />
            <Text style={styles.finalRejectionText}>
              This job post has been reviewed and the rejection decision is
              final.
            </Text>
          </View>
        )}

        <View style={styles.jobCardFooter}>
          <View style={styles.statContainer}>
            {item.approvalStatus === 'APPROVED' && (
              <>
                <View style={styles.stat}>
                  <Ionicons name="eye-outline" size={18} color="#64748B" />
                  <Text style={styles.statText}>
                    {item.viewCount || 0} views
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="people" size={18} color="#64748B" />
                  <Text style={styles.statText}>
                    {item.applicationCount || 0} applicant
                    {item.applicationCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.stat}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
              <Text style={styles.statText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Action Buttons - Only for approved jobs */}
          {item.approvalStatus === 'APPROVED' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleToggleStatus(item.id, item.isActive)}
              >
                <Ionicons
                  name={
                    item.isActive
                      ? 'pause-circle-outline'
                      : 'play-circle-outline'
                  }
                  size={20}
                  color="#1E3A8A"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push(
                    `/(employer-hidden)/job-post-details/${item.id}/edit` as Href
                  )
                }
              >
                <Ionicons name="create-outline" size={20} color="#F59E0B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteJob(item.id, item.title)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const approvedCount = jobs.filter(
    (j) => j.approvalStatus === 'APPROVED'
  ).length;
  const pendingCount = jobs.filter(
    (j) => j.approvalStatus === 'PENDING'
  ).length;
  const rejectedAICount = jobs.filter(
    (j) => j.approvalStatus === 'REJECTED_AI'
  ).length;
  const appealedCount = jobs.filter(
    (j) => j.approvalStatus === 'APPEALED'
  ).length;
  const rejectedFinalCount = jobs.filter(
    (j) => j.approvalStatus === 'REJECTED_FINAL'
  ).length;
  const activeCount = jobs.filter(
    (j) => j.isActive && j.approvalStatus === 'APPROVED'
  ).length;
  const closedCount = jobs.filter(
    (j) => !j.isActive && j.approvalStatus === 'APPROVED'
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Approval Status Filter */}
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterContainer}>
          {renderStatusFilterButton('All', 'all', jobs.length)}
          {renderStatusFilterButton('Pending', 'PENDING', pendingCount)}
          {renderStatusFilterButton('Approved', 'APPROVED', approvedCount)}
          {renderStatusFilterButton(
            'AI Rejected',
            'REJECTED_AI',
            rejectedAICount
          )}
          {renderStatusFilterButton('Appealed', 'APPEALED', appealedCount)}
          {renderStatusFilterButton(
            'Final Rejection',
            'REJECTED_FINAL',
            rejectedFinalCount
          )}
        </View>

        {/* Active/Closed Filter - Only show when viewing approved jobs */}
        {statusFilter === 'APPROVED' && (
          <>
            <Text style={styles.filterLabel}>Visibility</Text>
            <View style={styles.filterContainer}>
              {renderActiveFilterButton('All', 'all', approvedCount)}
              {renderActiveFilterButton('Active', 'active', activeCount)}
              {renderActiveFilterButton('Closed', 'closed', closedCount)}
            </View>
          </>
        )}
      </View>

      {/* Job List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {searchQuery || statusFilter !== 'all' || activeFilter !== 'all'
              ? 'No jobs found'
              : 'No job posts yet'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || statusFilter !== 'all' || activeFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Create your first job post to start hiring'}
          </Text>
          {!searchQuery && statusFilter === 'all' && activeFilter === 'all' && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(employer-hidden)/create-job')}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Job Post</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(employer-hidden)/create-job')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Appeal Modal */}
      <Modal
        visible={appealModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAppealModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appeal Job Rejection</Text>
              <TouchableOpacity onPress={() => setAppealModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalJobTitle}>
                {selectedJobForAppeal?.title}
              </Text>

              <View style={styles.rejectionReasonBox}>
                <Text style={styles.rejectionReasonLabel}>
                  Rejection Reason:
                </Text>
                <Text style={styles.rejectionReasonText}>
                  {selectedJobForAppeal?.rejectionReason ||
                    'No reason provided'}
                </Text>
              </View>

              <Text style={styles.inputLabel}>
                Explanation <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Explain why this job post is legitimate and should be approved..."
                placeholderTextColor="#94A3B8"
                value={appealExplanation}
                onChangeText={setAppealExplanation}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>
                Supporting Documents (Optional)
              </Text>
              <Text style={styles.helperText}>
                Upload company registration, licenses, or other proof
              </Text>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickDocument}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color="#1E3A8A"
                />
                <Text style={styles.uploadButtonText}>Upload Files</Text>
              </TouchableOpacity>

              {appealEvidence.length > 0 && (
                <View style={styles.evidenceList}>
                  {appealEvidence.map((file, index) => (
                    <View key={index} style={styles.evidenceItem}>
                      <Ionicons name="document" size={20} color="#64748B" />
                      <Text style={styles.evidenceFileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveEvidence(index)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAppealModalVisible(false)}
                disabled={submittingAppeal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submittingAppeal && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitAppeal}
                disabled={submittingAppeal}
              >
                {submittingAppeal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Appeal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ... (Keep all existing styles and add new ones below)

const styles = StyleSheet.create({
  // ... (All existing styles remain the same)
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
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  secondaryFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryFilterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  secondaryFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  secondaryFilterTextActive: {
    color: '#3B82F6',
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  approvalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    height: 32,
  },
  approvalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  salaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pendingText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  rejectionContainer: {
    marginBottom: 12,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  appealButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  appealedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  appealedText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  finalRejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  finalRejectionText: {
    flex: 1,
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
    fontWeight: '500',
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    flex: 1,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // ✅ NEW: Appeal Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  modalJobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  rejectionReasonBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 16,
    minHeight: 120,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  evidenceList: {
    marginTop: 12,
    gap: 8,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  evidenceFileName: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  estimationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  estimationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7C3AED',
  },
  companyLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
