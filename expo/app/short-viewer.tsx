import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  MoreVertical,
  Bookmark,
  ArrowLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ShortVideoPlayer from '@/components/ShortVideoPlayer';
import CommentsSheet from '@/components/CommentsSheet';
import PostOptionsSheet, { DeleteConfirmSheet } from '@/components/PostOptionsSheet';
import ReportSheet from '@/components/ReportSheet';
import ShareSheet from '@/components/ShareSheet';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import { api } from '@/utils/api';
import type { Short } from '@/types';



export default function ShortViewerScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isItemSaved, toggleSave } = useSaved();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const shortQuery = useQuery({
    queryKey: ['short-detail', id],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: Short }>(`/shorts/${id}`);
        console.log('[ShortViewer] Short loaded:', JSON.stringify(data).slice(0, 200));
        if (data?.data) return data.data;
      } catch (e) {
        console.log('[ShortViewer] Direct fetch failed, trying fallbacks:', e);
      }
      try {
        const all = await api.get<{ data: Short[] }>('/shorts/trending?limit=100');
        const found = all?.data?.find((s) => String(s.id) === String(id));
        if (found) {
          console.log('[ShortViewer] Found in trending');
          return found;
        }
      } catch (e2) {
        console.log('[ShortViewer] Trending fallback failed:', e2);
      }
      try {
        const myShorts = await api.get<{ data: Short[] }>('/shorts/me?limit=100&offset=0');
        const found = myShorts?.data?.find((s) => String(s.id) === String(id));
        if (found) {
          console.log('[ShortViewer] Found in my shorts');
          return found;
        }
      } catch (e3) {
        console.log('[ShortViewer] My shorts fallback failed:', e3);
      }
      console.log('[ShortViewer] Short not found in any source for id:', id);
      return null;
    },
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: (params: { id: string; liked: boolean }) =>
      params.liked
        ? api.delete(`/shorts/${params.id}/unlike`)
        : api.post(`/shorts/${params.id}/like`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['short-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const deleteShortMutation = useMutation({
    mutationFn: (shortId: string) => api.delete(`/shorts/${shortId}`),
    onSuccess: () => {
      console.log('[ShortViewer] Short deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
      void queryClient.invalidateQueries({ queryKey: ['my-shorts'] });
      setShowDeleteConfirm(false);
      setShowOptions(false);
      Alert.alert('Deleted', 'Short has been deleted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      console.log('[ShortViewer] Delete error:', error.message);
      Alert.alert('Error', 'Failed to delete short.');
    },
  });

  const short = shortQuery.data;
  const isOwner = short?.author_id === user?.id;
  const saved = short ? isItemSaved(short.id, 'short') : false;

  const handleLike = useCallback(() => {
    if (!short) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    likeMutation.mutate({ id: short.id, liked: !!short.is_liked });
  }, [short, likeMutation, scaleAnim]);

  const handleSave = useCallback(() => {
    if (!short) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSave({
      itemId: short.id,
      itemType: 'short',
      title: short.title,
      preview: short.description ?? short.title,
      authorName: short.author_name ?? short.church_name,
      authorId: short.author_id ?? '',
      thumbnailUrl: short.thumbnail_url,
      mediaUrl: short.video_url,
    });
  }, [short, toggleSave]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {shortQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
        </View>
      ) : !short ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Short not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ShortVideoPlayer
            videoUrl={short.video_url}
            thumbnailUrl={short.thumbnail_url}
            isVisible={true}
          />

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.topBarBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.overlayBottom} pointerEvents="box-none">
              <View style={styles.overlayInfo}>
                <Text style={styles.shortTitle} numberOfLines={2}>{short.title}</Text>
                <TouchableOpacity
                  style={styles.authorRow}
                  onPress={() => {
                    if (short.author_id) {
                      router.push(`/user-profile?id=${short.author_id}` as never);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorAvatarText}>
                      {(short.author_name ?? 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.authorName}>{short.author_name ?? short.church_name}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.overlayActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Heart
                      size={26}
                      color="#fff"
                      fill={short.is_liked ? theme.colors.error : 'transparent'}
                    />
                  </Animated.View>
                  <Text style={styles.actionCount}>{short.like_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
                  <MessageCircle size={26} color="#fff" />
                  <Text style={styles.actionCount}>{short.comment_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShare(true)}>
                  <Share2 size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
                  <Bookmark size={24} color="#fff" fill={saved ? '#fff' : 'transparent'} />
                </TouchableOpacity>
                <View style={styles.actionBtn}>
                  <Eye size={20} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.viewCount}>{short.view_count}</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowOptions(true)}>
                  <MoreVertical size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      <CommentsSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={id ?? null}
        source="shorts"
      />

      <PostOptionsSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        isOwner={isOwner}
        onDelete={() => {
          setShowOptions(false);
          setTimeout(() => setShowDeleteConfirm(true), 300);
        }}
        onReport={() => {
          setShowOptions(false);
          setTimeout(() => setShowReport(true), 300);
        }}
        onSave={handleSave}
        isSaved={saved}
        itemType="short"
      />

      <DeleteConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (id) deleteShortMutation.mutate(id);
        }}
        isDeleting={deleteShortMutation.isPending}
        itemType="short"
      />

      <ReportSheet
        visible={showReport}
        onClose={() => setShowReport(false)}
        contentId={id ?? null}
        contentType="short"
        authorName={short?.author_name}
        authorId={short?.author_id}
      />

      <ShareSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        content={short ? {
          id: short.id,
          type: 'short',
          title: short.title,
          authorName: short.author_name,
        } : null}
      />
    </View>
  );
}

const createStyles = (_theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  topBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  overlayBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  overlayInfo: {
    flex: 1,
    marginRight: 12,
  },
  shortTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  authorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 8,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  authorAvatarText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
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
    color: '#fff',
  },
  viewCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
});
