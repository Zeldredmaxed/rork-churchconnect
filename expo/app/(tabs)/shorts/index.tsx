import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Share2, Eye, MoreVertical, Bookmark } from 'lucide-react-native';
import ShortVideoPlayer from '@/components/ShortVideoPlayer';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/Avatar';
import CommentsSheet from '@/components/CommentsSheet';
import PostOptionsSheet, { DeleteConfirmSheet } from '@/components/PostOptionsSheet';
import ReportSheet from '@/components/ReportSheet';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import ShareSheet from '@/components/ShareSheet';
import type { Clip } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedTab = 'trending' | 'my-church';

function ShortOverlay({ item, onLike, onComment, onShare, onMore, onSave, isSaved, currentUserId }: { item: Clip; onLike: () => void; onComment: () => void; onShare: () => void; onMore: () => void; onSave: () => void; isSaved: boolean; currentUserId?: string }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isFollowing, setIsFollowing] = React.useState(false);
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: () => api.post(`/social/flock/${item.author_id}`),
    onSuccess: () => {
      setIsFollowing(true);
      void queryClient.invalidateQueries({ queryKey: ['followers'] });
    },
  });

  const isOwnShort = currentUserId === item.author_id;

  const handleLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onLike();
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.overlayBottom} pointerEvents="box-none">
        <View style={styles.overlayInfo}>
          <Text style={styles.shortTitle} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity
            style={styles.authorRow}
            onPress={() => {
              if (item.author_id) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/user-profile?id=${item.author_id}` as never);
              }
            }}
            activeOpacity={0.7}
          >
            <Avatar
              url={(item as any).author_avatar}
              name={item.author_name ?? item.church_name}
              size={28}
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
            />
            <Text style={styles.authorName}>{item.author_name ?? item.church_name}</Text>
            {!isOwnShort && !isFollowing && (
              <TouchableOpacity
                style={styles.overlayFollowBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  followMutation.mutate();
                }}
                disabled={followMutation.isPending}
                activeOpacity={0.7}
              >
                <Text style={styles.overlayFollowText}>Follow</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.overlayActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Heart
                size={26}
                color={theme.colors.white}
                fill={item.is_liked_by_me ? theme.colors.error : 'transparent'}
              />
            </Animated.View>
            <Text style={styles.actionCount}>{item.like_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
            <MessageCircle size={26} color={theme.colors.white} />
            <Text style={styles.actionCount}>{item.comment_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
            <Share2 size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onSave}>
            <Bookmark size={24} color={theme.colors.white} fill={isSaved ? theme.colors.white : 'transparent'} />
          </TouchableOpacity>
          <View style={styles.actionBtn}>
            <Eye size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.viewCount}>{item.view_count}</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={onMore}>
            <MoreVertical size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ShortsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FeedTab>('trending');

  const [commentsShortId, setCommentsShortId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  const [optionsShortId, setOptionsShortId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareShortId, setShareShortId] = useState<string | null>(null);
  const { user } = useAuth();
  const { isItemSaved, toggleSave } = useSaved();

  const shortsQuery = useQuery({
    queryKey: ['clips', activeTab],
    queryFn: async () => {
      const endpoint = activeTab === 'trending' ? '/clips/trending' : '/clips';
      console.log('[Shorts] Fetching clips from:', endpoint);
      const raw = await api.get<Clip[] | { data: Clip[] }>(endpoint);
      console.log('[Shorts] Raw response type:', typeof raw, Array.isArray(raw) ? 'array' : 'object');
      const clips = Array.isArray(raw) ? raw : (raw as { data: Clip[] }).data ?? [];
      console.log('[Shorts] Parsed clips count:', clips.length);
      return { data: clips };
    },
  });

  const likeMutation = useMutation({
    mutationFn: (params: { id: string; liked: boolean }) =>
      params.liked
        ? api.delete(`/clips/${params.id}/like`)
        : api.post(`/clips/${params.id}/like`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });

  const viewMutation = useMutation({
    mutationFn: (id: string) => api.post(`/clips/${id}/view`),
  });

  const deleteShortMutation = useMutation({
    mutationFn: (shortId: string) => api.delete(`/clips/${shortId}`),
    onSuccess: () => {
      console.log('[Shorts] Clip deleted successfully, cascade invalidating...');
      void queryClient.invalidateQueries({ queryKey: ['clips'] });
      void queryClient.invalidateQueries({ queryKey: ['my-clips'] });
      setShowDeleteConfirm(false);
      setShowOptions(false);
      setOptionsShortId(null);
    },
    onError: (error) => {
      console.log('[Shorts] Delete error:', error.message);
      Alert.alert('Error', 'Failed to delete short. Please try again.');
    },
  });





  const [visibleShortId, setVisibleShortId] = useState<string | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      console.log('[Shorts] Screen focused, resuming playback');
      setIsScreenFocused(true);
      return () => {
        console.log('[Shorts] Screen unfocused, pausing all videos');
        setIsScreenFocused(false);
        setVisibleShortId(null);
      };
    }, [])
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Clip }> }) => {
      if (viewableItems.length > 0) {
        const item = viewableItems[0].item;
        setVisibleShortId(String(item.id));
        viewMutation.mutate(String(item.id));
      } else {
        setVisibleShortId(null);
      }
    },
    [viewMutation]
  );

  const shorts = [...(shortsQuery.data?.data ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const itemHeight = SCREEN_HEIGHT;

  const selectedShort = optionsShortId ? shorts.find((s) => String(s.id) === optionsShortId) : null;
  const isShortOwner = selectedShort?.author_id != null && user?.id != null && String(selectedShort.author_id) === String(user.id);

  const handleOpenShortOptions = useCallback((shortId: string) => {
    setOptionsShortId(shortId);
    setShowOptions(true);
  }, []);

  const handleDeleteShortRequest = useCallback(() => {
    setShowOptions(false);
    setTimeout(() => setShowDeleteConfirm(true), 300);
  }, []);

  const handleReportShortRequest = useCallback(() => {
    setShowOptions(false);
    setTimeout(() => setShowReport(true), 300);
  }, []);

  const handleConfirmDeleteShort = useCallback(() => {
    if (optionsShortId) {
      deleteShortMutation.mutate(optionsShortId);
    }
  }, [optionsShortId, deleteShortMutation]);

  const renderItem = useCallback(
    ({ item }: { item: Clip }) => (
      <View style={[styles.shortItem, { height: itemHeight }]}>
        <ShortVideoPlayer
          videoUrl={item.video_url}
          thumbnailUrl={item.thumbnail_url ?? undefined}
          isVisible={isScreenFocused && visibleShortId === String(item.id)}
        />
        <ShortOverlay
          item={item}
          onLike={() => likeMutation.mutate({ id: String(item.id), liked: !!item.is_liked_by_me })}
          onComment={() => {
            setCommentsShortId(String(item.id));
            setShowComments(true);
          }}
          onShare={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShareShortId(String(item.id));
            setShowShare(true);
          }}
          onMore={() => handleOpenShortOptions(String(item.id))}
          onSave={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggleSave({
              itemId: String(item.id),
              itemType: 'clip',
              title: item.title,
              preview: item.description ?? item.title,
              authorName: item.author_name ?? item.church_name ?? '',
              authorId: String(item.author_id ?? ''),
              thumbnailUrl: item.thumbnail_url ?? undefined,
              mediaUrl: item.video_url,
            });
          }}
          isSaved={isItemSaved(String(item.id), 'clip')}
          currentUserId={user?.id}
        />
      </View>
    ),
    [itemHeight, likeMutation, handleOpenShortOptions, user?.id, isItemSaved, toggleSave, setShareShortId, setShowShare, styles, visibleShortId, isScreenFocused]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.tabSwitcher, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'trending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('trending')}
        >
          <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>
            Trending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'my-church' && styles.tabBtnActive]}
          onPress={() => setActiveTab('my-church')}
        >
          <Text style={[styles.tabText, activeTab === 'my-church' && styles.tabTextActive]}>
            My Church
          </Text>
        </TouchableOpacity>
      </View>

      {shortsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.white} />
        </View>
      ) : shorts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Eye size={28} color="rgba(255,255,255,0.3)" />}
            title="No shorts yet"
            description="Check back for new short-form content"
          />
        </View>
      ) : (
        <FlatList
          data={shorts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          getItemLayout={(_data, index) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
          })}
        />
      )}



      <CommentsSheet
        visible={showComments}
        onClose={() => {
          setShowComments(false);
          setCommentsShortId(null);
        }}
        postId={commentsShortId}
        source="clips"
      />



      <PostOptionsSheet
        visible={showOptions}
        onClose={() => {
          setShowOptions(false);
          setOptionsShortId(null);
        }}
        isOwner={isShortOwner}
        onDelete={handleDeleteShortRequest}
        onReport={handleReportShortRequest}
        onSave={() => {
          if (selectedShort) {
            toggleSave({
              itemId: String(selectedShort.id),
              itemType: 'clip',
              title: selectedShort.title,
              preview: selectedShort.description ?? selectedShort.title,
              authorName: selectedShort.author_name ?? selectedShort.church_name ?? '',
              authorId: String(selectedShort.author_id ?? ''),
              thumbnailUrl: selectedShort.thumbnail_url ?? undefined,
              mediaUrl: selectedShort.video_url,
            });
          }
        }}
        isSaved={selectedShort ? isItemSaved(String(selectedShort.id), 'clip') : false}
        itemType="clip"
      />

      <ReportSheet
        visible={showReport}
        onClose={() => {
          setShowReport(false);
          setOptionsShortId(null);
        }}
        contentId={optionsShortId}
        contentType="clip"
        authorName={selectedShort?.author_name}
        authorId={selectedShort?.author_id != null ? String(selectedShort.author_id) : undefined}
      />

      <DeleteConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setOptionsShortId(null);
        }}
        onConfirm={handleConfirmDeleteShort}
        isDeleting={deleteShortMutation.isPending}
        itemType="clip"
      />

      <ShareSheet
        visible={showShare}
        onClose={() => {
          setShowShare(false);
          setShareShortId(null);
        }}
        content={shareShortId ? {
          id: shareShortId,
          type: 'clip',
          title: shorts.find((s) => s.id === shareShortId)?.title ?? '',
          authorName: shorts.find((s) => s.id === shareShortId)?.author_name,
        } : null}
      />


    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  tabSwitcher: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortItem: {
    width: SCREEN_WIDTH,
    position: 'relative' as const,
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContent: {
    alignItems: 'center',
    gap: 8,
  },
  swipeHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  overlayInfo: {
    flex: 1,
    marginRight: 12,
  },
  shortTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shortChurch: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  overlayActions: {
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  viewCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },

  authorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  overlayFollowBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  overlayFollowText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
});

