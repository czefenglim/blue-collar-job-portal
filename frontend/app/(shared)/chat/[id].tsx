// src/screens/ChatScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ActionSheetIOS,
  Linking,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format, isToday, isYesterday } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import useChat from '@/hooks/useChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context';
import VoiceTextInput from '@/components/VoiceTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string | null;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentType: string | null;
  isRead: boolean;
  readAt: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: number;
    fullName: string;
    role: string;
  };
}

interface User {
  id: number;
  role: string;
  fullName: string;
}

const ChatScreen: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, name, jobTitle } = params;
  const conversationId = parseInt(id as string);

  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<any>(null);

  const SCROLL_THRESHOLD = 100;

  useEffect(() => {
    if (!id || isNaN(conversationId)) {
      console.error('Invalid conversation ID:', id);
      Alert.alert(t('common.error'), 'Invalid conversation ID');
      router.back();
    }
  }, [id, conversationId]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!userToken || !userData) {
        Alert.alert(t('common.error'), 'Please login to continue');
        router.back();
        return;
      }

      setToken(userToken);
      setUser(JSON.parse(userData));
      setUserLoaded(true);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t('common.error'), 'Failed to load user data');
    }
  };

  const handleNewMessage = useCallback(
    (message: Message) => {
      console.log('New message received:', message);
      try {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });

        setTimeout(() => {
          scrollToBottom();
        }, 100);

        if (message.senderId !== user?.id && conversationId) {
          markAsRead(conversationId);
        }
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    },
    [user?.id, conversationId]
  );

  const handleMessageEdited = useCallback((message: Message) => {
    console.log('Message edited:', message);
    try {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    } catch (error) {
      console.error('Error handling message edit:', error);
    }
  }, []);

  const handleMessageDeleted = useCallback(
    (data: { messageId: number; conversationId: number }) => {
      console.log('Message deleted:', data);
      try {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, isDeleted: true, content: null }
              : m
          )
        );
      } catch (error) {
        console.error('Error handling message delete:', error);
      }
    },
    []
  );

  const handleMessagesRead = useCallback(
    (data: { conversationId: number; readBy: number; count: number }) => {
      console.log('Messages read:', data);
      try {
        if (data.readBy !== user?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === user?.id && !m.isRead
                ? { ...m, isRead: true, readAt: new Date().toISOString() }
                : m
            )
          );
        }
      } catch (error) {
        console.error('Error handling messages read:', error);
      }
    },
    [user?.id]
  );

  const handleTypingChange = useCallback(
    (data: { conversationId: number; userId: number; isTyping: boolean }) => {
      try {
        if (data.userId !== user?.id) {
          setTypingUsers((prev) =>
            data.isTyping
              ? [...prev.filter((id) => id !== data.userId), data.userId]
              : prev.filter((id) => id !== data.userId)
          );
        }
      } catch (error) {
        console.error('Error handling typing change:', error);
      }
    },
    [user?.id]
  );

  const handleSocketError = useCallback((error: string) => {
    console.error('Socket error:', error);
  }, []);

  const handleConversationUpdated = useCallback((data: any) => {
    console.log('📝 Conversation updated in ChatScreen:', data);
  }, []);

  const {
    isConnected,
    sendMessage: socketSendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    editMessage: socketEditMessage,
    deleteMessage: socketDeleteMessage,
  } = useChat({
    conversationId: userLoaded ? conversationId : undefined,
    onNewMessage: userLoaded ? handleNewMessage : undefined,
    onMessageEdited: userLoaded ? handleMessageEdited : undefined,
    onMessageDeleted: userLoaded ? handleMessageDeleted : undefined,
    onMessagesRead: userLoaded ? handleMessagesRead : undefined,
    onTypingChange: userLoaded ? handleTypingChange : undefined,
    onConversationUpdated: userLoaded ? handleConversationUpdated : undefined,
    onError: handleSocketError,
  });

  useEffect(() => {
    console.log(
      'Socket connection status:',
      isConnected ? 'Connected' : 'Disconnected'
    );
  }, [isConnected]);

  const fetchConversation = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${URL}/api/chat/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConversation(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async (pageNum: number = 1) => {
    if (!token) return;

    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(
        `${URL}/api/chat/conversations/${conversationId}/messages?page=${pageNum}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          if (pageNum === 1) {
            setMessages(data.data);
            await markMessagesAsReadApi();
          } else {
            setMessages((prev) => [...data.data, ...prev]);
          }

          setHasMore(
            data.pagination ? pageNum < data.pagination.totalPages : false
          );
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markMessagesAsReadApi = async () => {
    if (!token) return;

    try {
      await fetch(`${URL}/api/chat/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (userLoaded) {
        try {
          markAsRead(conversationId);
        } catch (e) {
          console.warn('Failed to emit mark_read over socket:', e);
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const getOtherUserInfo = () => {
    if (!conversation) return { name: '', avatar: null };

    const isEmployer = user?.role === 'EMPLOYER';

    if (isEmployer) {
      return {
        name: conversation.jobSeeker.fullName,
        avatar: conversation.jobSeeker.profile?.profilePicture,
      };
    } else {
      return {
        name:
          conversation.employer.company?.name || conversation.employer.fullName,
        avatar: conversation.employer.company?.logo,
      };
    }
  };

  useEffect(() => {
    if (userLoaded && user && token) {
      fetchConversation();
      fetchMessages();
    }
  }, [conversationId, userLoaded, user, token]);

  useEffect(() => {
    const keyboardSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (messages.length > 0) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      }
    );

    return () => {
      keyboardSubscription.remove();
    };
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() && !editingMessage) return;
    if (!token) return;

    const text = inputText.trim();
    setInputText('');
    stopTyping(conversationId);

    if (editingMessage) {
      try {
        const response = await fetch(
          `${URL}/api/chat/messages/${editingMessage.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: text }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            socketEditMessage(editingMessage.id, text);
          }
        }
      } catch (error) {
        console.error('Error editing message:', error);
        Alert.alert(t('common.error'), t('chat.editError'));
      } finally {
        setEditingMessage(null);
      }
    } else {
      setSending(true);
      try {
        if (isConnected) {
          socketSendMessage(conversationId, text);
        } else {
          const response = await fetch(
            `${URL}/api/chat/conversations/${conversationId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ content: text }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setMessages((prev) => [...prev, data.data]);
              scrollToBottom();
            }
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert(t('common.error'), t('chat.sendError'));
      } finally {
        setSending(false);
      }
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.length > 0 && userLoaded) {
      startTyping(conversationId);
    } else if (userLoaded) {
      stopTyping(conversationId);
    }
  };

  const handleAttachment = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            t('chat.takePhoto'),
            t('chat.choosePhoto'),
            t('chat.chooseFile'),
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleCamera();
          if (buttonIndex === 2) handleImagePicker();
          if (buttonIndex === 3) handleFilePicker();
        }
      );
    } else {
      Alert.alert(t('chat.attachment'), t('chat.chooseAttachmentType'), [
        { text: t('chat.takePhoto'), onPress: handleCamera },
        { text: t('chat.choosePhoto'), onPress: handleImagePicker },
        { text: t('chat.chooseFile'), onPress: handleFilePicker },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('chat.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('chat.galleryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  };

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets[0]) {
        uploadFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const uploadFile = async (file: any) => {
    if (!token) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.fileName || file.name || 'attachment',
        type: file.mimeType || file.type || 'application/octet-stream',
      } as any);

      const response = await fetch(
        `${URL}/api/chat/conversations/${conversationId}/messages/attachment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMessages((prev) => [...prev, data.data]);
          scrollToBottom();
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert(t('common.error'), t('chat.uploadError'));
    } finally {
      setSending(false);
    }
  };

  const handleMessageLongPress = (message: Message) => {
    if (message.senderId !== user?.id || message.isDeleted) return;

    const options =
      message.messageType === 'TEXT'
        ? [t('common.cancel'), t('chat.edit'), t('chat.delete')]
        : [t('common.cancel'), t('chat.delete')];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.length - 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (message.messageType === 'TEXT') {
            if (buttonIndex === 1) handleEditMessage(message);
            if (buttonIndex === 2) handleDeleteMessage(message);
          } else {
            if (buttonIndex === 1) handleDeleteMessage(message);
          }
        }
      );
    } else {
      Alert.alert(
        t('chat.messageOptions'),
        '',
        message.messageType === 'TEXT'
          ? [
              {
                text: t('chat.edit'),
                onPress: () => handleEditMessage(message),
              },
              {
                text: t('chat.delete'),
                style: 'destructive',
                onPress: () => handleDeleteMessage(message),
              },
              { text: t('common.cancel'), style: 'cancel' },
            ]
          : [
              {
                text: t('chat.delete'),
                style: 'destructive',
                onPress: () => handleDeleteMessage(message),
              },
              { text: t('common.cancel'), style: 'cancel' },
            ]
      );
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setInputText(message.content || '');
    inputRef.current?.focus();
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleDeleteMessage = async (message: Message) => {
    Alert.alert(t('chat.deleteMessage'), t('chat.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chat.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!token) return;

          try {
            const response = await fetch(
              `${URL}/api/chat/messages/${message.id}`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                socketDeleteMessage(message.id);
              }
            }
          } catch (error) {
            console.error('Error deleting message:', error);
            Alert.alert(t('common.error'), t('chat.deleteError'));
          }
        },
      },
    ]);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage);
    }
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return t('chat.today');
    } else if (isYesterday(date)) {
      return t('chat.yesterday');
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openAttachment = (url: string) => {
    Linking.openURL(url);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      listener: (event) => {
        const offsetY = (event as any).nativeEvent.contentOffset.y;
        const contentHeight = (event as any).nativeEvent.contentSize.height;
        const layoutHeight = (event as any).nativeEvent.layoutMeasurement
          .height;

        // Show scroll button if scrolled up more than threshold
        setShowScrollButton(
          offsetY < contentHeight - layoutHeight - SCROLL_THRESHOLD
        );
      },
      useNativeDriver: false,
    }
  );

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.id;
    const showDate =
      index === 0 ||
      format(new Date(item.createdAt), 'yyyy-MM-dd') !==
        format(new Date(messages[index - 1].createdAt), 'yyyy-MM-dd');

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <LinearGradient
              colors={['#e0e7ff', '#c7d2fe']}
              style={styles.dateSeparatorGradient}
            >
              <Text style={styles.dateText}>
                {formatDateSeparator(item.createdAt)}
              </Text>
            </LinearGradient>
          </View>
        )}

        <TouchableOpacity
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.8}
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
          ]}
        >
          {!isOwnMessage &&
            index > 0 &&
            messages[index - 1].senderId !== item.senderId && (
              <Text style={styles.senderName}>{item.sender.fullName}</Text>
            )}

          {item.isDeleted ? (
            <View style={[styles.messageBubble, styles.deletedBubble]}>
              <Ionicons name="ban-outline" size={14} color="#9ca3af" />
              <Text style={styles.deletedText}>{t('chat.messageDeleted')}</Text>
            </View>
          ) : (
            <View
              style={[
                styles.messageBubble,
                isOwnMessage ? styles.ownBubble : styles.otherBubble,
                isOwnMessage && styles.ownBubbleShadow,
                !isOwnMessage && styles.otherBubbleShadow,
              ]}
            >
              {item.messageType === 'IMAGE' && item.attachmentUrl && (
                <TouchableOpacity
                  onPress={() => openAttachment(item.attachmentUrl!)}
                  style={styles.imageContainer}
                >
                  <Image
                    source={{ uri: item.attachmentUrl }}
                    style={styles.imageAttachment}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="expand" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>
              )}

              {item.messageType === 'FILE' && item.attachmentUrl && (
                <TouchableOpacity
                  style={styles.fileAttachment}
                  onPress={() => openAttachment(item.attachmentUrl!)}
                >
                  <LinearGradient
                    colors={['#6366f1', '#4f46e5']}
                    style={styles.fileIconContainer}
                  >
                    <Ionicons name="document-outline" size={24} color="#fff" />
                  </LinearGradient>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.attachmentName || 'File'}
                    </Text>
                    {item.attachmentSize && (
                      <Text style={styles.fileSize}>
                        {formatFileSize(item.attachmentSize)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="download-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}

              {item.content && (
                <Text
                  style={[
                    styles.messageText,
                    isOwnMessage
                      ? styles.ownMessageText
                      : styles.otherMessageText,
                  ]}
                >
                  {item.content}
                </Text>
              )}

              <View style={styles.messageMeta}>
                {item.isEdited && (
                  <Text style={styles.editedLabel}>{t('chat.edited')}</Text>
                )}
                <Text
                  style={[
                    styles.messageTime,
                    isOwnMessage
                      ? styles.ownMessageTime
                      : styles.otherMessageTime,
                  ]}
                >
                  {formatMessageTime(item.createdAt)}
                </Text>
                {isOwnMessage && (
                  <Ionicons
                    name={item.isRead ? 'checkmark-done' : 'checkmark'}
                    size={16}
                    color={item.isRead ? '#10b981' : '#9ca3af'}
                    style={styles.readIcon}
                  />
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={[styles.messageContainer, styles.otherMessage]}>
        <View
          style={[
            styles.messageBubble,
            styles.otherBubble,
            styles.typingBubble,
          ]}
        >
          <Text style={styles.typingText}>{t('chat.typing')}</Text>
          <View style={styles.typingDots}>
            <Animated.View style={[styles.dot, styles.dot1]} />
            <Animated.View style={[styles.dot, styles.dot2]} />
            <Animated.View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

  if (!userLoaded || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LinearGradient
          colors={['#f8fafc', '#f1f5f9']}
          style={styles.loadingBackground}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>{t('chat.loadingMessages')}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const scrollButtonOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9']}
        style={styles.backgroundGradient}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {!isConnected && userLoaded && (
            <Animated.View style={styles.connectionBanner}>
              <LinearGradient
                colors={['#fef3c7', '#fde68a']}
                style={styles.connectionGradient}
              >
                <Ionicons name="wifi-outline" size={16} color="#92400e" />
                <Text style={styles.connectionText}>
                  {t('chat.connecting')}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Enhanced Header */}
          <BlurView intensity={90} tint="light" style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <View style={styles.backButtonCircle}>
                <Ionicons name="arrow-back" size={20} color="#4f46e5" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerUserInfo} activeOpacity={0.8}>
              {getOtherUserInfo().avatar ? (
                <Image
                  source={{ uri: getOtherUserInfo().avatar }}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#8b5cf6', '#6366f1']}
                  style={styles.headerAvatar}
                >
                  <Text style={styles.headerAvatarText}>
                    {getOtherUserInfo().name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}

              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {getOtherUserInfo().name}
                </Text>
                <Text style={styles.headerJobTitle} numberOfLines={1}>
                  {conversation.job.title}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerActionButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#4f46e5" />
            </TouchableOpacity>
          </BlurView>

          {/* Job Info Banner */}
          {conversation?.job && (
            <LinearGradient
              colors={['#e0e7ff', '#c7d2fe']}
              style={styles.jobHeader}
            >
              <Text style={styles.jobHeaderText}>
                {t('chat.job')}: {conversation.job.title} •{' '}
                {conversation.job.company?.name}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.messagesContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.1}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              inverted={false}
              ListHeaderComponent={
                loadingMore ? (
                  <ActivityIndicator
                    size="small"
                    color="#6366f1"
                    style={styles.loader}
                  />
                ) : null
              }
              ListFooterComponent={renderTypingIndicator}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (page === 1 && messages.length > 0) {
                  setTimeout(() => {
                    scrollToBottom();
                  }, 100);
                }
              }}
            />

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <Animated.View
                style={[styles.scrollButton, { opacity: scrollButtonOpacity }]}
              >
                <TouchableOpacity
                  style={styles.scrollButtonInner}
                  onPress={scrollToBottom}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#6366f1', '#4f46e5']}
                    style={styles.scrollButtonGradient}
                  >
                    <Ionicons name="arrow-down" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Editing Bar */}
          {editingMessage && (
            <LinearGradient
              colors={['#e0e7ff', '#c7d2fe']}
              style={styles.editingBar}
            >
              <View style={styles.editingInfo}>
                <View style={styles.editingIcon}>
                  <Ionicons name="pencil" size={14} color="#4f46e5" />
                </View>
                <Text style={styles.editingText}>
                  {t('chat.editingMessage')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={cancelEditing}
                style={styles.cancelEditButton}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </LinearGradient>
          )}

          {/* Enhanced Input Container */}
          <BlurView intensity={90} tint="light" style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleAttachment}
              disabled={sending}
            >
              <LinearGradient
                colors={['#f3f4f6', '#e5e7eb']}
                style={styles.attachButtonCircle}
              >
                <Ionicons name="add" size={24} color="#4b5563" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <VoiceTextInput
                ref={inputRef}
                style={styles.voiceInputContainer}
                inputStyle={styles.voiceInput}
                value={inputText}
                onChangeText={handleTextChange}
                placeholder={t('chat.typeMessage')}
                placeholderTextColor="#9ca3af"
                multiline
                language={
                  currentLanguage === 'zh'
                    ? 'zh-CN'
                    : currentLanguage === 'ms'
                    ? 'ms-MY'
                    : currentLanguage === 'ta'
                    ? 'ta-IN'
                    : 'en-US'
                }
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              <LinearGradient
                colors={
                  !inputText.trim() || sending
                    ? ['#9ca3af', '#6b7280']
                    : ['#6366f1', '#4f46e5']
                }
                style={styles.sendButtonGradient}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={editingMessage ? 'checkmark' : 'send'}
                    size={20}
                    color="#fff"
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  connectionBanner: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  connectionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  connectionText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loader: {
    marginVertical: 20,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateSeparatorGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: '500',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 6,
  },
  ownBubbleShadow: {
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
  },
  otherBubbleShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deletedBubble: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  deletedText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 8,
    fontSize: 14,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'flex-end',
  },
  editedLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 6,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  readIcon: {
    marginLeft: 4,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageAttachment: {
    width: 240,
    height: 240,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 6,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  editingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editingIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editingText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelEditButton: {
    padding: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButton: {
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerJobTitle: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  headerActionButton: {
    padding: 8,
  },
  jobHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  jobHeaderText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  attachButton: {
    marginRight: 8,
  },
  attachButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  voiceInputContainer: {
    flex: 1,
  },
  voiceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 100,
  },
  scrollButtonInner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
