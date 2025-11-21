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
  Alert,
  Modal,
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
  isVisible: boolean;
  isFlagged: boolean;
  flagReason: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
  company: {
    id: number;
    name: string;
  };
}

export default function ReviewModerationScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [filterFlagged, setFilterFlagged] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showModerateModal, setShowModerateModal] = useState(false);
  const [moderationNotes, setModerationNotes] = useState('');

  useEffect(() => {
    fetchReviews(1);
  }, [searchQuery, filterRating, filterVisibility, filterFlagged]);

  const fetchReviews = async (pageNum: number) => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      let url = `${URL}/api/reviews/admin/all?page=${pageNum}&limit=20`;
      if (searchQuery) url += `&search=${searchQuery}`;
      if (filterRating) url += `&rating=${filterRating}`;
      if (filterVisibility !== 'all') url += `&visibility=${filterVisibility}`;
      if (filterFlagged) url += `&flagged=true`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setReviews(data.data);
        } else {
          setReviews((prev) => [...prev, ...data.data]);
        }
        setHasMore(data.pagination.page < data.pagination.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleModerateReview = async (reviewId: number, isVisible: boolean) => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${URL}/api/reviews/admin/${reviewId}/moderate`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isVisible,
            adminNotes: moderationNotes,
          }),
        }
      );

      if (response.ok) {
        Alert.alert(
          'Success',
          `Review ${isVisible ? 'approved' : 'hidden'} successfully`
        );
        setShowModerateModal(false);
        setModerationNotes('');
        setSelectedReview(null);
        fetchReviews(1);
      } else {
        Alert.alert('Error', 'Failed to moderate review');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to moderate review');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to permanently delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('adminToken');
              const response = await fetch(
                `${URL}/api/reviews/admin/${reviewId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    reason: 'Inappropriate content',
                  }),
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Review deleted successfully');
                fetchReviews(1);
              } else {
                Alert.alert('Error', 'Failed to delete review');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchReviews(page + 1);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews(1);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#F59E0B"
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View
      style={[
        styles.reviewCard,
        !item.isVisible && styles.reviewCardHidden,
        item.isFlagged && styles.reviewCardFlagged,
      ]}
    >
      {/* Flags */}
      <View style={styles.reviewFlags}>
        {!item.isVisible && (
          <View style={styles.flagBadge}>
            <Ionicons name="eye-off" size={12} color="#DC2626" />
            <Text style={styles.flagBadgeText}>Hidden</Text>
          </View>
        )}
        {item.isFlagged && (
          <View style={[styles.flagBadge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="flag" size={12} color="#F59E0B" />
            <Text style={[styles.flagBadgeText, { color: '#F59E0B' }]}>
              Flagged
            </Text>
          </View>
        )}
      </View>

      {/* Company Info */}
      <View style={styles.companyInfo}>
        <Ionicons name="business" size={16} color="#64748B" />
        <Text style={styles.companyName}>{item.company.name}</Text>
      </View>

      {/* Review Content */}
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewerName}>{item.user.fullName}</Text>
          <Text style={styles.reviewerEmail}>{item.user.email}</Text>
          {renderStars(item.rating)}
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}

      {/* Flag Reason */}
      {item.isFlagged && item.flagReason && (
        <View style={styles.flagReasonContainer}>
          <Text style={styles.flagReasonLabel}>Flag Reason:</Text>
          <Text style={styles.flagReasonText}>{item.flagReason}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.reviewActions}>
        {item.isVisible ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.hideButton]}
            onPress={() => {
              setSelectedReview(item);
              setShowModerateModal(true);
            }}
          >
            <Ionicons name="eye-off-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>
              Hide
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleModerateReview(item.id, true)}
          >
            <Ionicons name="eye-outline" size={16} color="#10B981" />
            <Text style={[styles.actionButtonText, { color: '#10B981' }]}>
              Show
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteReview(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && page === 1) {
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
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search company or user..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Rating Filter */}
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
              All Ratings
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
                size={12}
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

          {/* Visibility Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterVisibility === 'hidden' && styles.filterChipActive,
            ]}
            onPress={() =>
              setFilterVisibility(
                filterVisibility === 'hidden' ? 'all' : 'hidden'
              )
            }
          >
            <Ionicons
              name="eye-off"
              size={12}
              color={filterVisibility === 'hidden' ? '#FFFFFF' : '#DC2626'}
            />
            <Text
              style={[
                styles.filterChipText,
                filterVisibility === 'hidden' && styles.filterChipTextActive,
              ]}
            >
              Hidden
            </Text>
          </TouchableOpacity>

          {/* Flagged Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterFlagged && styles.filterChipActive,
            ]}
            onPress={() => setFilterFlagged(!filterFlagged)}
          >
            <Ionicons
              name="flag"
              size={12}
              color={filterFlagged ? '#FFFFFF' : '#F59E0B'}
            />
            <Text
              style={[
                styles.filterChipText,
                filterFlagged && styles.filterChipTextActive,
              ]}
            >
              Flagged
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && page > 1 ? (
            <ActivityIndicator
              size="small"
              color="#1E3A8A"
              style={{ marginVertical: 20 }}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No reviews found</Text>
          </View>
        }
      />

      {/* Moderate Modal */}
      {/* Moderate Modal - UPDATED WITH KEYBOARDAVOIDINGVIEW */}
      <Modal
        visible={showModerateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModerateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModerateModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContentWrapper}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Hide Review</Text>
                  <TouchableOpacity onPress={() => setShowModerateModal(false)}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  style={styles.modalScrollView}
                >
                  <Text style={styles.modalDescription}>
                    This review will be hidden from public view. You can provide
                    notes for your records.
                  </Text>

                  <Text style={styles.inputLabel}>Admin Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes about this moderation action..."
                    placeholderTextColor="#94A3B8"
                    value={moderationNotes}
                    onChangeText={setModerationNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowModerateModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() =>
                      selectedReview &&
                      handleModerateReview(selectedReview.id, false)
                    }
                  >
                    <Text style={styles.modalConfirmButtonText}>
                      Hide Review
                    </Text>
                  </TouchableOpacity>
                </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#1E3A8A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewCardHidden: {
    opacity: 0.7,
    borderColor: '#FCA5A5',
  },
  reviewCardFlagged: {
    borderColor: '#FCD34D',
    borderWidth: 2,
  },
  reviewFlags: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  flagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  reviewerEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  flagReasonContainer: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  flagReasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  flagReasonText: {
    fontSize: 12,
    color: '#92400E',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  hideButton: {
    backgroundColor: '#FEE2E2',
  },
  approveButton: {
    backgroundColor: '#D1FAE5',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
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

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 100,
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
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentWrapper: {
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalScrollView: {
    maxHeight: 400, // Prevents modal from being too tall
  },
});
