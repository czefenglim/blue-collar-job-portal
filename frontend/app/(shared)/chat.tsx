// src/screens/ChatScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import useChat from '@/hooks/useChat';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface RouteParams {
  id: string;
  name?: string;
  jobTitle?: string;
}

interface User {
  id: number;
  role: string;
  fullName: string;
}

const ChatScreen: React.FC = () => {
  const { t } = useLanguage();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { id, name, jobTitle } = route.params as RouteParams;
  const conversationId = parseInt(id);

  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
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

  const flatListRef = useRef<FlatList>(null);

  // Load user data and token
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userToken = await AsyncStorage.getItem('jwtToken');
      const userData = await AsyncStorage.getItem('user');

      if (!userToken || !userData) {
        Alert.alert(t('common.error'), 'Please login to continue');
        navigation.goBack();
        return;
      }

      setToken(userToken);
      setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(t('common.error'), 'Failed to load user data');
    }
  };

  // Socket connection
  const {
    isConnected,
    sendMessage: socketSendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    editMessage: socketEditMessage,
    deleteMessage: socketDeleteMessage,
  } = useChat({
    conversationId,
    onNewMessage: (message) => {
      setMessages((prev) => [...prev, message]);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      // Mark as read if from other user
      if (message.senderId !== user?.id) {
        markAsRead(conversationId);
      }
    },
    onMessageEdited: (message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    },
    onMessageDeleted: (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isDeleted: true, content: null } : m
        )
      );
    },
    onMessagesRead: (data) => {
      if (data.readBy !== user?.id) {
        // Update all messages as read
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id
              ? { ...m, isRead: true, readAt: new Date().toISOString() }
              : m
          )
        );
      }
    },
    onTypingChange: (data) => {
      if (data.userId !== user?.id) {
        setTypingUsers((prev) =>
          data.isTyping
            ? [...prev.filter((id) => id !== data.userId), data.userId]
            : prev.filter((id) => id !== data.userId)
        );
      }
    },
  });

  // Fetch conversation details
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
          navigation.setOptions({
            headerTitle: name || getOtherUserName(data.data),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  // Fetch messages
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
            // Mark all as read
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

  // Mark messages as read
  const markMessagesAsReadApi = async () => {
    if (!token) return;

    try {
      await fetch(`${URL}/api/chat/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Get other user's name
  const getOtherUserName = (conv: any) => {
    if (!conv) return '';
    const isEmployer = user?.role === 'EMPLOYER';
    if (isEmployer) {
      return conv.jobSeeker.fullName;
    } else {
      return conv.employer.company?.name || conv.employer.fullName;
    }
  };

  // Initial load
  useEffect(() => {
    if (user && token) {
      fetchConversation();
      fetchMessages();
    }
  }, [conversationId, user, token]);

  // Handle send message
  const handleSend = async () => {
    if (!inputText.trim() && !editingMessage) return;
    if (!token) return;

    const text = inputText.trim();
    setInputText('');
    stopTyping(conversationId);

    if (editingMessage) {
      // Edit existing message
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
      // Send new message
      setSending(true);
      try {
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
            // Socket will broadcast, but add optimistically
            setMessages((prev) => [...prev, data.data]);
            flatListRef.current?.scrollToEnd({ animated: true });
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

  // Handle text change with typing indicator
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (text.length > 0) {
      startTyping(conversationId);
    } else {
      stopTyping(conversationId);
    }
  };

  // Handle attachment
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

  // Handle camera
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

  // Handle image picker
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

  // Handle file picker
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

  // Upload file
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

  // Handle message long press (edit/delete)
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

  // Handle edit message
  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setInputText(message.content || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessage(null);
    setInputText('');
  };

  // Handle delete message
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

  // Load more messages
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage);
    }
  };

  // Format time
  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Open attachment
  const openAttachment = (url: string) => {
    Linking.openURL(url);
  };

  // Render message bubble
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.id;
    const showDate =
      index === 0 ||
      format(new Date(item.createdAt), 'yyyy-MM-dd') !==
        format(new Date(messages[index - 1].createdAt), 'yyyy-MM-dd');

    return (
      <View>
        {/* Date separator */}
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {format(new Date(item.createdAt), 'MMMM d, yyyy')}
            </Text>
          </View>
        )}

        {/* Message bubble */}
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
              {/* Image attachment */}
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

              {/* File attachment */}
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

              {/* Text content */}
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

              {/* Message meta */}
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
                    size={14}
                    color={item.isRead ? '#2563eb' : '#9ca3af'}
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

  // Render typing indicator
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

  if (loading) {
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
      {/* Job title header */}
      {jobTitle && (
        <View style={styles.jobHeader}>
          <Text style={styles.jobHeaderText}>{jobTitle}</Text>
        </View>
      )}

      {/* Messages list */}
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

      {/* Editing indicator */}
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

      {/* Input area */}
      <View style={styles.inputContainer}>
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
});

export default ChatScreen;
