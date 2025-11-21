// src/components/StartChatButton.tsx

import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  createConversation,
  getConversationByApplicationId,
} from '../services/chatService';

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
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [hasExistingChat, setHasExistingChat] = useState(false);
  const [existingConversationId, setExistingConversationId] = useState<
    number | null
  >(null);

  // Check if conversation already exists
  useEffect(() => {
    checkExistingConversation();
  }, [applicationId]);

  const checkExistingConversation = async () => {
    try {
      const response = await getConversationByApplicationId(applicationId);
      if (response.success && response.data) {
        setHasExistingChat(true);
        setExistingConversationId(response.data.id);
      }
    } catch (error) {
      // No existing conversation
    }
  };

  const handlePress = async () => {
    setLoading(true);

    try {
      if (hasExistingChat && existingConversationId) {
        // Navigate to existing conversation
        navigation.navigate('/(employer)/chat/[id]', {
          id: existingConversationId,
          name: applicantName,
          jobTitle,
        });
      } else {
        // Create new conversation
        const response = await createConversation(applicationId);

        if (response.success && response.data) {
          setHasExistingChat(true);
          setExistingConversationId(response.data.id);

          // Navigate to chat
          navigation.navigate('/(employer)/chat/[id]', {
            id: response.data.id,
            name: applicantName,
            jobTitle,
          });
        } else {
          Alert.alert(
            t('common.error'),
            response.message || t('chat.sendError')
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
