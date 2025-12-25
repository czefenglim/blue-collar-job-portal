import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface CompanyDetails {
  id: number;
  name: string;
  name_ms: string | null;
  name_zh: string | null;
  name_ta: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  companySize: string | null;
  isVerified: boolean;
  verificationStatus: string;
  verificationDocument: string | null;
  verificationRemark: string | null;
  verifiedDate: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    createdAt: string;
  };
  industry: {
    id: number;
    name: string;
    slug: string;
  } | null;
  verification: {
    businessDocument: string | null;
    documentType: string | null;
    documentName: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    status: string | null;
    submittedAt: string;
  } | null;
  jobs: Array<{
    id: number;
    title: string;
    jobType: string;
    isActive: boolean;
    approvalStatus: string;
    createdAt: string;
  }>;
}

export default function CompanyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');

      const response = await fetch(`${API_URL}/api/admin/companies/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setCompany(data.data);
      }
    } catch (error: any) {
      console.error('Error fetching company details:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to fetch company details'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!company) return;

    Alert.alert(
      'Approve Company',
      `Are you sure you want to approve "${company.name}"? The employer will be notified and can start posting jobs.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${API_URL}/api/admin/companies/${company.id}/approve`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Company approved successfully', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              }
            } catch (error: any) {
              console.error('Error approving company:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to approve company'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!company) return;

    Alert.prompt(
      'Reject Company',
      `Please provide a detailed reason for rejecting "${company.name}". This will be sent to the employer.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason: any) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Error', 'Rejection reason is required');
              return;
            }

            if (reason.trim().length < 10) {
              Alert.alert(
                'Error',
                'Please provide a more detailed reason (at least 10 characters)'
              );
              return;
            }

            try {
              setProcessing(true);
              const token = await AsyncStorage.getItem('adminToken');

              const response = await fetch(
                `${API_URL}/api/admin/companies/${company.id}/reject`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Company rejected', [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]);
              }
            } catch (error: any) {
              console.error('Error rejecting company:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to reject company'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const openDocument = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open document');
    });
  };

  const openWebsite = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open website');
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading company details...</Text>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Company Not Found</Text>
        <Text style={styles.errorText}>
          The company you&apos;re looking for doesn&apos;t exist.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canTakeAction = company.verificationStatus === 'PENDING';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              company.verificationStatus === 'APPROVED' &&
                styles.statusApproved,
              company.verificationStatus === 'REJECTED' &&
                styles.statusRejected,
              company.verificationStatus === 'PENDING' && styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{company.verificationStatus}</Text>
          </View>
        </View>

        {/* Company Info Card */}
        <View style={styles.card}>
          <View style={styles.companyHeader}>
            {company.logo ? (
              <Image source={{ uri: company.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="business" size={32} color="#94a3b8" />
              </View>
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              {company.industry && (
                <View style={styles.industryBadge}>
                  <Text style={styles.industryText}>
                    {company.industry.name}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {company.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{company.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoGrid}>
              {company.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{company.email}</Text>
                </View>
              )}
              {company.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{company.phone}</Text>
                </View>
              )}
              {company.website && (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => openWebsite(company.website!)}
                >
                  <Ionicons name="globe-outline" size={20} color="#3b82f6" />
                  <Text style={styles.infoLabel}>Website:</Text>
                  <Text style={[styles.infoValue, styles.linkText]}>
                    {company.website}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(company.address || company.city || company.state) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#64748b" />
                <Text style={styles.infoValue}>
                  {[
                    company.address,
                    company.city,
                    company.state,
                    company.postcode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            </View>
          )}

          {company.companySize && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Size</Text>
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color="#64748b" />
                <Text style={styles.infoValue}>
                  {company.companySize.replace('_', ' ')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* User Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employer Account</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#64748b" />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{company.user.fullName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#64748b" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{company.user.email}</Text>
            </View>
            {company.user.phoneNumber && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#64748b" />
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{company.user.phoneNumber}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.infoLabel}>Registered:</Text>
              <Text style={styles.infoValue}>
                {new Date(company.user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Verification Documents */}
        {(company.verificationDocument ||
          company.verification?.businessDocument) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verification Documents</Text>
            {company.verificationDocument && (
              <TouchableOpacity
                style={styles.documentCard}
                onPress={() => openDocument(company.verificationDocument!)}
              >
                <Ionicons name="document-text" size={24} color="#3b82f6" />
                <Text style={styles.documentName}>Business Document</Text>
                <Ionicons name="open-outline" size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
            {company.verification?.businessDocument && (
              <View style={styles.verificationInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="checkbox-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Document Type:</Text>
                  <Text style={styles.infoValue}>
                    {company.verification.documentType || 'N/A'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color="#64748b" />
                  <Text style={styles.infoLabel}>Submitted:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(
                      company.verification.submittedAt
                    ).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Rejection Remark (if rejected) */}
        {company.verificationStatus === 'REJECTED' &&
          company.verificationRemark && (
            <View style={styles.card}>
              <View style={styles.remarkHeader}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
                <Text style={styles.cardTitle}>Rejection Reason</Text>
              </View>
              <Text style={styles.remarkText}>
                {company.verificationRemark}
              </Text>
            </View>
          )}

        {/* Jobs Posted */}
        {company.jobs && company.jobs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Jobs Posted ({company.jobs.length})
            </Text>
            {company.jobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobType}>
                    {job.jobType.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.jobStatus}>
                  <View
                    style={[
                      styles.jobBadge,
                      job.approvalStatus === 'APPROVED' &&
                        styles.jobBadgeApproved,
                      job.approvalStatus === 'REJECTED' &&
                        styles.jobBadgeRejected,
                      job.approvalStatus === 'PENDING' &&
                        styles.jobBadgePending,
                    ]}
                  >
                    <Text style={styles.jobBadgeText}>
                      {job.approvalStatus}
                    </Text>
                  </View>
                  {job.isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10b981"
                    />
                  ) : (
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacing for fixed buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Action Buttons */}
      {canTakeAction && (
        <View style={styles.fixedActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIconButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusContainer: {
    padding: 16,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusApproved: {
    backgroundColor: '#d1fae5',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 16,
  },
  logoPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  industryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  industryText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  linkText: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  verificationInfo: {
    gap: 8,
  },
  remarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  remarkText: {
    fontSize: 14,
    color: '#475569',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  jobCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  jobType: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  jobStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobBadgePending: {
    backgroundColor: '#fef3c7',
  },
  jobBadgeApproved: {
    backgroundColor: '#d1fae5',
  },
  jobBadgeRejected: {
    backgroundColor: '#fee2e2',
  },
  jobBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  fixedActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
