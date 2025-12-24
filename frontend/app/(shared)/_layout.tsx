import { Stack, useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_BLUE = '#1E40AF';
const TEXT_PRIMARY = '#1E293B';

export default function SharedLayout() {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      let role = await AsyncStorage.getItem('userRole');

      // Fallback to userData if userRole is missing
      if (!role) {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          role = user.role;
        }
      }

      if (role) {
        setUserRole(role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const handleBackPress = async () => {
    let role = userRole;

    if (!role) {
      try {
        role = await AsyncStorage.getItem('userRole');
        if (!role) {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const user = JSON.parse(userData);
            role = user.role;
          }
        }
      } catch (error) {
        console.error('Error fetching role in back press:', error);
      }
    }

    const roleLower = role?.toLowerCase();

    if (roleLower === 'employer') {
      router.replace('/(employer)/dashboard');
    } else if (roleLower === 'job_seeker') {
      router.replace('/(tabs)/HomeScreen');
    } else {
      // Fallback to back() if role is not available
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/HomeScreen');
      }
      console.log('No user role found, falling back');
    }
  };

  const MessagesHeader = ({ route }: { route: any }) => {
    const conversationCount = route.params?.conversationCount || 0;
    const isConnected = route.params?.isConnected;

    return (
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={28} color={PRIMARY_BLUE} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="chatbubbles" size={24} color={PRIMARY_BLUE} />
            <Text style={styles.headerTitle}>
              {t('chat.messages') || 'Messages'}
            </Text>
            <View style={styles.conversationCountBadge}>
              <Text style={styles.conversationCount}>{conversationCount}</Text>
            </View>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {!isConnected && isConnected !== undefined && (
          <View style={styles.connectionBanner}>
            <Ionicons name="wifi" size={16} color="#92400e" />
            <Text style={styles.connectionText}>
              {t('chat.connecting') || 'Connecting...'}
            </Text>
          </View>
        )}
      </View>
    );
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
        options={({ route }) => ({
          header: () => <MessagesHeader route={route} />,
          headerShown: true,
        })}
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

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  conversationCountBadge: {
    backgroundColor: PRIMARY_BLUE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
  },
  conversationCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 8,
  },
  connectionText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
});
