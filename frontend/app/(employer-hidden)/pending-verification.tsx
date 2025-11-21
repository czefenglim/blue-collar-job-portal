import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface CompanyData {
  id: number;
  name: string;
  verificationStatus: string;
  createdAt: string;
  industry?: { name: string };
  city?: string;
  state?: string;
}

export default function PendingVerificationScreen() {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCompanyStatus();
  }, []);

  const fetchCompanyStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${URL}/api/employer/verification/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyData(data.data);
      }
    } catch (error) {
      console.error('Error fetching company status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/SelectRoleScreen');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={100} color="#F59E0B" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Verification in Progress</Text>

        {/* Description */}
        <Text style={styles.description}>
          Thank you for submitting your company profile! Our team is currently
          reviewing your information.
        </Text>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.timelineText}>Profile Submitted</Text>
          </View>
          <View style={styles.timelineItem}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
            <Text style={styles.timelineText}>Under Review (Current)</Text>
          </View>
          <View style={styles.timelineItem}>
            <Ionicons name="ellipse-outline" size={24} color="#CBD5E1" />
            <Text style={[styles.timelineText, { color: '#94A3B8' }]}>
              Approval Pending
            </Text>
          </View>
        </View>

        {/* Expected Time */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Expected Review Time</Text>
            <Text style={styles.infoText}>
              Typically 1-3 business days. We'll notify you via email once the
              review is complete.
            </Text>
          </View>
        </View>

        {/* Company Details */}
        {companyData && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Submitted Company Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company Name:</Text>
              <Text style={styles.detailValue}>{companyData.name}</Text>
            </View>

            {companyData.industry && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Industry:</Text>
                <Text style={styles.detailValue}>
                  {companyData.industry.name}
                </Text>
              </View>
            )}

            {companyData.city && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>
                  {companyData.city}, {companyData.state}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Submitted:</Text>
              <Text style={styles.detailValue}>
                {new Date(companyData.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  timelineCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
});
