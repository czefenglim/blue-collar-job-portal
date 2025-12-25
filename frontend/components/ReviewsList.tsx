import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Review {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  isAnonymous: boolean;
  employerReply: string | null; // ADD THIS
  repliedAt: string | null; // ADD THIS
  createdAt: string;
  user: {
    id: number | null;
    fullName: string;
  };
}

interface ReviewsListProps {
  companyId: number;
}

export default function ReviewsList({ companyId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReviews = useCallback(
    async (pageNum = 1) => {
      try {
        const token = await AsyncStorage.getItem('jwtToken');

        const response = await fetch(
          `${URL}/api/reviews/companies/${companyId}/reviews?page=${pageNum}&limit=10`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.pagination) {
            setHasMore(data.pagination.page < data.pagination.pages);
            setPage(pageNum);
          } else {
            setHasMore(false);
          }
          if (pageNum === 1) {
            setReviews(data.data.reviews);
          } else {
            setReviews((prev) => [...prev, ...data.data.reviews]);
          }

          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    fetchReviews();
  }, [companyId, fetchReviews]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchReviews(page + 1);
    }
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
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.user.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {item.isAnonymous ? 'Anonymous' : item.user.fullName}
            </Text>
            {renderStars(item.rating)}
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}

      {/* ADD EMPLOYER REPLY SECTION */}
      {item.employerReply && (
        <View style={styles.employerReplyContainer}>
          <View style={styles.employerReplyHeader}>
            <View style={styles.employerReplyIconWrapper}>
              <Ionicons name="business" size={14} color="#1E3A8A" />
            </View>
            <Text style={styles.employerReplyLabel}>
              Response from Employer
            </Text>
            {item.repliedAt && (
              <Text style={styles.employerReplyDate}>
                {new Date(item.repliedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <Text style={styles.employerReplyText}>{item.employerReply}</Text>
        </View>
      )}
    </View>
  );

  if (loading && page === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#1E3A8A" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Reviews</Text>
      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to review this company
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator
                size="small"
                color="#1E3A8A"
                style={{ marginVertical: 16 }}
              />
            ) : hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
              >
                <Text style={styles.loadMoreText}>Load More Reviews</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#94A3B8',
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  reviewComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  // ADD THESE STYLES FOR EMPLOYER REPLY
  employerReplyContainer: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1E3A8A',
  },
  employerReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  employerReplyIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employerReplyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
    flex: 1,
  },
  employerReplyDate: {
    fontSize: 11,
    color: '#64748B',
  },
  employerReplyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
});
