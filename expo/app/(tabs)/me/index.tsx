import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
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
  Film,
  Trash2,
  Play,
  Flame,
  Trophy,
  Church,
  TrendingUp,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import type { SavedItemData as SavedItemType } from '@/contexts/SavedContext';
import { api } from '@/utils/api';
import Avatar from '@/components/Avatar';
import type { FlockUser, FeedPost, Short, LoginStreak, SundayAttendanceStats } from '@/types';
import type { SavedItemData } from '@/contexts/SavedContext';

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
  return (
    <View style={styles.discoverCard}>
      <TouchableOpacity style={styles.discoverDismiss} onPress={onDismiss}>
        <X size={14} color={theme.colors.textTertiary} />
      </TouchableOpacity>
      <Avatar url={user.avatar_url} name={user.full_name} size={56} style={{ alignSelf: 'center', marginBottom: 8 }} />
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
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'grid' | 'shorts' | 'saved'>('grid');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const { savedItems, toggleSave } = useSaved();

  const streakQuery = useQuery({
    queryKey: ['login-streak'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: LoginStreak }>('/auth/streak');
        return data?.data ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  const attendanceQuery = useQuery({
    queryKey: ['my-sundays', new Date().getFullYear()],
    queryFn: async () => {
      try {
        const year = new Date().getFullYear();
        const data = await api.get<{ data: SundayAttendanceStats }>(`/attendance/my-sundays?year=${year}`);
        return data?.data ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

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
    queryKey: ['my-posts', user?.id],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: FeedPost[] }>('/feed/me?limit=50&offset=0');
        console.log('[Profile] My posts response:', JSON.stringify(data).slice(0, 300));
        return data?.data ?? [];
      } catch (e: unknown) {
        console.log('[Profile] /feed/me failed:', e);
        return [] as FeedPost[];
      }
    },
    enabled: !!user?.id,
    refetchOnMount: 'always' as const,
  });

  const shortsQuery = useQuery({
    queryKey: ['my-shorts', user?.id],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: Short[] }>('/shorts/me?limit=50&offset=0');
        console.log('[Profile] My shorts response:', JSON.stringify(data).slice(0, 300));
        return data?.data ?? [];
      } catch (e: unknown) {
        console.log('[Profile] /shorts/me failed:', e);
        return [] as Short[];
      }
    },
    enabled: !!user?.id,
    refetchOnMount: 'always' as const,
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/feed/${postId}`),
    onSuccess: (_data, postId) => {
      console.log('[Profile] Post deleted successfully, cascade invalidating...');
      void queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      const currentSaved = savedItems.filter(
        (item) => !(item.item_id === postId && item.item_type === 'post')
      );
      if (currentSaved.length !== savedItems.length) {
        console.log('[Profile] Removed deleted post from saved items');
      }
    },
    onError: (error) => {
      console.log('[Profile] Delete post error:', error.message);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    },
  });

  const deleteShortMutation = useMutation({
    mutationFn: (shortId: string) => api.delete(`/shorts/${shortId}`),
    onSuccess: (_data, shortId) => {
      console.log('[Profile] Short deleted successfully, cascade invalidating...');
      void queryClient.invalidateQueries({ queryKey: ['my-shorts'] });
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
      const currentSaved = savedItems.filter(
        (item) => !(item.item_id === shortId && item.item_type === 'short')
      );
      if (currentSaved.length !== savedItems.length) {
        console.log('[Profile] Removed deleted short from saved items');
      }
    },
    onError: (error) => {
      console.log('[Profile] Delete short error:', error.message);
      Alert.alert('Error', 'Failed to delete short. Please try again.');
    },
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/social/flock/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suggested-users-profile'] });
    },
  });

  const handleDeletePost = useCallback((postId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePostMutation.mutate(postId),
        },
      ]
    );
  }, [deletePostMutation]);

  const handleDeleteShort = useCallback((shortId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Short',
      'Are you sure you want to delete this short? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteShortMutation.mutate(shortId),
        },
      ]
    );
  }, [deleteShortMutation]);

  const handleTapSavedItem = useCallback((item: SavedItemType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[Profile] Tapped saved item:', item.item_type, item.item_id);
    if (item.item_type === 'short') {
      router.push(`/short-viewer?id=${item.item_id}` as never);
    } else {
      router.push('/(tabs)/(home)' as never);
    }
  }, [router]);

  const handleUnsaveFavorite = useCallback((item: SavedItemType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove from Favorites',
      `Remove this ${item.item_type} from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            toggleSave({
              itemId: item.item_id,
              itemType: item.item_type,
              title: item.title,
              preview: item.preview,
              authorName: item.author_name,
              authorId: item.author_id,
              mediaUrl: item.media_url,
              thumbnailUrl: item.thumbnail_url,
            });
          },
        },
      ]
    );
  }, [toggleSave]);


  const flockStats = flockQuery.data ?? { followers_count: 0, following_count: 0 };
  const streak = streakQuery.data;
  const attendance = attendanceQuery.data;
  const myPosts = postsQuery.data ?? [];
  const myShorts = shortsQuery.data ?? [];
  const suggestedUsers = (suggestedQuery.data ?? []).filter(
    (u) => !dismissedSuggestions.includes(u.id)
  );

  const totalPostCount = myPosts.length + myShorts.length;

  const handleDismissSuggestion = useCallback((userId: string) => {
    setDismissedSuggestions((prev) => [...prev, userId]);
  }, []);

  const handleMenuPress = useCallback((route: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  }, [router]);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  }, []);

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              console.log('[Profile] Pull to refresh - syncing profile');
              void refreshProfile();
              void queryClient.invalidateQueries({ queryKey: ['my-posts'] });
              void queryClient.invalidateQueries({ queryKey: ['my-shorts'] });
              void queryClient.invalidateQueries({ queryKey: ['my-flock-stats'] });
            }}
            tintColor={theme.colors.accent}
          />
        }
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Avatar url={user?.avatar_url} name={user?.full_name ?? 'User'} size={82} />
            <View style={styles.addStoryBadge}>
              <Plus size={10} color={theme.colors.white} strokeWidth={3} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statValue}>{totalPostCount}</Text>
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

        {(streak || attendance) && (
          <View style={styles.faithStatsSection}>
            {streak && streak.current_streak > 0 && (
              <View style={styles.faithStatCard}>
                <View style={styles.faithStatIconWrap}>
                  <Flame size={18} color="#FF6B35" fill="#FF6B35" />
                </View>
                <Text style={styles.faithStatValue}>{streak.current_streak}</Text>
                <Text style={styles.faithStatLabel}>Day Streak</Text>
                {streak.current_streak >= streak.longest_streak && streak.current_streak > 1 && (
                  <View style={styles.faithBestBadge}>
                    <Trophy size={8} color="#FFB800" />
                    <Text style={styles.faithBestText}>Best</Text>
                  </View>
                )}
              </View>
            )}
            {streak && streak.longest_streak > 0 && streak.current_streak < streak.longest_streak && (
              <View style={styles.faithStatCard}>
                <View style={styles.faithStatIconWrap}>
                  <TrendingUp size={18} color={theme.colors.accent} />
                </View>
                <Text style={styles.faithStatValue}>{streak.longest_streak}</Text>
                <Text style={styles.faithStatLabel}>Best Streak</Text>
              </View>
            )}
            {attendance && (
              <View style={styles.faithStatCard}>
                <View style={styles.faithStatIconWrap}>
                  <Church size={18} color={theme.colors.accent} />
                </View>
                <Text style={styles.faithStatValue}>{attendance.sundays_attended}</Text>
                <Text style={styles.faithStatLabel}>Sundays</Text>
                {attendance.on_track_to_beat_last_year && (
                  <View style={[styles.faithBestBadge, { backgroundColor: 'rgba(52, 211, 153, 0.12)' }]}>
                    <TrendingUp size={8} color={theme.colors.success} />
                    <Text style={[styles.faithBestText, { color: theme.colors.success }]}>On Track</Text>
                  </View>
                )}
              </View>
            )}
            {streak && (
              <View style={styles.faithStatCard}>
                <View style={styles.faithStatIconWrap}>
                  <Flame size={18} color={theme.colors.textTertiary} />
                </View>
                <Text style={styles.faithStatValue}>{streak.total_logins}</Text>
                <Text style={styles.faithStatLabel}>Total Visits</Text>
              </View>
            )}
          </View>
        )}

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
              keyExtractor={(item) => String(item.id)}
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
            style={[styles.tabIndicator, activeTab === 'shorts' && styles.tabIndicatorActive]}
            onPress={() => setActiveTab('shorts')}
          >
            <Film size={22} color={activeTab === 'shorts' ? theme.colors.text : theme.colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabIndicator, activeTab === 'saved' && styles.tabIndicatorActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Bookmark size={22} color={activeTab === 'saved' ? theme.colors.text : theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {activeTab === 'grid' ? (
          postsQuery.isLoading ? (
            <View style={styles.loadingGrid}>
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
          ) : myPosts.length > 0 ? (
            <View style={styles.postsGrid}>
              {myPosts.map((post) => (
                <TouchableOpacity
                  key={String(post.id)}
                  style={styles.postGridItem}
                  activeOpacity={0.8}
                  onLongPress={() => handleDeletePost(String(post.id))}
                >
                  {post.media_urls && post.media_urls.length > 0 ? (
                    <View style={styles.postGridImageContainer}>
                      <Image
                        source={{ uri: post.media_urls[0] }}
                        style={styles.postGridImage}
                        resizeMode="cover"
                      />
                      {post.media_urls.length > 1 && (
                        <View style={styles.multiImageBadge}>
                          <Grid3x3 size={12} color="#fff" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.deleteOverlayBtn}
                        onPress={() => handleDeletePost(String(post.id))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.postGridContent}>
                      <Text style={styles.postGridText} numberOfLines={4}>
                        {post.content}
                      </Text>
                      <View style={styles.postGridMeta}>
                        <Text style={styles.postGridDate}>{formatDate(post.created_at)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteOverlayBtnText}
                        onPress={() => handleDeletePost(String(post.id))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
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
        ) : activeTab === 'shorts' ? (
          shortsQuery.isLoading ? (
            <View style={styles.loadingGrid}>
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
          ) : myShorts.length > 0 ? (
            <View style={styles.postsGrid}>
              {myShorts.map((short) => (
                <TouchableOpacity
                  key={String(short.id)}
                  style={styles.postGridItem}
                  activeOpacity={0.8}
                  onLongPress={() => handleDeleteShort(String(short.id))}
                >
                  <View style={styles.shortGridContent}>
                    {short.thumbnail_url ? (
                      <Image
                        source={{ uri: short.thumbnail_url }}
                        style={styles.postGridImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.shortGridPlaceholder}>
                        <Play size={24} color="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    <View style={styles.shortGridOverlay}>
                      <View style={styles.shortGridPlayIcon}>
                        <Play size={16} color="#fff" fill="#fff" />
                      </View>
                      <Text style={styles.shortGridTitle} numberOfLines={2}>
                        {short.title}
                      </Text>
                      <Text style={styles.shortGridViews}>
                        {short.view_count} views
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteOverlayBtn}
                      onPress={() => handleDeleteShort(String(short.id))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyGrid}>
              <View style={styles.emptyGridIcon}>
                <Film size={40} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.emptyGridTitle}>No shorts yet</Text>
              <Text style={styles.emptyGridSubtitle}>
                Shorts you create will appear here
              </Text>
            </View>
          )
        ) : savedItems.length > 0 ? (
          <View style={styles.postsGrid}>
            {savedItems.map((item: SavedItemData) => (
              <TouchableOpacity
                key={`${item.item_type}-${item.item_id}`}
                style={styles.postGridItem}
                activeOpacity={0.8}
                onPress={() => handleTapSavedItem(item)}
                onLongPress={() => handleUnsaveFavorite(item)}
              >
                {(item.media_url || item.thumbnail_url) ? (
                  <View style={styles.postGridImageContainer}>
                    <Image
                      source={{ uri: item.thumbnail_url ?? item.media_url }}
                      style={styles.postGridImage}
                      resizeMode="cover"
                    />
                    {item.item_type === 'short' && (
                      <View style={styles.shortBadgeOverlay}>
                        <Play size={14} color="#fff" fill="#fff" />
                      </View>
                    )}
                    <View style={styles.savedItemOverlay}>
                      <Text style={styles.savedItemAuthor} numberOfLines={1}>
                        {item.author_name}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.postGridContent, item.item_type === 'short' && styles.shortGridBg]}>
                    {item.item_type === 'short' && (
                      <Play size={18} color="rgba(255,255,255,0.5)" fill="rgba(255,255,255,0.5)" style={{ marginBottom: 4 }} />
                    )}
                    <Text style={[styles.postGridText, item.item_type === 'short' && styles.shortGridText]} numberOfLines={4}>
                      {item.title || item.preview}
                    </Text>
                    <View style={styles.postGridMeta}>
                      <Text style={[styles.postGridDate, item.item_type === 'short' && styles.shortGridDate]}>
                        {item.author_name}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
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
    position: 'relative' as const,
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
  postGridImageContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  postGridImage: {
    width: '100%',
    height: '100%',
  },
  multiImageBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
  },
  postGridContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    position: 'relative' as const,
  },
  postGridText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  postGridMeta: {
    position: 'absolute' as const,
    bottom: 6,
    left: 8,
  },
  postGridDate: {
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
  deleteOverlayBtn: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOverlayBtnText: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  shortGridContent: {
    flex: 1,
    position: 'relative' as const,
    backgroundColor: '#111',
  },
  shortGridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  shortGridOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shortGridPlayIcon: {
    position: 'absolute' as const,
    top: -28,
    left: 6,
  },
  shortGridTitle: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
    lineHeight: 13,
  },
  shortGridViews: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  loadingGrid: {
    paddingVertical: 60,
    alignItems: 'center',
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
  shortBadgeOverlay: {
    position: 'absolute' as const,
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedItemOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  savedItemAuthor: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  shortGridBg: {
    backgroundColor: '#1A1A1A',
  },
  shortGridText: {
    color: 'rgba(255,255,255,0.7)',
  },
  shortGridDate: {
    color: 'rgba(255,255,255,0.4)',
  },
  bioText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  faithStatsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  faithStatCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  faithStatIconWrap: {
    marginBottom: 2,
  },
  faithStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  faithStatLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  faithBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  faithBestText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#FFB800',
  },
});
