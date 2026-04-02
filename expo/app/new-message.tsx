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

  const allMembersQuery = useQuery({
    queryKey: ['all-members-for-search'],
    queryFn: async () => {
      try {
        console.log('[NewMessage] Fetching all members...');
        const raw = await api.get<unknown>('/members');
        console.log('[NewMessage] Raw members response type:', typeof raw, Array.isArray(raw));
        let members: FlockUser[] = [];
        if (Array.isArray(raw)) {
          members = raw;
        } else if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          if (Array.isArray(obj.data)) {
            members = obj.data;
          } else if (Array.isArray(obj.results)) {
            members = obj.results as FlockUser[];
          } else if (Array.isArray(obj.members)) {
            members = obj.members as FlockUser[];
          }
        }
        console.log('[NewMessage] Parsed members count:', members.length);
        return members;
      } catch (e) {
        console.log('[NewMessage] Failed to fetch members:', e);
        return [] as FlockUser[];
      }
    },
  });

  const allMembers = allMembersQuery.data ?? [];

  const filteredMembers = searchQuery.trim().length > 0
    ? allMembers.filter((m) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          m.full_name?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.church_name?.toLowerCase().includes(q)
        );
      })
    : allMembers;

  const handleSelectUser = useCallback((user: SearchResultUser | FlockUser) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[NewMessage] Selected user:', user.id, user.full_name);
    router.push(`/chat-room?userId=${user.id}&userName=${encodeURIComponent(user.full_name)}&isNew=true` as never);
  }, [router]);

  const isSearching = searchQuery.trim().length > 0;
  const displayUsers = filteredMembers;
  const isLoading = allMembersQuery.isLoading;

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

