import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* 👇 This makes LanguageSelector the first page shown */}
          <Stack.Screen name="index" options={{ headerShown: false }} />

          {/* 👇 Keep your other routes below */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(employer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(employer-hidden)"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(admin-hidden)"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="(shared)" options={{ headerShown: false }} />
          <Stack.Screen name="(user-hidden)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </LanguageProvider>
  );
}
