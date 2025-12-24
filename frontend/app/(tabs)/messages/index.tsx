// app/(user-hidden)/messages/index.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function MessagesRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Use absolute path and slight delay
    const timer = setTimeout(() => {
      router.replace('/(shared)/conversation-list');
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  // ✅ Return a loading view instead of null
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1E3A8A" />
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
});
