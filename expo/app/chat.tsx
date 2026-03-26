import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import type { Conversation } from '@/types';

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function ConversationRow({ convo, onPress }: { convo: Conversation; onPress: () => void }) {
  const displayName = convo.name || convo.participants.map((p) => p.name).join(', ');
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.convoRow} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.avatar, convo.unread_count > 0 && styles.avatarUnread]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.convoContent}>
        <View style={styles.convoTop}>
          <Text style={[styles.convoName, convo.unread_count > 0 && styles.convoNameBold]} numberOfLines={1}>
            {displayName}
          </Text>
          {convo.last_message_at && (
            <Text style={styles.convoTime}>{formatTimeAgo(convo.last_message_at)}</Text>
          )}
        </View>
        <View style={styles.convoBottom}>
          <Text style={styles.convoLastMsg} numberOfLines={1}>
            {convo.last_message || 'No messages yet'}
          </Text>
          {convo.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{convo.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const convosQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<{ data: Conversation[] }>('/chat/conversations'),
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  const conversations = convosQuery.data?.data ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Chat',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow
            convo={item}
            onPress={() => router.push(`/chat-room?id=${item.id}` as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={convosQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          convosQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={<MessageSquare size={28} color={theme.colors.textTertiary} />}
              title="No conversations"
              description="Start a conversation with someone in your church"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnread: {
    backgroundColor: theme.colors.accentMuted,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  convoContent: {
    flex: 1,
    gap: 4,
  },
  convoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convoName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  convoNameBold: {
    fontWeight: '700' as const,
  },
  convoTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  convoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convoLastMsg: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.colors.background,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 76,
  },
});
