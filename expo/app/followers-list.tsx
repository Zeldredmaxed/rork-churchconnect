import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import FollowButton from '@/components/FollowButton';
import EmptyState from '@/components/EmptyState';
import { Users } from 'lucide-react-native';
import type { FlockUser } from '@/types';

type TabType = 'followers' | 'following';

function UserRow({ user }: { user: FlockUser }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.is_following ?? false);

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.userRow}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/user-profile?id=${user.id}` as never);
        }}
        activeOpacity={0.6}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.userName} numberOfLines={1}>{user.full_name}</Text>
          {user.church_name ? (
            <Text style={styles.userChurch} numberOfLines={1}>{user.church_name}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <FollowButton
        userId={user.id}
        isFollowing={isFollowing}
        size="small"
        onToggle={(newState) => setIsFollowing(newState)}
      />
    </View>
  );
}

export default function FollowersListScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id, tab } = useLocalSearchParams<{ id: string; tab: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) ?? 'followers');

  const followersQuery = useQuery({
    queryKey: ['flock', 'followers', id],
    queryFn: async () => {
      console.log('[FollowersList] Fetching followers for:', id);
      try {
        const data = await api.get<{ data: FlockUser[] }>(`/social/flock/${id}/followers`);
        return data;
      } catch {
        return { data: [] as FlockUser[] };
      }
    },
    enabled: !!id,
  });

  const followingQuery = useQuery({
    queryKey: ['flock', 'following', id],
    queryFn: async () => {
      console.log('[FollowersList] Fetching following for:', id);
      try {
        const data = await api.get<{ data: FlockUser[] }>(`/social/shepherding/${id}/following`);
        return data;
      } catch {
        return { data: [] as FlockUser[] };
      }
    },
    enabled: !!id,
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['flock'] });
  }, [queryClient]);

  const activeData = activeTab === 'followers'
    ? (followersQuery.data?.data ?? [])
    : (followingQuery.data?.data ?? []);
  const isLoading = activeTab === 'followers' ? followersQuery.isLoading : followingQuery.isLoading;
  const isRefreshing = activeTab === 'followers' ? followersQuery.isRefetching : followingQuery.isRefetching;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '', headerShadowVisible: false }} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow user={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Users size={28} color={theme.colors.textTertiary} />}
              title={activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              description={activeTab === 'followers' ? 'Followers will appear here' : 'Following will appear here'}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.text,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
  },
  tabTextActive: {
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  textWrap: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  userChurch: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  separator: {
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 72,
  },
});
