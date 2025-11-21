import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HiddenLayout() {
  const router = useRouter();

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
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen
        name="reports/job-review/[jobId]"
        options={{ title: 'Job Post Review' }}
      />
      <Stack.Screen name="jobs/[id]" options={{ title: 'Job Details' }} />
      <Stack.Screen
        name="appeals/index"
        options={{ title: 'Appeals For Job Post' }}
      />
      <Stack.Screen name="appeals/[id]" options={{ title: 'Appeal Details' }} />
      <Stack.Screen
        name="review-moderation"
        options={{ title: 'Review Moderation' }}
      />
      <Stack.Screen
        name="company-approval/[id]"
        options={{ title: 'Company Approval Details' }}
      />
      <Stack.Screen name="companies/page" options={{ title: 'Companies' }} />
      <Stack.Screen
        name="companies/[id]"
        options={{ title: 'Company Details' }}
      />
    </Stack>
  );
}
