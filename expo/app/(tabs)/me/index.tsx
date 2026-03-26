import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Grid3x3,
  Bookmark,
  ChevronDown,
  X,
  Menu,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import { api } from '@/utils/api';
import type { FlockUser, FeedPost } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_SIZE = SCREEN_WIDTH / 3 - 1;

interface SuggestedUser {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  mutual_info?: string;
}

function DiscoverPeopleCard({
  user,
  onFollow,
  onDismiss,
}: {
  user: SuggestedUser;
  onFollow: () => void;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.discoverCard}>
      <TouchableOpacity style={styles.discoverDismiss} onPress={onDismiss}>
        <X size={14} color={theme.colors.textTertiary} />
      </TouchableOpacity>
      <View style={styles.discoverAvatar}>
        <Text style={styles.discoverAvatarText}>{initials}</Text>
      </View>
      <Text style={styles.discoverName} numberOfLines={1}>{user.full_name}</Text>
      {user.mutual_info ? (
        <Text style={styles.discoverMutual} numberOfLines={1}>{user.mutual_info}</Text>
      ) : (
        <Text style={styles.discoverMutual} numberOfLines={1}>Suggested for you</Text>
      )}
      <TouchableOpacity style={styles.discoverFollowBtn} onPress={onFollow} activeOpacity={0.7}>
        <Text style={styles.discoverFollowText}>Follow</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileTabScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'grid' | 'saved'>('grid');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const { savedItems } = useSaved();

  const flockQuery = useQuery({
    queryKey: ['my-flock-stats'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: { followers_count: number; following_count: number } }>('/social/flock/stats');
        return data?.data ?? { followers_count: 0, following_count: 0 };
      } catch {
        return { followers_count: 0, following_count: 0 };
      }
    },
  });

  const suggestedQuery = useQuery({
    queryKey: ['suggested-users-profile'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: FlockUser[] }>('/social/flock/suggestions');
        return data?.data ?? [];
      } catch {
        return [] as FlockUser[];
      }
    },
  });

  const postsQuery = useQuery({
    queryKey: ['my-posts'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: FeedPost[] }>('/feed');
        const userId = user?.id;
        if (userId && Array.isArray(data?.data)) {
          return data.data.filter((p) => p.author_id === userId);
        }
        return [];
      } catch {
        return [] as FeedPost[];
      }
    },
    enabled: !!user?.id,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/social/flock/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suggested-users-profile'] });
    },
  });

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const flockStats = flockQuery.data ?? { followers_count: 0, following_count: 0 };
  const myPosts = postsQuery.data ?? [];
  const suggestedUsers = (suggestedQuery.data ?? []).filter(
    (u) => !dismissedSuggestions.includes(u.id)
  );

  const handleDismissSuggestion = useCallback((userId: string) => {
    setDismissedSuggestions((prev) => [...prev, userId]);
  }, []);

  const handleMenuPress = useCallback((route: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.usernameRow} activeOpacity={0.7}>
          <Text style={styles.username} numberOfLines={1}>
            {user?.full_name ?? 'User'}
          </Text>
          <ChevronDown size={14} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => handleMenuPress('/create-post')}
          >
            <Plus size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => handleMenuPress('/settings')}
          >
            <Menu size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
            <View style={styles.addStoryBadge}>
              <Plus size={10} color={theme.colors.white} strokeWidth={3} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{myPosts.length}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => handleMenuPress('/followers-list?type=followers')}
            >
              <Text style={styles.statValue}>{flockStats.followers_count}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => handleMenuPress('/followers-list?type=following')}
            >
              <Text style={styles.statValue}>{flockStats.following_count}</Text>
              <Text style={styles.statLabel}>following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameSection}>
          <Text style={styles.displayName}>{user?.full_name ?? 'User'}</Text>
          {user?.bio ? (
            <Text style={styles.bioText}>{user.bio}</Text>
          ) : (
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {(user?.role ?? 'member').charAt(0).toUpperCase() + (user?.role ?? 'member').slice(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleMenuPress('/profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Share profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnSmall}
            onPress={() => handleMenuPress('/groups')}
            activeOpacity={0.7}
          >
            <Plus size={16} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {suggestedUsers.length > 0 && (
          <View style={styles.discoverSection}>
            <View style={styles.discoverHeader}>
              <Text style={styles.discoverTitle}>Discover people</Text>
              <TouchableOpacity>
                <Text style={styles.discoverSeeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={suggestedUsers.slice(0, 10)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.discoverList}
              renderItem={({ item }) => (
                <DiscoverPeopleCard
                  user={{
                    id: item.id,
                    full_name: item.full_name,
                    username: item.username,
                    avatar_url: item.avatar_url,
                  }}
                  onFollow={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    followMutation.mutate(item.id);
                  }}
                  onDismiss={() => handleDismissSuggestion(item.id)}
                />
              )}
            />
          </View>
        )}

        <View style={styles.tabIndicatorRow}>
          <TouchableOpacity
            style={[styles.tabIndicator, activeTab === 'grid' && styles.tabIndicatorActive]}
            onPress={() => setActiveTab('grid')}
          >
            <Grid3x3 size={22} color={activeTab === 'grid' ? theme.colors.text : theme.colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabIndicator, activeTab === 'saved' && styles.tabIndicatorActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Bookmark size={22} color={activeTab === 'saved' ? theme.colors.text : theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {activeTab === 'grid' ? (
          myPosts.length > 0 ? (
            <View style={styles.postsGrid}>
              {myPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postGridItem}
                  activeOpacity={0.8}
                >
                  <View style={styles.postGridContent}>
                    <Text style={styles.postGridText} numberOfLines={3}>
                      {post.content}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyGrid}>
              <View style={styles.emptyGridIcon}>
                <Grid3x3 size={40} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.emptyGridTitle}>Share your first post</Text>
              <Text style={styles.emptyGridSubtitle}>
                Posts you share will appear on your profile
              </Text>
            </View>
          )
        ) : savedItems.length > 0 ? (
          <View>
            <TouchableOpacity
              style={styles.savedCollectionCard}
              onPress={() => handleMenuPress('/saved-posts')}
              activeOpacity={0.7}
            >
              <View style={styles.savedCollectionGrid}>
                {savedItems.slice(0, 4).map((item) => (
                  <View key={`${item.item_type}-${item.item_id}`} style={styles.savedCollectionTile}>
                    <Text style={styles.savedCollectionTileText} numberOfLines={2}>
                      {item.title || item.preview}
                    </Text>
                  </View>
                ))}
                {savedItems.length < 4 && Array.from({ length: 4 - Math.min(savedItems.length, 4) }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.savedCollectionTileEmpty} />
                ))}
              </View>
              <Text style={styles.savedCollectionLabel}>All posts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyGrid}>
            <View style={styles.emptyGridIcon}>
              <Bookmark size={40} color={theme.colors.textTertiary} />
            </View>
            <Text style={styles.emptyGridTitle}>No saved items</Text>
            <Text style={styles.emptyGridSubtitle}>
              Save posts to view them here later
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerIconBtn: {
    padding: 2,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 28,
  },
  avatarLarge: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    position: 'relative' as const,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  addStoryBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0095F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  nameSection: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  actionBtnSmall: {
    width: 36,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverSection: {
    marginBottom: 8,
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  discoverTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  discoverSeeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0095F6',
  },
  discoverList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  discoverCard: {
    width: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    position: 'relative' as const,
  },
  discoverDismiss: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    padding: 4,
  },
  discoverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  discoverName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  discoverMutual: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  discoverFollowBtn: {
    backgroundColor: '#0095F6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  discoverFollowText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tabIndicatorRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
  },
  tabIndicator: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabIndicatorActive: {
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.text,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  postGridItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    backgroundColor: theme.colors.surfaceElevated,
  },
  postGridContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
  },
  postGridText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  emptyGrid: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyGridIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyGridTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  emptyGridSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  savedCollectionCard: {
    margin: 16,
  },
  savedCollectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
    gap: 2,
  },
  savedCollectionTile: {
    width: (SCREEN_WIDTH - 32 - 2) / 2,
    height: (SCREEN_WIDTH - 32 - 2) / 2,
    backgroundColor: theme.colors.surfaceElevated,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedCollectionTileText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  savedCollectionTileEmpty: {
    width: (SCREEN_WIDTH - 32 - 2) / 2,
    height: (SCREEN_WIDTH - 32 - 2) / 2,
    backgroundColor: theme.colors.surfaceElevated,
  },
  savedCollectionLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.text,
    marginTop: 8,
  },
  bioText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
});
