import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid3x3, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi } from '@/utils/settings-api';
import FollowButton from '@/components/FollowButton';
import EmptyState from '@/components/EmptyState';
import type { FeedPost } from '@/types';

interface UserProfileData {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  church_name?: string;
  bio?: string;
  role?: string;
  is_following?: boolean;
  followers_count: number;
  following_count: number;
  post_count: number;
  created_at?: string;
}

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);

  const blockMutation = useMutation({
    mutationFn: () => settingsApi.blockUser(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-blocked'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Blocked', `${profile?.full_name ?? 'User'} has been blocked.`);
    },
    onError: (err) => {
      console.log('[UserProfile] Block error:', err);
      Alert.alert('Error', 'Failed to block user.');
    },
  });

  const muteMutation = useMutation({
    mutationFn: () => settingsApi.muteUser(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-muted'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Muted', `${profile?.full_name ?? 'User'} has been muted.`);
    },
    onError: (err) => {
      console.log('[UserProfile] Mute error:', err);
      Alert.alert('Error', 'Failed to mute user.');
    },
  });

  const restrictMutation = useMutation({
    mutationFn: () => settingsApi.restrictUser(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-restricted'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Restricted', `${profile?.full_name ?? 'User'} has been restricted.`);
    },
    onError: (err) => {
      console.log('[UserProfile] Restrict error:', err);
      Alert.alert('Error', 'Failed to restrict user.');
    },
  });

  const closeFriendMutation = useMutation({
    mutationFn: () => settingsApi.addCloseFriend(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-close-friends'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added', `${profile?.full_name ?? 'User'} added to close friends.`);
    },
    onError: (err) => {
      console.log('[UserProfile] Close friend error:', err);
      Alert.alert('Error', 'Failed to add close friend.');
    },
  });

  const favouriteMutation = useMutation({
    mutationFn: () => settingsApi.addFavourite(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-favourites'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added', `${profile?.full_name ?? 'User'} added to favourites.`);
    },
    onError: (err) => {
      console.log('[UserProfile] Favourite error:', err);
      Alert.alert('Error', 'Failed to add favourite.');
    },
  });

  const handleProfileActions = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const name = profile?.full_name ?? 'this user';
    Alert.alert(
      name,
      'Choose an action',
      [
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Block', `Are you sure you want to block ${name}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate() },
            ]);
          },
        },
        { text: 'Mute', onPress: () => muteMutation.mutate() },
        { text: 'Restrict', onPress: () => restrictMutation.mutate() },
        { text: 'Add to Close Friends', onPress: () => closeFriendMutation.mutate() },
        { text: 'Add to Favourites', onPress: () => favouriteMutation.mutate() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const profileQuery = useQuery({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      console.log('[UserProfile] Fetching profile for:', id);
      try {
        const res = await api.get<{ data: UserProfileData }>(`/social/user/${id}`);
        return res.data;
      } catch {
        const fallback: UserProfileData = {
          id: id ?? '',
          full_name: 'Church Member',
          followers_count: 0,
          following_count: 0,
          post_count: 0,
          is_following: false,
        };
        return fallback;
      }
    },
    enabled: !!id,
  });

  const postsQuery = useQuery({
    queryKey: ['user-posts', id],
    queryFn: async () => {
      console.log('[UserProfile] Fetching posts for:', id);
      try {
        const data = await api.get<{ data: FeedPost[] }>(`/feed?author_id=${id}`);
        return data;
      } catch {
        return { data: [] as FeedPost[] };
      }
    },
    enabled: !!id,
  });

  const profile = profileQuery.data;
  const posts = postsQuery.data?.data ?? [];

  React.useEffect(() => {
    if (profile?.is_following !== undefined) {
      setIsFollowing(profile.is_following);
    }
  }, [profile?.is_following]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['user-profile', id] });
    void queryClient.invalidateQueries({ queryKey: ['user-posts', id] });
  }, [queryClient, id]);

  const isOwnProfile = currentUser?.id === id;

  const initials = (profile?.full_name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (profileQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '', headerShadowVisible: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: profile?.full_name ?? 'Profile',
          headerShadowVisible: false,
          headerRight: !isOwnProfile ? () => (
            <TouchableOpacity onPress={handleProfileActions} style={{ padding: 4 }}>
              <MoreHorizontal size={22} color={theme.colors.text} />
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            {profile?.avatar_url ? (
               <Image
                 source={{ uri: profile.avatar_url }}
                 style={{ width: '100%', height: '100%', borderRadius: 43 }}
                 contentFit="cover"
                 transition={200}
               />
            ) : (
               <Text style={styles.avatarLargeText}>{initials}</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} activeOpacity={0.6}>
              <Text style={styles.statNumber}>{profile?.post_count ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/followers-list?id=${id}&tab=followers` as never);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.statNumber}>{profile?.followers_count ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/followers-list?id=${id}&tab=following` as never);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.statNumber}>{profile?.following_count ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameSection}>
          <Text style={styles.profileName}>{profile?.full_name ?? ''}</Text>
          {profile?.church_name ? (
            <Text style={styles.churchName}>{profile.church_name}</Text>
          ) : null}
          {profile?.bio ? (
            <Text style={styles.bioText}>{profile.bio}</Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.followButtonWrap}>
                <FollowButton
                  userId={id ?? ''}
                  isFollowing={isFollowing}
                  size="large"
                  onToggle={(newState) => setIsFollowing(newState)}
                />
              </View>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/chat-room?userId=${id}&userName=${encodeURIComponent(profile?.full_name ?? '')}&isNew=true` as never);
                }}
                activeOpacity={0.7}
              >
                <MessageCircle size={18} color={theme.colors.text} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.contentDivider}>
          <View style={styles.tabIndicator}>
            <Grid3x3 size={20} color={theme.colors.text} />
          </View>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <EmptyState
              icon={<Grid3x3 size={28} color={theme.colors.textTertiary} />}
              title="No posts yet"
              description={isOwnProfile ? "Share your first post" : "This user hasn't posted yet"}
            />
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {posts.map((post) => {
              const hasMedia = post.media_urls && post.media_urls.length > 0;
              const hasOldImage = !!post.image_url;
              const displayUrl = hasMedia ? post.media_urls![0] : (hasOldImage ? post.image_url : null);
              
              return (
                <View key={post.id} style={styles.postTile}>
                  {displayUrl ? (
                    <Image
                      source={{ uri: displayUrl }}
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={[styles.postTileOverlay, displayUrl ? styles.postTileOverlayHasMedia : null]}>
                    <Text style={[styles.postTileText, displayUrl ? styles.postTileTextLight : null]} numberOfLines={3}>
                      {post.content}
                    </Text>
                    <View style={styles.postTileMeta}>
                      <Text style={[styles.postTileCount, displayUrl ? styles.postTileCountLight : null]}>
                        {post.like_count || 0} likes
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 24,
  },
  avatarLarge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  avatarLargeText: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  nameSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  churchName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 4,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  followButtonWrap: {
    flex: 1,
  },
  editButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  messageButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  contentDivider: {
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  tabIndicator: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.text,
  },
  emptyPosts: {
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    padding: 1,
  },
  postTile: {
    width: '33%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  postTileOverlay: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  postTileOverlayHasMedia: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  postTileText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  postTileTextLight: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  postTileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postTileCount: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  postTileCountLight: {
    color: '#eeeeee',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

