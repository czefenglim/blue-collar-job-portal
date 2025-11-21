import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Evidence {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

const ReportJobScreen: React.FC = () => {
  const { jobId, jobTitle } = useLocalSearchParams<{
    jobId: string;
    jobTitle: string;
  }>();
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();

  const reportTypes = [
    {
      key: 'FAKE_JOB',
      label: t('report.types.fakeJob'),
      icon: 'alert-circle',
      color: '#EF4444',
    },
    {
      key: 'MISLEADING_INFO',
      label: t('report.types.misleadingInfo'),
      icon: 'information-circle',
      color: '#F59E0B',
    },
    {
      key: 'INAPPROPRIATE_CONTENT',
      label: t('report.types.inappropriateContent'),
      icon: 'ban',
      color: '#DC2626',
    },
    {
      key: 'SCAM_SUSPECTED',
      label: t('report.types.scamSuspected'),
      icon: 'warning',
      color: '#B91C1C',
    },
    {
      key: 'DISCRIMINATION',
      label: t('report.types.discrimination'),
      icon: 'people',
      color: '#7C3AED',
    },
    {
      key: 'DUPLICATE_POSTING',
      label: t('report.types.duplicatePosting'),
      icon: 'copy',
      color: '#0891B2',
    },
    {
      key: 'OTHERS',
      label: t('report.types.others'),
      icon: 'ellipsis-horizontal',
      color: '#64748B',
    },
  ];

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - evidence.length,
      });

      if (!result.canceled && result.assets) {
        const newEvidence = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize,
        }));

        setEvidence([...evidence, ...newEvidence]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('report.errors.pickImageFailed'));
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const newFile: Evidence = {
          uri: result.uri,
          name: result.name,
          type: result.mimeType || 'application/pdf',
          size: result.size,
        };

        if (evidence.length >= 5) {
          Alert.alert(
            t('report.maxFilesReached'),
            t('report.maxFilesReachedMessage')
          );
          return;
        }

        setEvidence([...evidence, newFile]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(t('common.error'), t('report.errors.pickDocumentFailed'));
    }
  };

  const removeEvidence = (index: number) => {
    const newEvidence = evidence.filter((_, i) => i !== index);
    setEvidence(newEvidence);
  };

  const validateForm = () => {
    if (!selectedType) {
      Alert.alert(
        t('report.validation.title'),
        t('report.validation.selectType')
      );
      return false;
    }

    if (!description.trim()) {
      Alert.alert(
        t('report.validation.title'),
        t('report.validation.descriptionRequired')
      );
      return false;
    }

    if (description.trim().length < 10) {
      Alert.alert(
        t('report.validation.title'),
        t('report.validation.descriptionMinLength')
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('jwtToken');

      if (!token) {
        Alert.alert(
          t('report.authenticationRequired'),
          t('report.pleaseSignIn'),
          [{ text: t('common.ok'), onPress: () => router.replace('/') }]
        );
        return;
      }

      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('reportType', selectedType);
      formData.append('description', description.trim());

      // Add evidence files
      if (evidence.length > 0) {
        evidence.forEach((file, index) => {
          const fileData: any = {
            uri: file.uri,
            name: file.name,
            type: file.type,
          };
          formData.append('evidence', fileData);
        });
      }

      const response = await fetch(`${URL}/api/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(t('report.success.title'), t('report.success.message'), [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert(
          t('common.error'),
          data.message || t('report.errors.submitFailed')
        );
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(t('common.error'), t('report.errors.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return 'image';
    }
    return 'document';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('report.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Job Info */}
          <View style={styles.jobInfoCard}>
            <Ionicons name="briefcase" size={20} color="#1E3A8A" />
            <View style={styles.jobInfoText}>
              <Text style={styles.jobInfoLabel}>
                {t('report.reportingJob')}
              </Text>
              <Text style={styles.jobInfoTitle} numberOfLines={2}>
                {jobTitle}
              </Text>
            </View>
          </View>

          {/* Report Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('report.selectType')} <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t('report.selectTypeDescription')}
            </Text>

            <View style={styles.typeGrid}>
              {reportTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeCard,
                    selectedType === type.key && styles.typeCardSelected,
                    {
                      borderColor:
                        selectedType === type.key ? type.color : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setSelectedType(type.key)}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={selectedType === type.key ? type.color : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === type.key && { color: type.color },
                    ]}
                  >
                    {type.label}
                  </Text>
                  {selectedType === type.key && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: type.color },
                      ]}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('report.description')} <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t('report.descriptionHint')}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('report.descriptionPlaceholder')}
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
              editable={!isSubmitting}
            />
            <Text style={styles.charCount}>
              {description.length}/1000 {t('report.characters')}
            </Text>
          </View>

          {/* Evidence Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('report.evidence')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('report.evidenceHint')}
            </Text>

            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
                disabled={isSubmitting || evidence.length >= 5}
              >
                <Ionicons name="image-outline" size={20} color="#1E3A8A" />
                <Text style={styles.uploadButtonText}>
                  {t('report.uploadImage')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}
                disabled={isSubmitting || evidence.length >= 5}
              >
                <Ionicons name="document-outline" size={20} color="#1E3A8A" />
                <Text style={styles.uploadButtonText}>
                  {t('report.uploadDocument')}
                </Text>
              </TouchableOpacity>
            </View>

            {evidence.length > 0 && (
              <View style={styles.evidenceList}>
                {evidence.map((file, index) => (
                  <View key={index} style={styles.evidenceItem}>
                    {file.type.startsWith('image/') ? (
                      <Image
                        source={{ uri: file.uri }}
                        style={styles.evidenceImage}
                      />
                    ) : (
                      <View style={styles.evidenceIconContainer}>
                        <Ionicons
                          name={getFileIcon(file.type) as any}
                          size={24}
                          color="#64748B"
                        />
                      </View>
                    )}
                    <View style={styles.evidenceInfo}>
                      <Text style={styles.evidenceName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      {file.size && (
                        <Text style={styles.evidenceSize}>
                          {formatFileSize(file.size)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeEvidence(index)}
                      style={styles.removeButton}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.evidenceNote}>
              {t('report.maxFiles', { count: 5 - evidence.length })}
            </Text>
          </View>

          {/* Important Notice */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle" size={24} color="#0891B2" />
            <Text style={styles.noticeText}>{t('report.importantNotice')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('report.submitReport')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  jobInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  jobInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  jobInfoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  jobInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  required: {
    color: '#EF4444',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  typeCardSelected: {
    backgroundColor: '#FFFFFF',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 8,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  evidenceList: {
    marginTop: 16,
    gap: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  evidenceImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  evidenceIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  evidenceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  evidenceSize: {
    fontSize: 12,
    color: '#64748B',
  },
  removeButton: {
    padding: 4,
  },
  evidenceNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFEFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  noticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#0E7490',
    lineHeight: 18,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ReportJobScreen;
