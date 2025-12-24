import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

export default function HirePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const [contractDuration, setContractDuration] = useState<
    'Fixed-term' | 'Permanent'
  >('Permanent');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('months');
  const [showDurationUnitPicker, setShowDurationUnitPicker] = useState(false);

  const durationUnitOptions = [
    { label: 'Month(s)', value: 'months' },
    { label: 'Year(s)', value: 'years' },
  ];

  const [salaryAmount, setSalaryAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState<
    'Daily' | 'Weekly' | 'Monthly'
  >('Monthly');

  const [contractFile, setContractFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCompliant, setIsCompliant] = useState(false);

  const handleConfirmHire = async () => {
    // Validation
    if (!startDate) {
      Alert.alert('Error', 'Please select a start date');
      return;
    }
    if (contractDuration === 'Fixed-term' && !durationValue) {
      Alert.alert('Error', 'Please specify the contract duration value');
      return;
    }
    if (!salaryAmount) {
      Alert.alert('Error', 'Please enter the salary amount');
      return;
    }
    if (!contractFile) {
      Alert.alert('Error', 'Please upload the contract PDF');
      return;
    }
    if (!isConfirmed || !isCompliant) {
      Alert.alert('Error', 'Please confirm all checkboxes');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwtToken');

      const formData = new FormData();
      formData.append('applicationId', id as string);
      formData.append('startDate', startDate.toISOString());
      formData.append('contractDuration', contractDuration);
      formData.append(
        'durationPeriod',
        contractDuration === 'Fixed-term'
          ? `${durationValue} ${durationUnit}`
          : ''
      );
      formData.append('salaryAmount', salaryAmount);
      formData.append('salaryCurrency', 'MYR');
      formData.append('payFrequency', payFrequency);
      formData.append('employerConfirmed', String(isConfirmed));
      formData.append('compliesWithLaws', String(isCompliant));

      // Append file
      // Note: React Native FormData expects an object with uri, name, and type
      formData.append('contract', {
        uri: contractFile.uri,
        name: contractFile.name || 'contract.pdf',
        type: contractFile.mimeType || 'application/pdf',
      } as any);

      const response = await fetch(`${URL}/api/hire/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Offer sent successfully!', [
          {
            text: 'OK',
            onPress: () => router.push('/(employer)/applicants'),
          },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to create offer');
      }
    } catch (error) {
      console.error('Hire error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setContractFile(result.assets[0]);
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. Start Date */}
          <View style={styles.section}>
            <Text style={styles.label}>1. Start Date</Text>
            <TouchableOpacity
              style={styles.inputButton}
              onPress={() => setDatePickerVisibility(true)}
            >
              <Text
                style={startDate ? styles.inputText : styles.placeholderText}
              >
                {startDate
                  ? startDate.toLocaleDateString()
                  : 'Select Start Date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              onConfirm={(date) => {
                setStartDate(date);
                setDatePickerVisibility(false);
              }}
              onCancel={() => setDatePickerVisibility(false)}
            />
          </View>

          {/* 2. Contract Duration */}
          <View style={styles.section}>
            <Text style={styles.label}>2. Contract Duration</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  contractDuration === 'Fixed-term' && styles.radioButtonActive,
                ]}
                onPress={() => setContractDuration('Fixed-term')}
              >
                <Text
                  style={[
                    styles.radioText,
                    contractDuration === 'Fixed-term' && styles.radioTextActive,
                  ]}
                >
                  Fixed-term
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  contractDuration === 'Permanent' && styles.radioButtonActive,
                ]}
                onPress={() => setContractDuration('Permanent')}
              >
                <Text
                  style={[
                    styles.radioText,
                    contractDuration === 'Permanent' && styles.radioTextActive,
                  ]}
                >
                  Permanent
                </Text>
              </TouchableOpacity>
            </View>

            {contractDuration === 'Fixed-term' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subLabel}>Duration</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 12 }]}
                    placeholder="e.g. 6"
                    value={durationValue}
                    onChangeText={setDurationValue}
                    keyboardType="numeric"
                  />
                  <View
                    style={[
                      styles.input,
                      {
                        width: 150,
                        padding: 0,
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowDurationUnitPicker(true)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {durationUnitOptions.find(
                          (o) => o.value === durationUnit
                        )?.label || durationUnit}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Duration Unit Picker Modal */}
          <Modal
            visible={showDurationUnitPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDurationUnitPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowDurationUnitPicker(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Duration Unit</Text>
                  <TouchableOpacity
                    onPress={() => setShowDurationUnitPicker(false)}
                  >
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={durationUnitOptions}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        durationUnit === item.value && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setDurationUnit(item.value);
                        setShowDurationUnitPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          durationUnit === item.value &&
                            styles.modalItemTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {durationUnit === item.value && (
                        <Ionicons name="checkmark" size={20} color="#1E3A8A" />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          {/* 3. Salary Details */}
          <View style={styles.section}>
            <Text style={styles.label}>3. Salary Details</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subLabel}>Amount (MYR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={salaryAmount}
                  onChangeText={setSalaryAmount}
                />
              </View>
            </View>

            <Text style={[styles.subLabel, { marginTop: 12 }]}>
              Pay Frequency
            </Text>
            <View style={styles.frequencyGroup}>
              {['Daily', 'Weekly', 'Monthly'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.freqButton,
                    payFrequency === freq && styles.freqButtonActive,
                  ]}
                  onPress={() => setPayFrequency(freq as any)}
                >
                  <Text
                    style={[
                      styles.freqText,
                      payFrequency === freq && styles.freqTextActive,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 4. Contract PDF */}
          <View style={styles.section}>
            <Text style={styles.label}>4. Contract PDF</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
            >
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#1E3A8A"
              />
              <Text style={styles.uploadText}>
                {contractFile ? contractFile.name : 'Upload Contract (PDF)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. Confirmation */}
          <View style={styles.section}>
            <Text style={styles.label}>5. Employer Confirmation</Text>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsConfirmed(!isConfirmed)}
            >
              <Ionicons
                name={isConfirmed ? 'checkbox' : 'square-outline'}
                size={24}
                color={isConfirmed ? '#1E3A8A' : '#94A3B8'}
              />
              <Text style={styles.checkboxText}>
                I confirm this offer is accurate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsCompliant(!isCompliant)}
            >
              <Ionicons
                name={isCompliant ? 'checkbox' : 'square-outline'}
                size={24}
                color={isCompliant ? '#1E3A8A' : '#94A3B8'}
              />
              <Text style={styles.checkboxText}>
                This contract complies with local labor laws
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleConfirmHire}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Send Offer</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#334155',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputText: {
    fontSize: 15,
    color: '#334155',
  },
  placeholderText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  radioButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#1E3A8A',
  },
  row: {
    flexDirection: 'row',
  },
  frequencyGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  freqButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  freqText: {
    fontSize: 13,
    color: '#64748B',
  },
  freqTextActive: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    gap: 10,
  },
  uploadText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  checkboxText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44, // Match input height roughly
    width: '100%',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#334155',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemActive: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 16,
    color: '#475569',
  },
  modalItemTextActive: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
});
