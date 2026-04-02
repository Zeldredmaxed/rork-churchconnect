import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Video, SquarePen, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api, extractArray } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import FollowButton from '@/components/FollowButton';
import type { Conversation, FlockUser } from '@/types';

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationRow({ convo, onPress }: { convo: Conversation; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const displayName = convo.name || convo.participants.map((p) => p.name).join(', ');
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity style={styles.convoRow} onPress={onPress} activeOpacity={0.6} testID="conversation-row">
      <View style={[styles.convoAvatar, convo.unread_count > 0 && styles.convoAvatarUnread]}>
        <Text style={styles.convoAvatarText}>{initials}</Text>
      </View>
      <View style={styles.convoContent}>
        <Text style={[styles.convoName, convo.unread_count > 0 && styles.convoNameBold]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.convoLastMsg, convo.unread_count > 0 && styles.convoLastMsgBold]} numberOfLines={1}>
          {convo.last_message
            ? `${convo.last_message}${convo.last_message_at ? ' · ' + formatTimeAgo(convo.last_message_at) : ''}`
            : 'Sent just now'}
        </Text>
      </View>
      {convo.unread_count > 0 && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function FollowerSuggestionRow({ user }: { user: FlockUser }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.is_following ?? false);
  const { user: currentUser } = useAuth();
  const isOwnUser = currentUser?.id != null && String(currentUser.id) === String(user.id);

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.followerRow}>
      <TouchableOpacity
        style={styles.followerInfo}
        onPress={() => router.push(`/user-profile?id=${user.id}` as never)}
        activeOpacity={0.6}
      >
        <View style={styles.followerAvatar}>
          <Text style={styles.followerAvatarText}>{initials}</Text>
        </View>
        <View style={styles.followerText}>
          <Text style={styles.followerName} numberOfLines={1}>{user.full_name}</Text>
          <Text style={styles.followerUsername} numberOfLines={1}>{user.username ?? user.church_name ?? ''}</Text>
        </View>
      </TouchableOpacity>
      {!isOwnUser && (
        <FollowButton
          userId={user.id}
          isFollowing={isFollowing}
          size="medium"
          onToggle={(s) => setIsFollowing(s)}
        />
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(false);

  interface ChatRequest {
    id: number;
    type: string;
    name: string | null;
    sender_name: string;
    preview: string;
    created_at: string;
  }

  const requestsQuery = useQuery({
    queryKey: ['chat-requests'],
    queryFn: async () => {
      try {
        const raw = await api.get<{ data: ChatRequest[] } | ChatRequest[]>('/chat/requests');
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: ChatRequest[] }).data;
        return [] as ChatRequest[];
      } catch {
        return [] as ChatRequest[];
      }
    },
  });

  const chatRequests = requestsQuery.data ?? [];
  const requestsCount = chatRequests.length;

  const allMembersQuery = useQuery({
    queryKey: ['all-members-for-search'],
    queryFn: async () => {
      try {
        console.log('[Chat] Fetching all members for search...');
        const raw = await api.get<unknown>('/members');
        const members = extractArray<FlockUser>(raw);
        console.log('[Chat] Parsed members count:', members.length);
        return members;
      } catch (e) {
        console.log('[Chat] Failed to fetch members:', e);
        return [] as FlockUser[];
      }
    },
  });

  const convosQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => extractArray<Conversation>(await api.get<unknown>('/chat')),
  });

  const followersQuery = useQuery({
    queryKey: ['followers-suggestions'],
    queryFn: async () => {
      try {
        const raw = await api.get<unknown>('/social/flock/suggestions');
        return extractArray<FlockUser>(raw);
      } catch {
        return [] as FlockUser[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    void queryClient.invalidateQueries({ queryKey: ['followers-suggestions'] });
    void queryClient.invalidateQueries({ queryKey: ['chat-requests'] });
  }, [queryClient]);

  const conversations = convosQuery.data ?? [];
  const followers = followersQuery.data ?? [];

  const filteredConvos = searchQuery.trim()
    ? conversations.filter((c) => {
        const name = c.name || c.participants.map((p) => p.name).join(', ');
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  const allMembers = allMembersQuery.data ?? [];
  const searchedMembers = searchQuery.trim().length > 0
    ? allMembers.filter((m) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          m.full_name?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.church_name?.toLowerCase().includes(q)
        );
      })
    : [];

  const userName = user?.full_name ?? 'You';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderHeader = () => (
    <View>
      <View style={styles.noteSection}>
        <View style={styles.noteAvatarWrap}>
          <View style={styles.noteBubble}>
            <Text style={styles.noteBubbleText}>Note...</Text>
          </View>
          <View style={styles.noteAvatar}>
            <Text style={styles.noteAvatarText}>{userInitials}</Text>
          </View>
          <Text style={styles.noteLabel}>Your note</Text>
        </View>
      </View>

      <View style={styles.messagesHeader}>
        <Text style={styles.messagesTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowRequests(!showRequests);
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.requestsLink}>
            Requests{requestsCount > 0 ? ` (${requestsCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (convosQuery.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Chats will appear here after you've sent or received a message.{' '}
          <Text
            style={styles.getStartedLink}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/new-message' as never);
            }}
          >
            Get started
          </Text>
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (followers.length === 0) return null;

    return (
      <View style={styles.followersSection}>
        <View style={styles.followersSectionHeader}>
          <Text style={styles.followersSectionTitle}>Accounts that follow you</Text>
          <TouchableOpacity activeOpacity={0.6}>
            <Text style={styles.seeAllLink}>See all</Text>
          </TouchableOpacity>
        </View>
        {followers.slice(0, 5).map((f) => (
          <FollowerSuggestionRow key={f.id} user={f} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitle: () => (
            <Text style={styles.headerTitle}>{userName}</Text>
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
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerBtn} activeOpacity={0.6}>
                <Video size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/new-message' as never);
                }}
                activeOpacity={0.6}
                testID="new-message-btn"
              >
                <SquarePen size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={theme.colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            testID="chat-search"
          />
        </View>
      </View>

      <FlatList
        data={filteredConvos}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={() => (
          <View>
            {searchQuery.trim().length > 0 && searchedMembers.length > 0 && (
              <View style={styles.searchMembersSection}>
                <Text style={styles.searchMembersSectionTitle}>People</Text>
                {searchedMembers.slice(0, 5).map((member) => {
                  const initials = member.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.searchMemberRow}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/chat-room?userId=${member.id}&userName=${encodeURIComponent(member.full_name)}&isNew=true` as never);
                      }}
                      activeOpacity={0.6}
                    >
                      <View style={styles.searchMemberAvatar}>
                        <Text style={styles.searchMemberAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.searchMemberInfo}>
                        <Text style={styles.searchMemberName} numberOfLines={1}>{member.full_name}</Text>
                        <Text style={styles.searchMemberSub} numberOfLines={1}>
                          {member.username ?? member.church_name ?? 'Member'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {searchQuery.trim().length > 0 && filteredConvos.length > 0 && (
              <View style={styles.searchConvosSectionHeader}>
                <Text style={styles.searchMembersSectionTitle}>Conversations</Text>
              </View>
            )}
            {!searchQuery.trim() && renderHeader()}
          </View>
        )}
        ListEmptyComponent={() => {
          if (searchQuery.trim().length > 0 && searchedMembers.length > 0) return null;
          if (searchQuery.trim().length > 0 && allMembersQuery.isLoading) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
              </View>
            );
          }
          if (searchQuery.trim().length > 0 && searchedMembers.length === 0 && !allMembersQuery.isLoading) {
            return (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
              </View>
            );
          }
          return renderEmpty();
        }}
        ListFooterComponent={searchQuery.trim().length > 0 ? null : renderFooter}
        renderItem={({ item }) => (
          <ConversationRow
            convo={item}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/chat-room?id=${item.id}` as never);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={convosQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  headerBtn: {
    padding: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  noteSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  noteAvatarWrap: {
    alignItems: 'center',
    width: 68,
  },
  noteBubble: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteBubbleText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  noteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  noteAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  noteLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  requestsLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0095F6',
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  convoAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoAvatarUnread: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  convoAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  convoContent: {
    flex: 1,
    gap: 3,
  },
  convoName: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: theme.colors.text,
  },
  convoNameBold: {
    fontWeight: '700' as const,
  },
  convoLastMsg: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  convoLastMsgBold: {
    color: theme.colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0095F6',
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 20,
  },
  getStartedLink: {
    color: '#0095F6',
    fontWeight: '600' as const,
  },
  followersSection: {
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 16,
  },
  followersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  followersSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0095F6',
  },
  followerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  followerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  followerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followerAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  followerText: {
    flex: 1,
  },
  followerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  followerUsername: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  searchMembersSection: {
    paddingTop: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: 8,
  },
  searchMembersSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  searchMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  searchMemberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchMemberAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  searchMemberInfo: {
    flex: 1,
    gap: 2,
  },
  searchMemberName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  searchMemberSub: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  searchConvosSectionHeader: {
    paddingTop: 12,
    paddingBottom: 4,
  },
});

