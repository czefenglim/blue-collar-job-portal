import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import VoiceTextInput from '../components/VoiceTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VoiceInputDemo() {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Voice Input Demo</Text>
        <Text style={styles.subtitle}>Press and hold the mic to speak</Text>

        <Text style={styles.label}>Full Name</Text>
        <VoiceTextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          style={{ marginBottom: 16 }}
          language="en-US"
        />

        <Text style={styles.label}>Notes</Text>
        <VoiceTextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          language="en-US"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B1222',
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 20,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 6,
  },
});
