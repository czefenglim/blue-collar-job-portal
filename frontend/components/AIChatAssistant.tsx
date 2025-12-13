import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const API_URL = Constants.expoConfig?.extra?.API_BASE_URL;

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  buttons?: { label: string; action: string; params?: any }[];
}

export default function AIChatAssistant() {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', text: 'Hi! I am your AI assistant. How can I help you today?', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, visible]);

  const toggleChat = () => setVisible(!visible);

  const handleAction = (action: string, params?: any) => {
    setVisible(false); // Close chat on navigation? Or keep open? Maybe keep open for some, close for others.
    // For navigation, better to close or minimize. Let's close for now to let user see where they went.
    // Actually, usually chat stays open or minimizes. Let's just navigate.
    
    if (action.startsWith('/')) {
        // It's a route
        // params might need to be query params or path params.
        // Simple case: just push the path
        router.push(action as any);
        setVisible(false);
    } else {
        console.log('Unknown action:', action);
    }
  };

  const sendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Please log in to use the assistant.", sender: 'bot' }]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/ai-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });
      
      const data = await res.json();
      if (data.success) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: data.data.text,
          sender: 'bot',
          buttons: data.data.buttons
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
         setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, I encountered an error: " + (data.message || 'Unknown'), sender: 'bot' }]);
      }
    } catch (e) {
      console.error(e);
       setMessages(prev => [...prev, { id: Date.now().toString(), text: "Network error. Please try again.", sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble, 
      item.sender === 'user' ? styles.userBubble : styles.botBubble
    ]}>
      <Text style={[
        styles.messageText, 
        item.sender === 'user' ? styles.userText : styles.botText
      ]}>{item.text}</Text>
      
      {item.buttons && item.buttons.length > 0 && (
        <View style={styles.buttonContainer}>
          {item.buttons.map((btn, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.actionButton}
              onPress={() => handleAction(btn.action, btn.params)}
            >
              <Text style={styles.actionButtonText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={toggleChat}>
        <Ionicons name="chatbubbles" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={toggleChat}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <TouchableOpacity onPress={toggleChat} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              style={styles.list}
            />

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask me anything..."
                placeholderTextColor="#999"
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity 
                style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} 
                onPress={() => sendMessage()}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 60, // Leave some space at top
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#333',
  },
  buttonContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#e1f0ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 6,
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
