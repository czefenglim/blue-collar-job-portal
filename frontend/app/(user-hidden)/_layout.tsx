import { router, Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TabsLayout() {
  const { t } = useLanguage();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingHorizontal: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="report-job"
        options={{
          title: t('userHiddenLayout.reportJob'),
        }}
      />
      <Stack.Screen
        name="report-history"
        options={{
          title: t('userHiddenLayout.reportHistory'),
        }}
      />
      <Stack.Screen
        name="companies/[id]"
        options={{
          title: t('userHiddenLayout.companyProfile'),
        }}
      />
      <Stack.Screen
        name="update-location"
        options={{
          title: t('userHiddenLayout.updateLocation'),
        }}
      />
    </Stack>
  );
}
