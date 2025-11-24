// src/screens/ChatScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ActionSheetIOS,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import useChat from '@/hooks/useChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { t } = useLanguage();
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
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);

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
          flatListRef.current?.scrollToEnd({ animated: true });
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

  // Add this callback BEFORE the useChat hook
  const handleConversationUpdated = useCallback((data: any) => {
    console.log('📝 Conversation updated in ChatScreen:', data);
    // This event is mainly for the conversation list, not the chat screen
    // But we can use it to show a visual indicator if needed
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
    onConversationUpdated: userLoaded ? handleConversationUpdated : undefined, // ✅ ADD THIS
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
      // Also emit over socket so the other participant updates immediately
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
      // Employer sees job seeker's info
      return {
        name: conversation.jobSeeker.fullName,
        avatar: conversation.jobSeeker.profile?.profilePicture,
      };
    } else {
      // Job seeker sees company info
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
          // Prefer socket for real-time delivery and read propagation
          socketSendMessage(conversationId, text);
          // Rely on 'new_message' event to update both participants
        } else {
          // Fallback to API if socket unavailable
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
              flatListRef.current?.scrollToEnd({ animated: true });
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
          flatListRef.current?.scrollToEnd({ animated: true });
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
    return format(new Date(dateString), 'HH:mm');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openAttachment = (url: string) => {
    Linking.openURL(url);
  };

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
            <Text style={styles.dateText}>
              {format(new Date(item.createdAt), 'MMMM d, yyyy')}
            </Text>
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
              ]}
            >
              {item.messageType === 'IMAGE' && item.attachmentUrl && (
                <TouchableOpacity
                  onPress={() => openAttachment(item.attachmentUrl!)}
                >
                  <Image
                    source={{ uri: item.attachmentUrl }}
                    style={styles.imageAttachment}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {item.messageType === 'FILE' && item.attachmentUrl && (
                <TouchableOpacity
                  style={styles.fileAttachment}
                  onPress={() => openAttachment(item.attachmentUrl!)}
                >
                  <Ionicons name="document-outline" size={24} color="#2563eb" />
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
                    color={item.isRead ? '#EAB308' : '#9ca3af'}
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
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  };

  if (!userLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!isConnected && userLoaded && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>Connecting to chat...</Text>
        </View>
      )}

      {/* ✅ Header already displays avatar correctly */}
      {conversation && (
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerAvatarContainer}>
            {getOtherUserInfo().avatar ? (
              <Image
                source={{ uri: getOtherUserInfo().avatar }}
                style={styles.headerAvatar}
                // ✅ Add these props for better image handling
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.headerAvatar, styles.defaultHeaderAvatar]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {getOtherUserInfo().name}
            </Text>
            <Text style={styles.headerJobTitle} numberOfLines={1}>
              {conversation.job.title}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        inverted={false}
        ListHeaderComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color="#2563eb"
              style={styles.loader}
            />
          ) : null
        }
        ListFooterComponent={renderTypingIndicator}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          if (page === 1) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {editingMessage && (
        <View style={styles.editingBar}>
          <View style={styles.editingInfo}>
            <Ionicons name="pencil" size={16} color="#2563eb" />
            <Text style={styles.editingText}>{t('chat.editingMessage')}</Text>
          </View>
          <TouchableOpacity onPress={cancelEditing}>
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom:
              Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8,
            marginBottom: Platform.OS === 'android' ? 8 : 0,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachment}
          disabled={sending}
        >
          <Ionicons name="attach" size={24} color="#6b7280" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder={t('chat.typeMessage')}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#92400e',
    fontSize: 12,
    textAlign: 'center',
  },

  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  loader: {
    marginVertical: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#6b7280',
  },
  messageContainer: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  deletedBubble: {
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 6,
    fontSize: 14,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
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
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  editedLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginRight: 4,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 10,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  readIcon: {
    marginLeft: 4,
  },
  imageAttachment: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editingText: {
    color: '#2563eb',
    fontSize: 13,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#1f2937',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerAvatarContainer: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden', // ✅ Important for circular clipping
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  defaultHeaderAvatar: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerJobTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },

  // Update or remove old jobHeader styles if you want
  jobHeader: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  jobHeaderText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ChatScreen;
