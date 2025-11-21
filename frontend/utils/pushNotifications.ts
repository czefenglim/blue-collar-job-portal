import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // new
    shouldShowList: true, // new
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // ✅ Set up Android notification channel FIRST
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default', // ✅ ADD: Enable sound
      enableVibrate: true, // ✅ ADD: Enable vibration
      showBadge: true, // ✅ ADD: Show badge
    });
    console.log('✅ Android notification channel created');
  }

  if (!Device.isDevice) {
    console.log('⚠️ Must use physical device for Push Notifications');
    return;
  }

  // Check permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  console.log('📱 Current notification permission status:', existingStatus);

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('📱 Requested permission, new status:', status);
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Failed to get push notification permissions');
    return;
  }

  try {
    // ✅ Get the push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    token = tokenResponse.data;

    console.log('📱 Expo Push Token:', token);

    // Register token with backend
    const jwtToken = await AsyncStorage.getItem('jwtToken');
    if (jwtToken && token) {
      console.log('📤 Registering push token with backend...');

      const response = await fetch(`${URL}/api/notifications/register-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pushToken: token }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Push token registered with backend:', data);
      } else {
        console.error('❌ Failed to register push token:', data);
      }
    } else {
      console.log('⚠️ No JWT token found, skipping backend registration');
    }
  } catch (error) {
    console.error('❌ Error getting/registering push token:', error);
  }

  return token;
}

// ✅ ADD: Function to test push notification
export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification 🎉',
      body: 'Push notifications are working!',
      data: { test: true },
    },
    trigger: null, // Send immediately
  });
}
