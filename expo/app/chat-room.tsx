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
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api, BASE_URL, getToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage, Conversation } from '@/types';

interface ChatUserProfile {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  church_name?: string;
  followers_count?: number;
  post_count?: number;
}

function ProfileHeader({ profile, onViewProfile }: { profile: ChatUserProfile; onViewProfile: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.profileHeader}>
      <View style={styles.profileAvatarLarge}>
        <Text style={styles.profileAvatarLargeText}>{initials}</Text>
      </View>
      <Text style={styles.profileDisplayName}>{profile.full_name}</Text>
      <Text style={styles.profileMeta}>
        Shepherd{profile.username ? ` · ${profile.username}` : ''}
      </Text>
      {(profile.followers_count !== undefined || profile.post_count !== undefined) && (
        <Text style={styles.profileStats}>
          {profile.followers_count !== undefined ? `${profile.followers_count} followers` : ''}
          {profile.followers_count !== undefined && profile.post_count !== undefined ? ' · ' : ''}
          {profile.post_count !== undefined ? `${profile.post_count} posts` : ''}
        </Text>
      )}
      <TouchableOpacity
        style={styles.viewProfileBtn}
        onPress={onViewProfile}
        activeOpacity={0.7}
      >
        <Text style={styles.viewProfileBtnText}>View profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function InviteNotice({ name }: { name: string }) {
  const styles = createStyles(useTheme().theme);
  return (
    <View style={styles.inviteNotice}>
      <View style={styles.inviteDivider} />
      <View style={styles.inviteContent}>
        <Text style={styles.inviteTitle}>
          Invite {name} to chat
        </Text>
        <Text style={styles.inviteDesc}>
          You can only send one message in this invitation. Remember to follow our{' '}
          <Text style={styles.inviteLink}>Community Guidelines</Text>
          {' '}and be respectful when messaging others for the first time.
        </Text>
      </View>
    </View>
  );
}

export default function ChatRoomScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id, userId, userName, isNew } = useLocalSearchParams<{
    id?: string;
    userId?: string;
    userName?: string;
    isNew?: string;
  }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(id);
  const [isFirstMessage, setIsFirstMessage] = useState(isNew === 'true');
  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const targetUserId = userId;
  const targetUserName = userName ? decodeURIComponent(userName) : undefined;

  const profileQuery = useQuery({
    queryKey: ['chat-user-profile', targetUserId],
    queryFn: async () => {
      console.log('[ChatRoom] Fetching profile for:', targetUserId);
      try {
        const data = await api.get<ChatUserProfile>(`/members/${targetUserId}`);
        return data;
      } catch {
        return {
          id: targetUserId ?? '',
          full_name: targetUserName ?? 'User',
          followers_count: 0,
          post_count: 0,
        } as ChatUserProfile;
      }
    },
    enabled: !!targetUserId,
  });

  const convoQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.get<{ data: Conversation }>(`/chat/${conversationId}`),
    enabled: !!conversationId,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.get<{ data: ChatMessage[] }>(`/chat/${conversationId}/messages`),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (messagesQuery.data?.data) {
      setMessages(messagesQuery.data.data);
      if (messagesQuery.data.data.length > 0) {
        setIsFirstMessage(false);
      }
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!conversationId) return;

    const connectWs = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const wsUrl = BASE_URL.replace('https', 'wss').replace('http', 'ws');
        const ws = new WebSocket(`${wsUrl}/ws/chat/${conversationId}?token=${token}`);
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
  }, [conversationId]);

  const sendFirstMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log('[ChatRoom] Sending first message to user:', targetUserId);
      const res = await api.post<{ data: { conversation_id: string; message: ChatMessage } }>(
        '/chat/messages',
        {
          participant_ids: [targetUserId],
          content: content,
        }
      );
      return res;
    },
    onSuccess: (data) => {
      console.log('[ChatRoom] Conversation created:', data.data.conversation_id);
      setConversationId(data.data.conversation_id);
      setIsFirstMessage(false);
      setMessages([data.data.message]);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
    onError: (error) => {
      console.log('[ChatRoom] Send first message error:', error.message);
      const optimisticMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        sender_id: user?.id ?? '',
        sender_name: user?.full_name ?? '',
        content: message,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setIsFirstMessage(false);
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isFirstMessage && targetUserId && !conversationId) {
      sendFirstMessageMutation.mutate(trimmed);
      setMessage('');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content: trimmed }));
      setMessage('');
    } else {
      const optimisticMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        sender_id: user?.id ?? '',
        sender_name: user?.full_name ?? '',
        content: trimmed,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setMessage('');
    }
  }, [message, isFirstMessage, targetUserId, conversationId, sendFirstMessageMutation, user]);

  const handleViewProfile = useCallback(() => {
    if (targetUserId) {
      router.push(`/user-profile?id=${targetUserId}` as never);
    }
  }, [targetUserId, router]);

  const profile = profileQuery.data;
  const displayName = profile?.full_name ?? targetUserName ?? convoQuery.data?.data?.name ??
    convoQuery.data?.data?.participants.map((p) => p.name).join(', ') ?? 'Chat';

  const headerInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const canSend = message.trim().length > 0 && !sendFirstMessageMutation.isPending;

  const hasMessages = messages.length > 0;

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
  }, [user?.id, styles]);

  const showProfileSection = !!targetUserId;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitle: () => (
            <TouchableOpacity
              style={styles.headerTitleRow}
              onPress={handleViewProfile}
              activeOpacity={0.7}
              disabled={!targetUserId}
            >
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>{headerInitials}</Text>
              </View>
              <View>
                <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
                {profile?.username && (
                  <Text style={styles.headerUsername} numberOfLines={1}>{profile.username}</Text>
                )}
              </View>
              {targetUserId && <ChevronRight size={16} color={theme.colors.textTertiary} />}
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        {messagesQuery.isLoading && conversationId ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : showProfileSection && !hasMessages ? (
          <ScrollView
            ref={scrollViewRef}
            style={styles.flex}
            contentContainerStyle={styles.newChatContent}
            keyboardShouldPersistTaps="handled"
          >
            {profile && (
              <ProfileHeader profile={profile} onViewProfile={handleViewProfile} />
            )}
            {profileQuery.isLoading && (
              <View style={styles.profileLoading}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            )}
            <View style={styles.spacer} />
            <InviteNotice name={displayName} />
          </ScrollView>
        ) : showProfileSection && hasMessages ? (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgListWithProfile}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              <View>
                {profile && (
                  <ProfileHeader profile={profile} onViewProfile={handleViewProfile} />
                )}
                <View style={styles.timestampWrap}>
                  <Text style={styles.timestampText}>
                    {messages.length > 0
                      ? `Today ${new Date(messages[0].created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                      : ''}
                  </Text>
                </View>
                {isFirstMessage && <InviteNotice name={displayName} />}
              </View>
            }
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Message..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              testID="chat-message-input"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.6}
              testID="chat-send-btn"
            >
              <Text style={[styles.sendText, canSend && styles.sendTextActive]}>
                {sendFirstMessageMutation.isPending ? '...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
    maxWidth: 180,
  },
  headerUsername: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  profileAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  profileAvatarLargeText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  profileDisplayName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  profileStats: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: 12,
  },
  viewProfileBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  viewProfileBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  profileLoading: {
    paddingTop: 40,
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 60,
  },
  inviteNotice: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inviteDivider: {
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  inviteContent: {
    gap: 8,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  inviteDesc: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    lineHeight: 19,
  },
  inviteLink: {
    color: '#0095F6',
    fontWeight: '500' as const,
  },
  timestampWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timestampText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  msgList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgListWithProfile: {
    paddingHorizontal: 16,
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
    borderRadius: 15,
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
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgBubbleMe: {
    backgroundColor: '#0095F6',
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
    color: '#FFFFFF',
  },
  msgTime: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeMe: {
    color: 'rgba(255,255,255,0.6)',
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    paddingVertical: 6,
  },
  sendTextActive: {
    color: '#0095F6',
  },
});

