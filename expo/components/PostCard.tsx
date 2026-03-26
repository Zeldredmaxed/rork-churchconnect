import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Pin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { useSaved } from '@/contexts/SavedContext';
import Badge from './Badge';
import MentionText from './MentionText';
import type { FeedPost } from '@/types';

interface PostCardProps {
  post: FeedPost;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onShare?: (id: string) => void;
  onMore?: (id: string) => void;
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}

export default function PostCard({ post, onLike, onComment, onShare, onMore }: PostCardProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bookmarkScaleAnim = useRef(new Animated.Value(1)).current;
  const savedBannerAnim = useRef(new Animated.Value(0)).current;
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const { isItemSaved, toggleSave } = useSaved();
  const isSaved = isItemSaved(post.id, 'post');

  const handleSave = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(bookmarkScaleAnim, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(bookmarkScaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    const wasSaved = toggleSave({
      itemId: post.id,
      itemType: 'post',
      title: post.content.slice(0, 80),
      preview: post.content.slice(0, 150),
      authorName: post.author_name,
      authorId: post.author_id,
    });
    if (wasSaved) {
      setShowSavedBanner(true);
      Animated.timing(savedBannerAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      setTimeout(() => {
        Animated.timing(savedBannerAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
          setShowSavedBanner(false);
        });
      }, 2500);
    }
  };

  const handleLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onLike(post.id);
  };

  const initials = post.author_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.7}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/user-profile?id=${post.author_id}` as never);
          }}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.authorName}>{post.author_name}</Text>
              {post.visibility === 'leaders' && <Badge label="Leaders" variant="accent" small />}
            </View>
            <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onMore?.(post.id);
          }}
        >
          <MoreHorizontal size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {post.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Pin size={11} color={theme.colors.accent} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}

      <MentionText style={styles.content}>{post.content}</MentionText>

      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Heart
                size={24}
                color={post.is_liked ? theme.colors.error : theme.colors.text}
                fill={post.is_liked ? theme.colors.error : 'transparent'}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onComment(post.id)}
            activeOpacity={0.7}
          >
            <MessageCircle size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare?.(post.id);
            }}
          >
            <Send size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSave}>
          <Animated.View style={{ transform: [{ scale: bookmarkScaleAnim }] }}>
            <Bookmark
              size={24}
              color={isSaved ? theme.colors.text : theme.colors.text}
              fill={isSaved ? theme.colors.text : 'transparent'}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {showSavedBanner && (
        <Animated.View style={[styles.savedBanner, { opacity: savedBannerAnim, transform: [{ translateY: savedBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <View style={styles.savedBannerLeft}>
            <Bookmark size={14} color={theme.colors.text} fill={theme.colors.text} />
            <Text style={styles.savedBannerText}>Saved</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.savedBannerAction}>Save to collection</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {post.like_count > 0 && (
        <Text style={styles.likeCount}>
          {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
        </Text>
      )}

      {post.comment_count > 0 && (
        <TouchableOpacity onPress={() => onComment(post.id)}>
          <Text style={styles.viewComments}>
            View all {post.comment_count} comments
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  moreBtn: {
    padding: 4,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  pinnedText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '600' as const,
  },
  content: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 21,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 2,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  viewComments: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    paddingHorizontal: 14,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginBottom: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
  },
  savedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  savedBannerAction: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
});
