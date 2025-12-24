import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

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
  applicantStatus: string;
  application: {
    job: {
      title: string;
      company: {
        name: string;
      };
    };
  };
}

export default function OfferPage() {
  const { id } = useLocalSearchParams(); // This is applicationId
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [signedContract, setSignedContract] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOffer();
  }, [id]);

  const fetchOffer = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
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
  };

  const handleResponse = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (status === 'REJECTED') {
      Alert.alert(
        'Reject Offer',
        'Are you sure you want to reject this job offer?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: () => submitResponse(status),
          },
        ]
      );
    } else {
      setModalVisible(true);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSignedContract(result.assets[0]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const submitResponse = async (status: 'ACCEPTED' | 'REJECTED') => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('jwtToken');

      const formData = new FormData();
      formData.append('offerId', String(offer?.id));
      formData.append('status', status);

      if (status === 'ACCEPTED' && signedContract) {
        formData.append('signedContract', {
          uri: signedContract.uri,
          name: signedContract.name,
          type: signedContract.mimeType || 'application/pdf',
        } as any);
      }

      const response = await fetch(`${URL}/api/hire/respond`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // 'Content-Type': 'multipart/form-data', // Let fetch set this automatically
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', `Offer ${status.toLowerCase()} successfully!`, [
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false);
              router.push('/(tabs)/AppliedJobScreen');
            },
          },
        ]);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      console.error('Respond error:', error);
      Alert.alert('Error', 'Failed to submit response');
    } finally {
      setSubmitting(false);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{offer.application.job.title}</Text>
          <Text style={styles.companyName}>
            {offer.application.job.company.name}
          </Text>

          <View style={styles.divider} />

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

          <View style={styles.row}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>
                {offer.contractDuration}
                {offer.durationPeriod ? ` (${offer.durationPeriod})` : ''}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.contractButton}
            onPress={() => Linking.openURL(offer.contractUrl)}
          >
            <Ionicons name="document-text" size={24} color="#1E3A8A" />
            <Text style={styles.contractButtonText}>View Contract PDF</Text>
          </TouchableOpacity>
        </View>

        {offer.applicantStatus === 'PENDING' ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleResponse('REJECTED')}
            >
              <Text style={styles.rejectText}>Reject Offer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleResponse('ACCEPTED')}
            >
              <Text style={styles.acceptText}>Accept Offer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <Ionicons
              name={
                offer.applicantStatus === 'ACCEPTED' ||
                offer.applicantStatus === 'OFFER_ACCEPTED'
                  ? 'checkmark-circle'
                  : 'close-circle'
              }
              size={48}
              color={
                offer.applicantStatus === 'ACCEPTED' ||
                offer.applicantStatus === 'OFFER_ACCEPTED'
                  ? '#10B981'
                  : '#EF4444'
              }
            />
            <Text style={styles.statusText}>
              You have{' '}
              {offer.applicantStatus.replace('OFFER_', '').toLowerCase()} this
              offer.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sign Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Accept & Sign</Text>
            <Text style={styles.modalSubtitle}>
              Please upload the signed contract PDF.
            </Text>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
            >
              <Ionicons
                name={signedContract ? 'document-text' : 'cloud-upload-outline'}
                size={24}
                color="#1E3A8A"
              />
              <Text style={styles.uploadButtonText} numberOfLines={1}>
                {signedContract ? signedContract.name : 'Upload Signed PDF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgree(!agree)}
            >
              <Ionicons
                name={agree ? 'checkbox' : 'square-outline'}
                size={24}
                color={agree ? '#1E3A8A' : '#94A3B8'}
              />
              <Text style={styles.checkboxText}>
                I agree to the terms and conditions in the contract.
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  (!agree || !signedContract) && styles.modalConfirmDisabled,
                ]}
                disabled={!agree || !signedContract || submitting}
                onPress={() => submitResponse('ACCEPTED')}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Submit & Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
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
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  contractButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 40,
  },
  statusText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#334155',
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  checkboxText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
