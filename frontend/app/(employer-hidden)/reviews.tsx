import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Review {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  employerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: {
    id: number | null;
    fullName: string;
  };
}

export default function ReviewsManagementScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>(
    'newest'
  );
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
  }, [filterRating, sortBy]);

  const fetchReviews = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        router.replace('/EmployerLoginScreen');
        return;
      }

      let url = `${URL}/api/reviews/employer/company-reviews?sort=${sortBy}&limit=50`;
      if (filterRating) {
        url += `&rating=${filterRating}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data.data.reviews);
        setStats({
          averageRating: data.data.averageRating,
          totalReviews: data.data.totalReviews,
          ratingCounts: data.data.ratingCounts,
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('jwtToken');

      const response = await fetch(
        `${URL}/api/reviews/${selectedReview.id}/reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: replyText.trim() }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Reply posted successfully');
        setShowReplyModal(false);
        setReplyText('');
        setSelectedReview(null);
        fetchReviews();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to post reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async (reviewId: number) => {
    Alert.prompt(
      'Flag Review',
      'Please provide a reason for flagging this review:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Error', 'Please provide a reason');
              return;
            }

            try {
              const token = await AsyncStorage.getItem('jwtToken');
              const response = await fetch(
                `${URL}/api/reviews/${reviewId}/flag`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ reason }),
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Review flagged for admin review');
                fetchReviews();
              } else {
                Alert.alert('Error', 'Failed to flag review');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to flag review');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#F59E0B"
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUserInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.user.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.user.fullName}</Text>
            {renderStars(item.rating)}
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}

      {/* Employer Reply */}
      {item.employerReply && (
        <View style={styles.replyContainer}>
          <View style={styles.replyHeader}>
            <Ionicons name="arrow-undo" size={16} color="#1E3A8A" />
            <Text style={styles.replyLabel}>Your Reply</Text>
            {item.repliedAt && (
              <Text style={styles.replyDate}>
                {new Date(item.repliedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <Text style={styles.replyText}>{item.employerReply}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.reviewActions}>
        {!item.employerReply && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setSelectedReview(item);
              setReplyText('');
              setShowReplyModal(true);
            }}
          >
            <Ionicons name="chatbox-outline" size={18} color="#1E3A8A" />
            <Text style={styles.actionButtonText}>Reply</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleFlag(item.id)}
        >
          <Ionicons name="flag-outline" size={18} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
            Flag
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalReviews}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterRating === null && styles.filterChipActive,
            ]}
            onPress={() => setFilterRating(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterRating === null && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {[5, 4, 3, 2, 1].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.filterChip,
                filterRating === rating && styles.filterChipActive,
              ]}
              onPress={() => setFilterRating(rating)}
            >
              <Ionicons
                name="star"
                size={14}
                color={filterRating === rating ? '#FFFFFF' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  filterRating === rating && styles.filterChipTextActive,
                ]}
              >
                {rating}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'newest' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('newest')}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'newest' && styles.sortButtonTextActive,
              ]}
            >
              Newest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'highest' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('highest')}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'highest' && styles.sortButtonTextActive,
              ]}
            >
              Highest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'lowest' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('lowest')}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'lowest' && styles.sortButtonTextActive,
              ]}
            >
              Lowest
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No reviews found</Text>
          </View>
        }
      />

      {/* Reply Modal */}
      {/* Reply Modal - UPDATED */}
      <Modal
        visible={showReplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReplyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowReplyModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reply to Review</Text>
                <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedReview && (
                  <View style={styles.modalReviewSummary}>
                    <View style={styles.modalReviewHeader}>
                      <Text style={styles.modalReviewUser}>
                        {selectedReview.user.fullName}
                      </Text>
                      {renderStars(selectedReview.rating)}
                    </View>
                    {selectedReview.comment && (
                      <Text style={styles.modalReviewComment} numberOfLines={3}>
                        {selectedReview.comment}
                      </Text>
                    )}
                  </View>
                )}

                <Text style={styles.inputLabel}>Your Reply</Text>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Write your reply..."
                  placeholderTextColor="#94A3B8"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={6}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{replyText.length}/1000</Text>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowReplyModal(false)}
                  disabled={submitting}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    submitting && styles.modalSubmitButtonDisabled,
                  ]}
                  onPress={handleReply}
                  disabled={submitting}
                >
                  <Text style={styles.modalSubmitButtonText}>
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#1E3A8A',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  sortButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  replyContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1E3A8A',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    flex: 1,
  },
  replyDate: {
    fontSize: 11,
    color: '#64748B',
  },
  replyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalReviewSummary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalReviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalReviewComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  replyInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
