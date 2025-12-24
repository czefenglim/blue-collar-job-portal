import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface WriteReviewModalProps {
  visible: boolean;
  companyId: number;
  companyName: string;
  existingReview?: any;
  onClose: () => void;
  onSubmit: () => void;
}

export default function WriteReviewModal({
  visible,
  companyId,
  companyName,
  existingReview,
  onClose,
  onSubmit,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
      setIsAnonymous(existingReview.isAnonymous);
    } else {
      // Reset for new review
      setRating(0);
      setTitle('');
      setComment('');
      setIsAnonymous(false);
    }
  }, [existingReview, visible]);

  const handleSubmit = async () => {
    // Validation
    if (rating === 0) {
      Alert.alert('Required', 'Please select a rating');
      return;
    }

    if (title.length > 200) {
      Alert.alert('Error', 'Title must be 200 characters or less');
      return;
    }

    if (comment.length > 2000) {
      Alert.alert('Error', 'Comment must be 2000 characters or less');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('jwtToken');

      const url = existingReview
        ? `${URL}/api/reviews/${existingReview.id}`
        : `${URL}/api/reviews`;

      const method = existingReview ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          isAnonymous,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          existingReview
            ? 'Review updated successfully'
            : 'Review submitted successfully'
        );
        onSubmit();
      } else {
        Alert.alert('Error', data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {existingReview ? 'Edit Review' : 'Write a Review'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.companyNameText}>{companyName}</Text>

            {/* Rating Stars */}
            <View style={styles.ratingSection}>
              <Text style={styles.label}>Your Rating *</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= rating ? '#F59E0B' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </Text>
              )}
            </View>

            {/* Title */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Review Title (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Sum up your experience"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
              <Text style={styles.charCount}>{title.length}/200</Text>
            </View>

            {/* Comment */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Your Review (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Share your experience working with this company..."
                placeholderTextColor="#94A3B8"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                maxLength={2000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{comment.length}/2000</Text>
            </View>

            {/* Anonymous Option */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <Ionicons
                name={isAnonymous ? 'checkbox' : 'square-outline'}
                size={24}
                color={isAnonymous ? '#1E3A8A' : '#94A3B8'}
              />
              <Text style={styles.checkboxLabel}>
                Post anonymously (your name won&#39;t be shown)
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting
                  ? 'Submitting...'
                  : existingReview
                  ? 'Update'
                  : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  companyNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderRadius: 10,
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
});
