// src/components/StartChatButton.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface StartChatButtonProps {
  applicationId: number;
  applicantName?: string;
  jobTitle?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

const StartChatButton: React.FC<StartChatButtonProps> = ({
  applicationId,
  applicantName,
  jobTitle,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
}) => {
  const { t } = useLanguage();
  const router = useRouter();
  const URL = Constants.expoConfig?.extra?.API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [hasExistingChat, setHasExistingChat] = useState(false);
  const [existingConversationId, setExistingConversationId] = useState<
    number | null
  >(null);

  // Check if conversation already exists
  useEffect(() => {
    checkExistingConversation();
  }, [applicationId, checkExistingConversation]);

  const checkExistingConversation = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const response = await fetch(
        `${URL}/api/chat/conversations/application/${applicationId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setHasExistingChat(true);
          setExistingConversationId(data.data.id);
        } else {
          setHasExistingChat(false);
          setExistingConversationId(null);
        }
      }
    } catch (_error) {}
  }, [URL, applicationId]);

  const handlePress = async () => {
    setLoading(true);

    try {
      if (hasExistingChat && existingConversationId) {
        // Navigate to existing conversation
        router.push({
          pathname: '/(shared)/chat/[id]',
          params: {
            id: existingConversationId.toString(),
            name: applicantName || '',
            jobTitle: jobTitle || '',
          },
        });
      } else {
        // Create new conversation
        const token = await AsyncStorage.getItem('jwtToken');
        const response = await fetch(`${URL}/api/chat/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ applicationId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setHasExistingChat(true);
            setExistingConversationId(data.data.id);

            // Navigate to chat
            router.push({
              pathname: '/(shared)/chat/[id]',
              params: {
                id: data.data.id.toString(),
                name: applicantName || '',
                jobTitle: jobTitle || '',
              },
            });
          } else {
            Alert.alert(
              t('common.error'),
              data.message || t('chat.sendError')
            );
          }
        } else {
          Alert.alert(
            t('common.error'),
            t('chat.sendError')
          );
        }
      }
    } catch (error: any) {
      console.error('Error starting chat:', error);
      Alert.alert(t('common.error'), error.message || t('chat.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (hasExistingChat) {
      return t('chat.continueChat');
    }
    return size === 'small' ? t('chat.startChat') : t('chat.messageApplicant');
  };

  const getButtonStyle = () => {
    const styles: any[] = [buttonStyles.button, buttonStyles[size]];

    switch (variant) {
      case 'secondary':
        styles.push(buttonStyles.secondary);
        break;
      case 'outline':
        styles.push(buttonStyles.outline);
        break;
      default:
        styles.push(buttonStyles.primary);
    }

    if (fullWidth) {
      styles.push(buttonStyles.fullWidth);
    }

    return styles;
  };

  const getTextStyle = () => {
    const styles: any[] = [buttonStyles.text, buttonStyles[`${size}Text`]];

    switch (variant) {
      case 'outline':
        styles.push(buttonStyles.outlineText);
        break;
      default:
        styles.push(buttonStyles.primaryText);
    }

    return styles;
  };

  const getIconColor = () => {
    return variant === 'outline' ? '#2563eb' : '#fff';
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <>
          <Ionicons
            name={hasExistingChat ? 'chatbubble' : 'chatbubble-outline'}
            size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
            color={getIconColor()}
            style={buttonStyles.icon}
          />
          <Text style={getTextStyle()}>{getButtonText()}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const buttonStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#6366f1',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  small: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  medium: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  large: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  fullWidth: {
    width: '100%',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#2563eb',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});

export default StartChatButton;
