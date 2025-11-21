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
      <Stack.Screen
        name="edit-company-profile"
        options={{ title: 'Edit Company Profile' }}
      />
      <Stack.Screen
        name="applicant-details/[id]"
        options={{ title: 'Applicant Details' }}
      />
      <Stack.Screen
        name="job-post-details/[id]"
        options={{ title: 'Job Post Details' }}
      />
      <Stack.Screen
        name="job-post-details/[id]/edit"
        options={{ title: 'Edit Job Post' }}
      />
      <Stack.Screen name="create-job" options={{ title: 'Create Job Post' }} />
      <Stack.Screen
        name="reports"
        options={{ title: 'Reports For Job Post' }}
      />
      <Stack.Screen
        name="reports/[id]/page"
        options={{ title: 'Report Details' }}
      />
      <Stack.Screen
        name="reports/[id]/appeal"
        options={{ title: 'Appeals For Job Post' }}
      />
      <Stack.Screen
        name="pending-verification"
        options={{ title: 'Approval Pending' }}
      />
    </Stack>
  );
}
