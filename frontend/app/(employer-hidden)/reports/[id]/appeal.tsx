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
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../../../contexts/LanguageContext';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

const AppealSubmissionScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const [explanation, setExplanation] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { t } = useLanguage();

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('employerReports.appeal.permissions.photosTitle'),
          t('employerReports.appeal.permissions.photosMessage')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: SelectedFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type:
            asset.type === 'image'
              ? 'image/jpeg'
              : asset.mimeType || 'image/jpeg',
        }));

        setSelectedFiles([...selectedFiles, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        t('employerReports.appeal.errorTitle'),
        t('employerReports.appeal.errors.pickImageFailed')
      );
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: SelectedFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}.pdf`,
          type: asset.mimeType || 'application/pdf',
          size: asset.size,
        }));
        setSelectedFiles([...selectedFiles, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        t('employerReports.appeal.errorTitle'),
        t('employerReports.appeal.errors.pickDocumentFailed')
      );
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const validateForm = () => {
    if (!explanation.trim()) {
      Alert.alert(
        t('employerReports.appeal.errorTitle'),
        t('employerReports.appeal.errors.missingExplanation')
      );
      return false;
    }

    if (explanation.trim().length < 20) {
      Alert.alert(
        t('employerReports.appeal.errorTitle'),
        t('employerReports.appeal.errors.tooShortExplanation')
      );
      return false;
    }

    if (selectedFiles.length > 5) {
      Alert.alert(
        t('employerReports.appeal.errorTitle'),
        t('employerReports.appeal.errors.maxFiles')
      );
      return false;
    }

    return true;
  };

  const submitAppeal = async () => {
    if (!validateForm()) return;

    Alert.alert(
      t('employerReports.appeal.submitTitle'),
      t('employerReports.appeal.submitConfirm'),
      [
        {
          text: t('employerReports.appeal.actions.cancel'),
          style: 'cancel',
        },
        {
          text: t('employerReports.appeal.actions.submit'),
          onPress: async () => {
            try {
              setIsSubmitting(true);

              const token = await AsyncStorage.getItem('jwtToken');
              if (!token) {
                Alert.alert(
                  t('employerReports.appeal.auth.requiredTitle'),
                  t('employerReports.appeal.auth.requiredMessage')
                );
                return;
              }

              const formData = new FormData();
              formData.append('reportId', id as string);
              formData.append('explanation', explanation.trim());

              // Append files
              selectedFiles.forEach((file, index) => {
                const fileToUpload: any = {
                  uri: file.uri,
                  name: file.name,
                  type: file.type,
                };
                formData.append('evidence', fileToUpload);
              });

              const response = await fetch(
                `${URL}/api/appeals/employer/appeal`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  body: formData,
                }
              );

              if (response.ok) {
                Alert.alert(
                  t('employerReports.appeal.success.title'),
                  t('employerReports.appeal.success.message'),
                  [
                    {
                      text: t('employerReports.appeal.success.ok'),
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                const data = await response.json();
                Alert.alert(
                  t('employerReports.appeal.errorTitle'),
                  data.message ||
                    t('employerReports.appeal.errors.submitFailed')
                );
              }
            } catch (error) {
              console.error('Error submitting appeal:', error);
              Alert.alert(
                t('employerReports.appeal.errorTitle'),
                t('employerReports.appeal.errors.submitFailed')
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderFilePreview = (file: SelectedFile, index: number) => {
    const isImage = file.type.startsWith('image/');

    return (
      <View key={index} style={styles.filePreview}>
        {isImage ? (
          <Image source={{ uri: file.uri }} style={styles.fileImage} />
        ) : (
          <View style={styles.fileDocIcon}>
            <Ionicons name="document" size={32} color="#64748B" />
          </View>
        )}
        <TouchableOpacity
          style={styles.removeFileButton}
          onPress={() => removeFile(index)}
        >
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {t('employerReports.appeal.headerTitle')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('employerReports.appeal.headerSubtitle', { id })}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Ionicons name="information-circle" size={24} color="#1E3A8A" />
              <Text style={styles.instructionsTitle}>
                {t('employerReports.appeal.instructionsTitle')}
              </Text>
            </View>
            <Text style={styles.instructionsText}>
              • {t('employerReports.appeal.guideline1')}
            </Text>
            <Text style={styles.instructionsText}>
              • {t('employerReports.appeal.guideline2')}
            </Text>
            <Text style={styles.instructionsText}>
              • {t('employerReports.appeal.guideline3')}
            </Text>
            <Text style={styles.instructionsText}>
              • {t('employerReports.appeal.guideline4')}
            </Text>
          </View>

          {/* Explanation Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {t('employerReports.appeal.explanationLabel')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.inputHint}>
              {t('employerReports.appeal.explanationHint')}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('employerReports.appeal.explanationPlaceholder')}
              placeholderTextColor="#94A3B8"
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={styles.characterCount}>
              {t('employerReports.appeal.characterCount', {
                count: explanation.length,
              })}
            </Text>
          </View>

          {/* Evidence Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {t('employerReports.appeal.evidenceLabel')}
            </Text>
            <Text style={styles.inputHint}>
              {t('employerReports.appeal.evidenceHint')}
            </Text>

            {selectedFiles.length > 0 && (
              <View style={styles.filePreviewContainer}>
                {selectedFiles.map((file, index) =>
                  renderFilePreview(file, index)
                )}
              </View>
            )}

            {selectedFiles.length < 5 && (
              <View style={styles.uploadButtonsContainer}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickImage}
                  disabled={isSubmitting}
                >
                  <Ionicons name="image-outline" size={24} color="#1E3A8A" />
                  <Text style={styles.uploadButtonText}>
                    {t('employerReports.appeal.addImage')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickDocument}
                  disabled={isSubmitting}
                >
                  <Ionicons name="document-outline" size={24} color="#1E3A8A" />
                  <Text style={styles.uploadButtonText}>
                    {t('employerReports.appeal.addDocument')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedFiles.length >= 5 && (
              <View style={styles.maxFilesWarning}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                <Text style={styles.maxFilesText}>
                  {t('employerReports.appeal.maxFilesReached')}
                </Text>
              </View>
            )}
          </View>

          {/* Important Note */}
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text style={styles.noteTitle}>
                {t('employerReports.appeal.noteTitle')}
              </Text>
            </View>
            <Text style={styles.noteText}>
              {t('employerReports.appeal.noteText')}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={submitAppeal}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {t('employerReports.appeal.submitting')}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {t('employerReports.appeal.submitButton')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 22,
    marginBottom: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  inputHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 160,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'right',
  },
  filePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  filePreview: {
    width: 100,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  fileImage: {
    width: '100%',
    height: 100,
  },
  fileDocIcon: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  removeFileButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  fileName: {
    fontSize: 11,
    color: '#64748B',
    padding: 4,
    textAlign: 'center',
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  maxFilesWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  maxFilesText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  noteText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AppealSubmissionScreen;
