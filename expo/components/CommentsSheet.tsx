import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Send, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import MentionText from '@/components/MentionText';
import Avatar from '@/components/Avatar';
import type { Comment, Member } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

type CommentSource = 'feed' | 'shorts' | 'clips';

interface CommentsSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string | null;
  source: CommentSource;
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return d.toLocaleDateString();
}

function CommentRow({ comment }: { comment: Comment }) {
  const { theme } = useTheme();
  const rowStyles = createRowStyles(theme);
  const [liked, setLiked] = useState(comment.is_liked ?? false);
  const [likeCount, setLikeCount] = useState(comment.like_count ?? 0);
  const heartScale = useRef(new Animated.Value(1)).current;



  const handleLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, friction: 3 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.avatarContainer}>
        <Avatar url={(comment as any).author_avatar} name={comment.author_name} size={36} />
      </View>
      <View style={rowStyles.body}>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.authorName}>{comment.author_name}</Text>
          <Text style={rowStyles.timestamp}>{formatTimeAgo(comment.created_at)}</Text>
        </View>
        <MentionText style={rowStyles.content}>{comment.content}</MentionText>
        <TouchableOpacity activeOpacity={0.6}>
          <Text style={rowStyles.replyBtn}>Reply</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={rowStyles.likeBtn} onPress={handleLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Heart
            size={14}
            color={liked ? theme.colors.error : theme.colors.textTertiary}
            fill={liked ? theme.colors.error : 'transparent'}
          />
        </Animated.View>
        {likeCount > 0 && (
          <Text style={[rowStyles.likeCount, liked && rowStyles.likeCountActive]}>{likeCount}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CommentsSheet({ visible, onClose, postId, source }: CommentsSheetProps) {
  const { theme } = useTheme();
  const sheetStyles = createSheetStyles(theme);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const endpoint = source === 'feed'
    ? `/feed/${postId}/comments`
    : `/clips/${postId}/comments`;

  const commentsQuery = useQuery({
    queryKey: ['comments', source, postId],
    queryFn: () => api.get<{ data: Comment[] } | Comment[]>(endpoint),
    enabled: visible && !!postId,
  });

  const postCommentMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(endpoint, { content } as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', source, postId] });
      if (source === 'feed') {
        void queryClient.invalidateQueries({ queryKey: ['feed'] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['clips'] });
      }
      setCommentText('');
    },
  });

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 65,
      }).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
    }
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 9,
          }).start();
        }
      },
    })
  ).current;

  const handleSubmit = useCallback(() => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    postCommentMutation.mutate(trimmed);
    setMentionQuery(null);
    setMentionStartIndex(-1);
  }, [commentText, postCommentMutation]);

  const membersQuery = useQuery({
    queryKey: ['members', 'comment-mention', mentionQuery],
    queryFn: () =>
      api.get<{ data?: Member[] } | Member[]>(
        `/members/search?q=${encodeURIComponent(mentionQuery ?? '')}&per_page=5`
      ),
    enabled: mentionQuery !== null && mentionQuery.length > 0,
    staleTime: 30000,
  });

  const mentionMembers: Member[] = (() => {
    const raw = membersQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if ((raw as { data?: Member[] }).data) return (raw as { data: Member[] }).data;
    return [];
  })();

  const handleCommentTextChange = useCallback((text: string) => {
    setCommentText(text);
    const textBeforeCursor = text.slice(0, cursorPos + (text.length - commentText.length));
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasNewline = textAfterAt.includes('\n');
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValid = charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0;
      if (!hasNewline && isValid && textAfterAt.length <= 30) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        return;
      }
    }
    setMentionQuery(null);
    setMentionStartIndex(-1);
  }, [cursorPos, commentText]);

  const handleSelectMention = useCallback((member: Member) => {
    if (mentionStartIndex < 0) return;
    const before = commentText.slice(0, mentionStartIndex);
    const mentionText = `@${member.first_name ? `${member.first_name} ${member.last_name}` : (member as any).full_name ?? 'Member'} `;
    const currentEnd = mentionStartIndex + 1 + (mentionQuery?.length ?? 0);
    const after = commentText.slice(currentEnd);
    setCommentText(before + mentionText + after);
    setMentionQuery(null);
    setMentionStartIndex(-1);
    inputRef.current?.focus();
  }, [commentText, mentionStartIndex, mentionQuery]);

  const rawData = commentsQuery.data;
  const comments: Comment[] = Array.isArray(rawData) ? rawData : (rawData as { data?: Comment[] })?.data ?? [];



  const QUICK_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDE4C', '\uD83D\uDD25', '\uD83D\uDC4F', '\uD83E\uDD7A', '\uD83D\uDE0D', '\uD83D\uDE33', '\uD83D\uDE02'];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={sheetStyles.backdrop}>
        <TouchableOpacity style={sheetStyles.backdropTouch} activeOpacity={1} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={sheetStyles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <Animated.View
            style={[
              sheetStyles.sheet,
              { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={sheetStyles.handleBar}>
              <View style={sheetStyles.handle} />
            </View>

            <View style={sheetStyles.header}>
              <Text style={sheetStyles.headerTitle}>Comments</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={sheetStyles.divider} />

            {commentsQuery.isLoading ? (
              <View style={sheetStyles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : comments.length === 0 ? (
              <View style={sheetStyles.emptyContainer}>
                <Text style={sheetStyles.emptyTitle}>No comments yet</Text>
                <Text style={sheetStyles.emptySubtitle}>Start the conversation.</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <CommentRow comment={item} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={sheetStyles.listContent}
                keyboardShouldPersistTaps="handled"
              />
            )}

            <View style={sheetStyles.inputSection}>
              <View style={sheetStyles.emojiRow}>
                {QUICK_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => {
                      setCommentText((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    activeOpacity={0.6}
                    style={sheetStyles.emojiBtn}
                  >
                    <Text style={sheetStyles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mentionQuery !== null && mentionQuery.length > 0 && mentionMembers.length > 0 && (
                <View style={sheetStyles.mentionSuggestions}>
                  {membersQuery.isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} style={{ padding: 10 }} />
                  ) : (
                    mentionMembers.map((member) => {
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={sheetStyles.mentionRow}
                          onPress={() => handleSelectMention(member)}
                          activeOpacity={0.6}
                        >
                          <Avatar url={member.photo_url} name={`${member.first_name} ${member.last_name}`} size={30} />
                          <View style={sheetStyles.mentionInfo}>
                            <Text style={sheetStyles.mentionName} numberOfLines={1}>{`${member.first_name} ${member.last_name}`}</Text>
                            <Text style={sheetStyles.mentionEmail} numberOfLines={1}>{member.email ?? ''}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              <View style={sheetStyles.inputRow}>
                <Avatar url={user?.avatar_url} name={user?.full_name ?? 'User'} size={32} />
                <TextInput
                  ref={inputRef}
                  style={sheetStyles.textInput}
                  value={commentText}
                  onChangeText={handleCommentTextChange}
                  onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection.start)}
                  placeholder="Add a comment... @ to mention"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!commentText.trim() || postCommentMutation.isPending}
                  style={[
                    sheetStyles.sendBtn,
                    commentText.trim() ? sheetStyles.sendBtnActive : null,
                  ]}
                  activeOpacity={0.7}
                >
                  {postCommentMutation.isPending ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Send
                      size={18}
                      color={commentText.trim() ? theme.colors.white : theme.colors.textTertiary}
                      style={{ transform: [{ rotate: '-45deg' }] }}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createRowStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  content: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 19,
  },
  replyBtn: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  likeBtn: {
    alignItems: 'center',
    paddingLeft: 12,
    paddingTop: 4,
    gap: 2,
  },
  likeCount: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  likeCountActive: {
    color: theme.colors.error,
  },
});

const createSheetStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SHEET_HEIGHT,
    minHeight: 300,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative' as const,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center' as const,
    flex: 1,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  listContent: {
    paddingVertical: 4,
  },
  inputSection: {
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  emojiBtn: {
    padding: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 80,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  sendBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  mentionSuggestions: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 180,
    overflow: 'hidden' as const,
  },
  mentionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  mentionInfo: {
    flex: 1,
    gap: 1,
  },
  mentionName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  mentionEmail: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
});
