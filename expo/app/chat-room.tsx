import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { api, BASE_URL, getToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage, Conversation } from '@/types';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const _queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const convoQuery = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get<{ data: Conversation }>(`/chat/conversations/${id}`),
    enabled: !!id,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get<{ data: ChatMessage[] }>(`/chat/conversations/${id}/messages`),
    enabled: !!id,
  });

  useEffect(() => {
    if (messagesQuery.data?.data) {
      setMessages(messagesQuery.data.data);
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!id) return;

    const connectWs = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const wsUrl = BASE_URL.replace('https', 'wss').replace('http', 'ws');
        const ws = new WebSocket(`${wsUrl}/ws/chat/${id}?token=${token}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ChatMessage;
            setMessages((prev) => [...prev, data]);
          } catch (e) {
            console.log('[WS] Parse error:', e);
          }
        };

        ws.onerror = (error) => {
          console.log('[WS] Error:', error);
        };

        ws.onclose = () => {
          console.log('[WS] Closed');
        };
      } catch (e) {
        console.log('[WS] Connect error:', e);
      }
    };

    void connectWs();

    return () => {
      wsRef.current?.close();
    };
  }, [id]);

  const handleSend = useCallback(() => {
    if (!message.trim() || !wsRef.current) return;
    const payload = JSON.stringify({ content: message.trim() });
    wsRef.current.send(payload);
    setMessage('');
  }, [message]);

  const convoName = convoQuery.data?.data?.name ||
    convoQuery.data?.data?.participants.map((p) => p.name).join(', ') ||
    'Chat';

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>{item.sender_name.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
          {!isMe && <Text style={styles.msgSender}>{item.sender_name}</Text>}
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: convoName,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        {messagesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.chatInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <Send size={18} color={message.trim() ? theme.colors.accent : theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  msgAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  msgBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  msgBubbleMe: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  msgSender: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 20,
  },
  msgTextMe: {
    color: theme.colors.background,
  },
  msgTime: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeMe: {
    color: 'rgba(11,15,26,0.5)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
