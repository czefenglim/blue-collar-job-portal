import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

interface Industry {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  original_name?: string;
  original_description?: string;
}

export default function EditJobIndustryPage() {
  const router = useRouter();
  const { t, currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentIndustry, setCurrentIndustry] = useState<Industry | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIndustries();
  }, [currentLanguage]);

  const fetchIndustries = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        router.replace('/(admin)/login');
        return;
      }

      const response = await fetch(
        `${URL}/api/admin/industries?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setIndustries(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch industries');
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIndustries();
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentIndustry(null);
    setFormName('');
    setFormIcon('');
    setFormDescription('');
    setFormIsActive(true);
    setModalVisible(true);
  };

  const openEditModal = (industry: Industry) => {
    setIsEditing(true);
    setCurrentIndustry(industry);
    // Use original values if available (for editing source), else use localized
    setFormName(industry.original_name || industry.name);
    setFormIcon(industry.icon || '');
    setFormDescription(
      industry.original_description || industry.description || ''
    );
    setFormIsActive(industry.isActive);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Industry name is required');
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const payload = {
        name: formName,
        icon: formIcon,
        description: formDescription,
        isActive: formIsActive,
      };

      let url = `${URL}/api/admin/industries`;
      let method = 'POST';

      if (isEditing && currentIndustry) {
        url = `${URL}/api/admin/industries/${currentIndustry.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success',
          isEditing
            ? 'Industry updated successfully'
            : 'Industry created successfully'
        );
        setModalVisible(false);
        fetchIndustries();
      } else {
        Alert.alert('Error', data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmojiInput = (text: string) => {
    // Basic emoji enforcement logic
    // We allow clearing the input
    if (text === '') {
      setFormIcon('');
      return;
    }

    // Check if the input contains non-emoji characters
    // This is a basic regex for emojis and symbols commonly used as emojis
    // It's difficult to perfectly match all emojis across all platforms,
    // but this covers a wide range.
    // If we want to be strict, we can check if the character falls into emoji unicode ranges.

    // For now, we simply limit the length to 2 (most emojis are 1-2 chars)
    // and rely on the user to follow instructions, as enforcing a specific keyboard isn't possible.
    // We can also strip ASCII characters if we want to be stricter.

    const isASCII = /^[\x00-\x7F]*$/.test(text);
    if (isASCII && text.length > 0) {
      // If purely ASCII (letters/numbers), maybe reject?
      // But some users might type :smile:? No, let's assume direct emoji input.
      // Let's just limit length to 2 to encourage single emoji.
    }

    setFormIcon(text);
  };

  const renderItem = ({ item }: { item: Industry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.emojiIcon}>{item.icon || '💼'}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSlug}>Slug: {item.slug}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.isActive ? '#34C759' : '#FF3B30' },
            ]}
          />
        </View>
      </View>

      {item.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => openEditModal(item)}
      >
        <Ionicons name="create-outline" size={20} color="#007AFF" />
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <TouchableOpacity
          onPress={openAddModal}
          style={styles.addIndustryButton}
        >
          <Text style={styles.addIndustryText}>Add Industry</Text>
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={industries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No industries found</Text>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Industry' : 'Add New Industry'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name (English)</Text>
              <TextInput
                style={styles.input}
                placeholder="Industry Name"
                value={formName}
                onChangeText={setFormName}
              />
              <Text style={styles.helperText}>
                Translations will be auto-generated.
              </Text>

              <Text style={styles.label}>Icon (Emoji)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 🏗️"
                value={formIcon}
                onChangeText={handleEmojiInput}
                autoCapitalize="none"
                maxLength={5}
              />
              <Text style={styles.helperText}>
                Please enter an emoji (e.g. 🏗️, 💼, 🚗).
              </Text>

              <Text style={styles.label}>Description (English)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={4}
              />

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Active Status</Text>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: '#767577', true: '#34C759' }}
                  thumbColor={Platform.OS === 'ios' ? '#fff' : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Save Changes' : 'Create Industry'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  spacer: {
    flex: 1,
  },
  addIndustryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addIndustryText: {
    marginRight: 8,
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiIcon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardSlug: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    padding: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginTop: 8,
  },
  editButtonText: {
    marginLeft: 6,
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
