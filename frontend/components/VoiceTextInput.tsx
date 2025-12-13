import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ✅ CRITICAL: Conditional import with error handling
let ExpoSpeechRecognitionModule: any = null;
// Always define a hook reference; default to a no-op hook to satisfy
// React's Rules of Hooks even when the module isn't available.
let useSpeechRecognitionEventHook: any = (
  _eventName: string,
  _handler: (...args: any[]) => void
) => {
  // No-op hook using useEffect to keep hook order consistent
  React.useEffect(() => {}, [_eventName, _handler]);
};
let isSpeechRecognitionAvailable = false;

try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventHook = speechRecognition.useSpeechRecognitionEvent;
  isSpeechRecognitionAvailable = true;
} catch (error) {
  console.log('⚠️ Speech recognition not available on this platform');
  isSpeechRecognitionAvailable = false;
}

export type VoiceTextInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  language?: string; // e.g., 'en-US', 'zh-CN', 'ms-MY', 'ta-IN'
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
  // Optional callback fired when the user submits from the keyboard
  onSubmitEditing?: () => void | Promise<void>;
};

export default function VoiceTextInput({
  value,
  onChangeText,
  placeholder,
  style,
  inputStyle,
  language = 'en-US',
  multiline = false,
  numberOfLines = 1,
  textAlignVertical,
  onSubmitEditing,
}: VoiceTextInputProps) {
  const [listening, setListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');

  // ✅ Always call hook to satisfy Rules of Hooks. The no-op hook will
  // do nothing on unsupported platforms; on supported platforms it
  // subscribes to recognition events.
  useSpeechRecognitionEventHook('start', () => {
    console.log('🎤 Speech recognition started');
    setListening(true);
  });

  useSpeechRecognitionEventHook('end', () => {
    console.log('🎤 Speech recognition ended');
    setListening(false);

    // Add recognized text to input value
    if (recognizedText) {
      const needsSpace = value && !value.endsWith(' ');
      const newValue = `${value}${needsSpace ? ' ' : ''}${recognizedText}`;
      onChangeText(newValue);
      setRecognizedText('');
    }
  });

  useSpeechRecognitionEventHook('result', (event: any) => {
    console.log('📝 Result:', event.results[0]?.transcript);
    // Update recognized text as user speaks
    setRecognizedText(event.results[0]?.transcript || '');
  });

  useSpeechRecognitionEventHook('error', (event: any) => {
    console.error('❌ Speech recognition error:', event.error);
    setListening(false);

    // Show user-friendly error messages
    if (event.error === 'not-allowed') {
      Alert.alert(
        'Permission Required',
        'Please enable microphone permissions in your device settings to use voice input.'
      );
    } else if (event.error === 'no-speech') {
      // Silent error - no need to alert user
    } else if (event.error === 'audio-capture') {
      Alert.alert(
        'Microphone Error',
        'Unable to access microphone. Please check your device settings.'
      );
    }
  });

  const startListening = async () => {
    if (!isSpeechRecognitionAvailable || !ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Not Available',
        'Voice input is not available on this device. Please use the keyboard to type.'
      );
      return;
    }

    try {
      // Request permissions first
      const { granted, status } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!granted && status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable microphone permissions to use voice input.'
        );
        return;
      }

      // Start speech recognition
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });

      setRecognizedText('');
    } catch (error: any) {
      console.error('Error starting speech recognition:', error);

      if (
        error.message?.includes('not available') ||
        error.message?.includes('not-available')
      ) {
        Alert.alert(
          'Not Available',
          'Speech recognition is not available on this device.'
        );
      } else {
        Alert.alert('Error', 'Failed to start voice recognition');
      }
    }
  };

  const stopListening = () => {
    if (!isSpeechRecognitionAvailable || !ExpoSpeechRecognitionModule) {
      return;
    }

    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.multilineInput, inputStyle]}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={textAlignVertical || (multiline ? 'top' : 'center')}
        onSubmitEditing={() => {
          // Invoke consumer callback if provided
          if (onSubmitEditing) {
            void onSubmitEditing();
          }
        }}
      />

      {/* ✅ Only show mic button if speech recognition is available */}
      {isSpeechRecognitionAvailable && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Voice input - Hold to speak"
          style={[styles.micButton, listening && styles.micButtonActive]}
          onPressIn={startListening}
          onPressOut={stopListening}
          activeOpacity={0.8}
        >
          {listening ? (
            <View style={styles.micIndicator}>
              <Ionicons name="mic" size={20} color="#FFFFFF" />
            </View>
          ) : (
            <Ionicons name="mic" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}

      {/* Show recognized text preview while speaking */}
      {listening && recognizedText && (
        <View style={styles.previewContainer}>
          <Ionicons name="mic" size={14} color="#1E3A8A" />
          <Text style={styles.previewText} numberOfLines={1}>
            {recognizedText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    paddingRight: 48, // Space for mic button (if available)
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
  },
  micIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    position: 'absolute',
    bottom: -35,
    left: 0,
    right: 0,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A8A',
    fontStyle: 'italic',
  },
});
