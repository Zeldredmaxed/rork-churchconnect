import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Heart, MessageCircle, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import PostCard from '@/components/PostCard';
import EmptyState from '@/components/EmptyState';
import ScriptureCard from '@/components/ScriptureCard';
import CommentsSheet from '@/components/CommentsSheet';
import PostOptionsSheet, { DeleteConfirmSheet } from '@/components/PostOptionsSheet';
import ReportSheet from '@/components/ReportSheet';
import { useSaved } from '@/contexts/SavedContext';
import ShareSheet from '@/components/ShareSheet';
import type { FeedPost, ActiveScripture } from '@/types';

type FeedFilter = 'all' | 'following' | 'favourites';

function FeedDropdown({
  visible,
  onClose,
  selected,
  onSelect,
  anchor,
}: {
  visible: boolean;
  onClose: () => void;
  selected: FeedFilter;
  onSelect: (filter: FeedFilter) => void;
  anchor: { x: number; y: number };
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dropdownOverlay} onPress={onClose}>
        <View style={[styles.dropdownMenu, { top: anchor.y, left: anchor.x }]}>
          <TouchableOpacity
            style={[styles.dropdownItem, selected === 'following' && styles.dropdownItemActive]}
            onPress={() => {
              onSelect('following');
              onClose();
            }}
          >
            <Text style={[styles.dropdownItemText, selected === 'following' && styles.dropdownItemTextActive]}>Following</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dropdownItem, selected === 'favourites' && styles.dropdownItemActive]}
            onPress={() => {
              onSelect('favourites');
              onClose();
            }}
          >
            <Text style={[styles.dropdownItemText, selected === 'favourites' && styles.dropdownItemTextActive]}>Favourites</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function HomeFeedScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [optionsPostId, setOptionsPostId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [dropdownAnchor] = useState({ x: 16, y: 80 });
  const { isItemSaved, toggleSave } = useSaved();

  const scriptureQuery = useQuery({
    queryKey: ['scriptures', 'active'],
    queryFn: () => api.get<{ data: ActiveScripture | null }>('/scriptures/active'),
    refetchInterval: 60000,
  });

  const feedQuery = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get<{ data: FeedPost[] }>('/feed'),
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => api.post(`/feed/${postId}/like`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => api.delete(`/feed/${postId}`),
    onSuccess: () => {
      console.log('[Feed] Post deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      setShowDeleteConfirm(false);
      setShowOptions(false);
      setOptionsPostId(null);
    },
    onError: (error) => {
      console.log('[Feed] Delete error:', error.message);
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    },
  });

  const handleOpenOptions = useCallback((postId: string) => {
    setOptionsPostId(postId);
    setShowOptions(true);
  }, []);

  const handleDeleteRequest = useCallback(() => {
    setShowOptions(false);
    setTimeout(() => setShowDeleteConfirm(true), 300);
  }, []);

  const handleReportRequest = useCallback(() => {
    setShowOptions(false);
    setTimeout(() => setShowReport(true), 300);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (optionsPostId) {
      deleteMutation.mutate(optionsPostId);
    }
  }, [optionsPostId, deleteMutation]);

  const handleSharePost = useCallback((postId: string) => {
    setSharePostId(postId);
    setShowShare(true);
  }, []);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['scriptures', 'active'] });
  }, [queryClient]);


  const posts = feedQuery.data?.data ?? [];
  const selectedPost = optionsPostId ? posts.find((p) => p.id === optionsPostId) : null;
  const isPostOwner = selectedPost?.author_id === user?.id;
  const pinnedPosts = posts.filter((p) => p.is_pinned);
  const regularPosts = posts.filter((p) => !p.is_pinned);
  const sortedPosts = [...pinnedPosts, ...regularPosts];
  const activeScripture = scriptureQuery.data?.data;

  const userInitials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.igHeader, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDropdown(true);
          }}
          activeOpacity={0.7}
          testID="header-logo-dropdown"
        >
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fv408whgqhsmotq5f9m63' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications');
            }}
            testID="header-notifications"
          >
            <Heart size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/chat');
            }}
            testID="header-messages"
          >
            <MessageCircle size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FeedDropdown
        visible={showDropdown}
        onClose={() => setShowDropdown(false)}
        selected={feedFilter}
        onSelect={setFeedFilter}
        anchor={dropdownAnchor}
      />

      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {activeScripture ? (
              <View style={styles.scriptureWrap}>
                <ScriptureCard scripture={activeScripture} />
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.composeRow}
              onPress={() => router.push('/create-post')}
              activeOpacity={0.7}
            >
              <View style={styles.composeAvatar}>
                <Text style={styles.composeAvatarText}>{userInitials}</Text>
              </View>
              <Text style={styles.composePlaceholder}>Share something with your church...</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={(id) => likeMutation.mutate(id)}
            onComment={(id) => {
              setCommentsPostId(id);
              setShowComments(true);
            }}
            onShare={handleSharePost}
            onMore={handleOpenOptions}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          feedQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={<Plus size={28} color={theme.colors.textTertiary} />}
              title="No posts yet"
              description="Be the first to share something with your congregation"
            />
          )
        }
      />

      <CommentsSheet
        visible={showComments}
        onClose={() => {
          setShowComments(false);
          setCommentsPostId(null);
        }}
        postId={commentsPostId}
        source="feed"
      />

      <PostOptionsSheet
        visible={showOptions}
        onClose={() => {
          setShowOptions(false);
          setOptionsPostId(null);
        }}
        isOwner={isPostOwner}
        onDelete={handleDeleteRequest}
        onReport={handleReportRequest}
        onSave={() => {
          if (selectedPost) {
            toggleSave({
              itemId: selectedPost.id,
              itemType: 'post',
              title: selectedPost.content.slice(0, 80),
              preview: selectedPost.content.slice(0, 150),
              authorName: selectedPost.author_name,
              authorId: selectedPost.author_id,
            });
          }
        }}
        isSaved={selectedPost ? isItemSaved(selectedPost.id, 'post') : false}
        itemType="post"
      />

      <ReportSheet
        visible={showReport}
        onClose={() => {
          setShowReport(false);
          setOptionsPostId(null);
        }}
        contentId={optionsPostId}
        contentType="post"
        authorName={selectedPost?.author_name}
        authorId={selectedPost?.author_id}
      />

      <DeleteConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setOptionsPostId(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
        itemType="post"
      />

      <ShareSheet
        visible={showShare}
        onClose={() => {
          setShowShare(false);
          setSharePostId(null);
        }}
        content={sharePostId ? {
          id: sharePostId,
          type: 'post',
          title: posts.find((p) => p.id === sharePostId)?.content.slice(0, 80) ?? '',
          authorName: posts.find((p) => p.id === sharePostId)?.author_name,
        } : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  igHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoImage: {
    width: 170,
    height: 42,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  headerIconBtn: {
    padding: 2,
  },
  dropdownOverlay: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  dropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: theme.colors.text,
  },
  dropdownItemTextActive: {
    fontWeight: '600' as const,
  },
  scriptureWrap: {
    marginBottom: 4,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  composeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeAvatarText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  composePlaceholder: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
