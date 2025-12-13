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
      <Stack.Screen
        name="edit-company-profile"
        options={{ title: t('employerHiddenLayout.editCompanyProfile') }}
      />
      <Stack.Screen
        name="applicant-details/[id]"
        options={{ title: t('employerHiddenLayout.applicantDetails') }}
      />
      <Stack.Screen
        name="job-post-details/[id]"
        options={{ title: t('employerHiddenLayout.jobPostDetails') }}
      />
      <Stack.Screen
        name="job-post-details/[id]/edit"
        options={{ title: t('employerHiddenLayout.editJobPost') }}
      />
      <Stack.Screen name="create-job" options={{ title: t('employerHiddenLayout.createJobPost') }} />
      <Stack.Screen
        name="reports"
        options={{ title: t('employerHiddenLayout.reportsForJobPost') }}
      />
      <Stack.Screen
        name="reports/[id]/page"
        options={{ title: t('employerHiddenLayout.reportDetails') }}
      />
      <Stack.Screen
        name="reports/[id]/appeal"
        options={{ title: t('employerHiddenLayout.appealsForJobPost') }}
      />
      <Stack.Screen
        name="pending-verification"
        options={{ title: t('employerHiddenLayout.approvalPending') }}
      />
      <Stack.Screen name="reviews" options={{ title: t('employerHiddenLayout.reviewsManagement') }} />
    </Stack>
  );
}
