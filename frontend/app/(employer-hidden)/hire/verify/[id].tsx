import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface OfferDetails {
  id: number;
  startDate: string;
  contractDuration: string;
  durationPeriod?: string;
  salaryAmount: number;
  salaryCurrency: string;
  payFrequency: string;
  contractUrl: string;
  signedContractUrl?: string;
  applicantStatus: string;
  applicantSignature: string;
  application: {
    user: {
      fullName: string;
      email: string;
    };
    job: {
      title: string;
    };
  };
}

export default function VerifyHirePage() {
  const { id } = useLocalSearchParams(); // This is applicationId (from route param)
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchOffer = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwtToken');
      // We use the same endpoint to get offer details by application ID
      const response = await fetch(`${URL}/api/hire/offer/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setOffer(data.data);
      } else {
        Alert.alert('Error', data.message);
        router.back();
      }
    } catch (error) {
      console.error('Fetch offer error:', error);
      Alert.alert('Error', 'Failed to load offer details');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const token = await AsyncStorage.getItem('jwtToken');

      const response = await fetch(`${URL}/api/hire/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId: offer?.id,
          verified: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success',
          'Hire confirmed! The applicant has been officially hired.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/(employer)/applicants'),
            },
          ]
        );
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      console.error('Verify error:', error);
      Alert.alert('Error', 'Failed to verify hire');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  if (!offer) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <Text style={styles.jobTitle}>{offer.application.job.title}</Text>
          <Text style={styles.applicantName}>
            Applicant: {offer.application.user.fullName}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Offer Terms</Text>
          <View style={styles.row}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Start Date</Text>
              <Text style={styles.value}>
                {new Date(offer.startDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Salary</Text>
              <Text style={styles.value}>
                {offer.salaryCurrency} {offer.salaryAmount} /{' '}
                {offer.payFrequency}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.contractButton}
            onPress={() =>
              Linking.openURL(offer.signedContractUrl || offer.contractUrl)
            }
          >
            <Ionicons name="document-text" size={24} color="#1E3A8A" />
            <Text style={styles.contractButtonText}>
              {offer.signedContractUrl
                ? 'View Signed Contract PDF'
                : 'View Contract PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Applicant Signature</Text>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>{offer.applicantSignature}</Text>
          </View>
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.verifiedText}>Signed electronically</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            verifying && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.verifyButtonText}>Confirm & Hire</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By clicking &quot;Confirm & Hire&quot;, you acknowledge that you have
          reviewed the signed contract and accept the applicant as an employee.
        </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  applicantName: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  contractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  contractButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  signatureBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  signatureText: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 24,
    color: '#1E3A8A',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verifiedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#C4B5FD',
    shadowOpacity: 0,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
