import { Stack, useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SharedLayout() {
  const { t } = useLanguage();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const handleBackPress = () => {
    if (userRole === 'EMPLOYER') {
      router.replace('/(employer)/dashboard');
    } else if (userRole === 'JOB_SEEKER') {
      router.replace('/HomeScreen');
    } else {
      // Fallback to back() if role is not available
      router.back();
    }
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        headerLeft: () => (
          <TouchableOpacity
            onPress={handleBackPress}
            style={{ paddingHorizontal: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="conversation-list"
        options={{
          title: t('chat.messages') || 'Messages',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: t('chat.chat') || 'Chat',
          headerShown: false, // ✅ Hide header since ChatScreen has custom header
        }}
      />
    </Stack>
  );
}
