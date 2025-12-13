import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../contexts/LanguageContext';

export default function HiddenLayout() {
  const router = useRouter();
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
      <Stack.Screen name="login" options={{ title: t('adminHiddenLayout.login') }} />
      <Stack.Screen
        name="reports/job-review/[jobId]"
        options={{ title: t('adminHiddenLayout.jobPostReview') }}
      />
      <Stack.Screen name="jobs/[id]" options={{ title: t('adminHiddenLayout.jobDetails') }} />
      <Stack.Screen
        name="appeals/index"
        options={{ title: t('adminHiddenLayout.appealsForJobPost') }}
      />
      <Stack.Screen name="appeals/[id]" options={{ title: t('adminHiddenLayout.appealDetails') }} />
      <Stack.Screen
        name="review-moderation"
        options={{ title: t('adminHiddenLayout.reviewModeration') }}
      />
      <Stack.Screen
        name="company-approval/[id]"
        options={{ title: t('adminHiddenLayout.companyApprovalDetails') }}
      />
      <Stack.Screen name="companies/page" options={{ title: t('adminHiddenLayout.companies') }} />
      <Stack.Screen
        name="companies/[id]"
        options={{ title: t('adminHiddenLayout.companyDetails') }}
      />
    </Stack>
  );
}
