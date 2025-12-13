// app/(employer)/messages/index.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MessagesRedirect() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // Use absolute path and slight delay
    const timer = setTimeout(() => {
      router.replace('/(shared)/conversation-list');
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // ✅ Return a loading view instead of null
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#1E3A8A"
        accessibilityLabel={t('common.loading')}
      />
      <Text style={styles.loadingText}>{t('common.loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
});
