import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { FlockUser } from '@/types';

interface SearchResultUser {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  church_name?: string;
  followers_count?: number;
  post_count?: number;
}

function UserRow({ user, onPress }: { user: SearchResultUser; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.6} testID="user-search-row">
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{user.full_name}</Text>
        <Text style={styles.userSub} numberOfLines={1}>
          {user.username ?? user.church_name ?? 'Shepherd member'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NewMessageScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const suggestedQuery = useQuery({
    queryKey: ['message-suggestions'],
    queryFn: async () => {
      try {
        console.log('[NewMessage] Fetching suggestions...');
        const data = await api.get<{ data: FlockUser[] }>('/social/flock/suggestions');
        console.log('[NewMessage] Suggestions result:', data?.data?.length ?? 0);
        if (data?.data && data.data.length > 0) return data;
        console.log('[NewMessage] No suggestions, falling back to members list...');
        const membersData = await api.get<{ data: FlockUser[] }>('/members');
        console.log('[NewMessage] Members fallback result:', membersData?.data?.length ?? 0);
        return membersData;
      } catch (e) {
        console.log('[NewMessage] Suggestions error, trying members fallback:', e);
        try {
          const membersData = await api.get<{ data: FlockUser[] }>('/members');
          console.log('[NewMessage] Members fallback result:', membersData?.data?.length ?? 0);
          return membersData;
        } catch (e2) {
          console.log('[NewMessage] Members fallback also failed:', e2);
          return { data: [] as FlockUser[] };
        }
      }
    },
  });

  const searchUsersQuery = useQuery({
    queryKey: ['search-users-message', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { data: [] as SearchResultUser[] };
      try {
        console.log('[NewMessage] Searching members:', searchQuery.trim());
        const data = await api.get<{ data: SearchResultUser[] }>(`/members?search=${encodeURIComponent(searchQuery.trim())}`);
        console.log('[NewMessage] Search results:', data?.data?.length ?? 0);
        return data;
      } catch (e) {
        console.log('[NewMessage] Search error, trying local filter:', e);
        try {
          const allMembers = await api.get<{ data: SearchResultUser[] }>('/members');
          const q = searchQuery.trim().toLowerCase();
          const filtered = (allMembers?.data ?? []).filter(
            (m) => m.full_name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)
          );
          console.log('[NewMessage] Local filter results:', filtered.length);
          return { data: filtered };
        } catch (e2) {
          console.log('[NewMessage] All search attempts failed:', e2);
          return { data: [] as SearchResultUser[] };
        }
      }
    },
    enabled: searchQuery.trim().length > 0,
  });

  const handleSelectUser = useCallback((user: SearchResultUser | FlockUser) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[NewMessage] Selected user:', user.id, user.full_name);
    router.push(`/chat-room?userId=${user.id}&userName=${encodeURIComponent(user.full_name)}&isNew=true` as never);
  }, [router]);

  const isSearching = searchQuery.trim().length > 0;
  const displayUsers = isSearching
    ? (searchUsersQuery.data?.data ?? [])
    : (suggestedQuery.data?.data ?? []);
  const isLoading = isSearching ? searchUsersQuery.isLoading : suggestedQuery.isLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerTitle: () => null,
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

      <View style={styles.searchWrap}>
        <View style={styles.toRow}>
          <Text style={styles.toLabel}>To:</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            testID="new-message-search"
          />
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>
        {isSearching ? 'Results' : 'Suggested'}
      </Text>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={displayUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onPress={() => handleSelectUser(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {isSearching ? 'No accounts found.' : 'No suggestions available.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBtn: {
    padding: 4,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  userSub: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
});

