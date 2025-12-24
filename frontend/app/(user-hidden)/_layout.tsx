import { router, Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const NotificationsHeader = ({ route }: { route: any }) => {
    const unreadCount = route.params?.unreadCount || 0;

    return (
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {t('notifications.title') || 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {t('notifications.unreadCount', { count: unreadCount }) ||
                `${unreadCount} unread`}
            </Text>
          )}
        </View>
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
      <Stack.Screen
        name="notifications"
        options={({ route }) => ({
          header: () => <NotificationsHeader route={route} />,
          headerShown: true,
        })}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
});
