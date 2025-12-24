import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Platform, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import AIChatAssistant from '../../components/AIChatAssistant';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const URL = Constants.expoConfig?.extra?.API_BASE_URL;
  const { t } = useLanguage();

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) return;

      const response = await fetch(`${URL}/api/chat/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUnreadCount(data.data.count);
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [])
  );

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: 'lightgray',
          tabBarStyle: {
            backgroundColor: '#1E3A8A',
            borderTopWidth: 0,
            //  Height: Use safe area bottom inset for both platforms
            height: Platform.select({
              ios: 85,
              android: 65 + (insets.bottom > 0 ? insets.bottom : 0),
            }),
            // Bottom padding: Use safe area insets or minimum value
            paddingBottom: Platform.select({
              ios: Math.max(insets.bottom, 20),
              android: Math.max(insets.bottom, 10),
            }),
            paddingTop: 5,
            // Don't use position absolute - causes issues on Android
            elevation: 8, // Shadow for Android
            shadowColor: '#000', // Shadow for iOS
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            paddingBottom: Platform.OS === 'android' ? 5 : 0,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="HomeScreen"
          options={{
            title: t('tabsLayout.home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="SavedJobsScreen"
          options={{
            title: t('tabsLayout.favorite'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="AppliedJobScreen"
          options={{
            title: t('tabsLayout.applied'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="briefcase" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="companies"
          options={{
            title: t('tabsLayout.company'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages/index"
          options={{
            title: t('tabsLayout.chat'),
            tabBarIcon: ({ color, size, focused }) => (
              <View>
                <Ionicons
                  name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                  size={size}
                  color={color}
                />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      right: -6,
                      top: -3,
                      backgroundColor: 'red',
                      borderRadius: 8,
                      width: 16,
                      height: 16,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="ProfileScreen"
          options={{
            title: t('tabsLayout.profile'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <AIChatAssistant />
    </>
  );
}
