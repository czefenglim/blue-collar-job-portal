import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Plan {
  id: number;
  type: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
}

export default function SubscriptionManagementScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [priceInput, setPriceInput] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        router.replace('/(admin-hidden)/login');
        return;
      }

      const response = await fetch(`${URL}/api/subscription-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        setPlans(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      Alert.alert('Error', 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setPriceInput(plan.price.toString());
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    try {
      const token = await AsyncStorage.getItem('adminToken');
      const response = await fetch(
        `${URL}/api/subscription-plans/${editingPlan.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            price: parseFloat(priceInput),
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Plan updated successfully');
        setEditingPlan(null);
        fetchPlans();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      Alert.alert('Error', 'Failed to update plan');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Subscription Plans</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planType}>{plan.type}</Text>
            </View>

            {editingPlan?.id === plan.id ? (
              <View style={styles.editContainer}>
                <Text style={styles.label}>Price ({plan.currency})</Text>
                <TextInput
                  style={styles.input}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  keyboardType="numeric"
                />
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setEditingPlan(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.price}>
                  {plan.currency} {plan.price}
                </Text>
                <View style={styles.features}>
                  {Array.isArray(plan.features) &&
                    plan.features.map((feature, index) => (
                      <Text key={index} style={styles.feature}>
                        • {feature}
                      </Text>
                    ))}
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEdit(plan)}
                >
                  <Text style={styles.editButtonText}>Edit Price</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  planType: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 12,
  },
  features: {
    marginBottom: 16,
  },
  feature: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#007BFF',
  },
  cancelButtonText: {
    fontWeight: 'bold',
    color: '#333',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
});
