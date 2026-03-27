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
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Share2, Eye, ChevronUp, Plus, X, Video, Upload, AtSign, MoreVertical, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { uploadSingleFile } from '@/utils/upload';
import EmptyState from '@/components/EmptyState';
import CommentsSheet from '@/components/CommentsSheet';
import PostOptionsSheet, { DeleteConfirmSheet } from '@/components/PostOptionsSheet';
import ReportSheet from '@/components/ReportSheet';
import MentionInput from '@/components/MentionInput';
import MentionPicker from '@/components/MentionPicker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import ShareSheet from '@/components/ShareSheet';
import type { Short, Member } from '@/types';

const SHORT_CATEGORIES = ['Worship', 'Testimony', 'Teaching', 'Praise', 'Community', 'Other'] as const;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedTab = 'trending' | 'my-church';

function ShortOverlay({ item, onLike, onComment, onShare, onMore, onSave, isSaved, currentUserId }: { item: Short; onLike: () => void; onComment: () => void; onShare: () => void; onMore: () => void; onSave: () => void; isSaved: boolean; currentUserId?: string }) {
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
      void queryClient.invalidateQueries({ queryKey: ['flock'] });
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
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>
                {(item.author_name ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
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
                fill={item.is_liked ? theme.colors.error : 'transparent'}
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Worship');
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [commentsShortId, setCommentsShortId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [optionsShortId, setOptionsShortId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareShortId, setShareShortId] = useState<string | null>(null);
  const { user } = useAuth();
  const { isItemSaved, toggleSave } = useSaved();

  const shortsQuery = useQuery({
    queryKey: ['shorts', activeTab],
    queryFn: () =>
      api.get<{ data: Short[] }>(
        activeTab === 'trending' ? '/shorts/trending' : '/shorts/my-church'
      ),
  });

  const likeMutation = useMutation({
    mutationFn: (params: { id: string; liked: boolean }) =>
      params.liked
        ? api.delete(`/shorts/${params.id}/unlike`)
        : api.post(`/shorts/${params.id}/like`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const viewMutation = useMutation({
    mutationFn: (id: string) => api.post(`/shorts/${id}/view`),
  });

  const deleteShortMutation = useMutation({
    mutationFn: (shortId: string) => api.delete(`/shorts/${shortId}`),
    onSuccess: () => {
      console.log('[Shorts] Short deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
      setShowDeleteConfirm(false);
      setShowOptions(false);
      setOptionsShortId(null);
    },
    onError: (error) => {
      console.log('[Shorts] Delete error:', error.message);
      Alert.alert('Error', 'Failed to delete short. Please try again.');
    },
  });

  const pickVideo = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your media library to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      console.log('[Shorts] Picker result:', JSON.stringify(result).slice(0, 300));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
        console.log('[Shorts] Video selected:', result.assets[0].uri.slice(0, 100));
      }
    } catch (error) {
      console.log('[Shorts] Video picker error:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  }, []);

  const recordVideo = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to record videos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
        console.log('[Shorts] Video recorded:', result.assets[0].uri.slice(0, 100));
      }
    } catch (error) {
      console.log('[Shorts] Camera error:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  }, []);

  const createShortMutation = useMutation({
    mutationFn: async (params: { title: string; description: string; category: string; video: ImagePicker.ImagePickerAsset | null }) => {
      console.log('[Shorts] Creating short with video:', !!params.video);

      let videoUrl = '';
      let durationSeconds: number | undefined;

      if (params.video) {
        console.log('[Shorts] Step 1: Uploading video to CDN...');
        const videoResult = await uploadSingleFile({
          uri: params.video.uri,
          mimeType: params.video.mimeType || 'video/mp4',
          category: 'video',
        });
        videoUrl = videoResult.url;
        console.log('[Shorts] Step 1 complete. Video URL:', videoUrl.slice(0, 80));

        if (params.video.duration) {
          durationSeconds = Math.round(params.video.duration / 1000);
        }
      }

      console.log('[Shorts] Step 2: Creating short record...');
      const body: Record<string, unknown> = {
        title: params.title,
        description: params.description,
        category: params.category.toLowerCase(),
      };
      if (videoUrl) body.video_url = videoUrl;
      if (durationSeconds) body.duration_seconds = durationSeconds;

      return api.post('/shorts', body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
      resetUploadForm();
      Alert.alert('Success', 'Your short has been uploaded!');
    },
    onError: (error) => {
      console.log('[Shorts] Upload mutation error:', error.message);
      Alert.alert('Upload Failed', error.message);
    },
  });

  const resetUploadForm = useCallback(() => {
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('Worship');
    setSelectedVideo(null);
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Short }> }) => {
      if (viewableItems.length > 0) {
        const item = viewableItems[0].item;
        viewMutation.mutate(item.id);
      }
    },
    [viewMutation]
  );

  const shorts = shortsQuery.data?.data ?? [];
  const itemHeight = SCREEN_HEIGHT;

  const selectedShort = optionsShortId ? shorts.find((s) => s.id === optionsShortId) : null;
  const isShortOwner = selectedShort?.author_id === user?.id;

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
    ({ item }: { item: Short }) => (
      <View style={[styles.shortItem, { height: itemHeight }]}>
        <View style={styles.videoPlaceholder}>
          <View style={styles.videoContent}>
            <ChevronUp size={20} color="rgba(255,255,255,0.3)" />
            <Text style={styles.swipeHint}>Swipe up for next</Text>
          </View>
        </View>
        <ShortOverlay
          item={item}
          onLike={() => likeMutation.mutate({ id: item.id, liked: !!item.is_liked })}
          onComment={() => {
            setCommentsShortId(item.id);
            setShowComments(true);
          }}
          onShare={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShareShortId(item.id);
            setShowShare(true);
          }}
          onMore={() => handleOpenShortOptions(item.id)}
          onSave={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggleSave({
              itemId: item.id,
              itemType: 'short',
              title: item.title,
              preview: item.description ?? item.title,
              authorName: item.author_name ?? item.church_name,
              authorId: item.author_id ?? '',
            });
          }}
          isSaved={isItemSaved(item.id, 'short')}
          currentUserId={user?.id}
        />
      </View>
    ),
    [itemHeight, likeMutation, handleOpenShortOptions, user?.id, isItemSaved, toggleSave, setShareShortId, setShowShare, styles]
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
          keyExtractor={(item) => item.id}
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

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => setShowUploadModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={theme.colors.black} strokeWidth={2.5} />
      </TouchableOpacity>

      <CommentsSheet
        visible={showComments}
        onClose={() => {
          setShowComments(false);
          setCommentsShortId(null);
        }}
        postId={commentsShortId}
        source="shorts"
      />

      <MentionPicker
        visible={showMentionPicker}
        onClose={() => setShowMentionPicker(false)}
        onSelect={(members: Member[]) => {
          const mentions = members.map((m) => `@${m.full_name}`).join(' ');
          setUploadDescription((prev) => (prev ? `${prev} ${mentions} ` : `${mentions} `));
        }}
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
              itemId: selectedShort.id,
              itemType: 'short',
              title: selectedShort.title,
              preview: selectedShort.description ?? selectedShort.title,
              authorName: selectedShort.author_name ?? selectedShort.church_name,
              authorId: selectedShort.author_id ?? '',
            });
          }
        }}
        isSaved={selectedShort ? isItemSaved(selectedShort.id, 'short') : false}
        itemType="short"
      />

      <ReportSheet
        visible={showReport}
        onClose={() => {
          setShowReport(false);
          setOptionsShortId(null);
        }}
        contentId={optionsShortId}
        contentType="short"
        authorName={selectedShort?.author_name}
        authorId={selectedShort?.author_id}
      />

      <DeleteConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setOptionsShortId(null);
        }}
        onConfirm={handleConfirmDeleteShort}
        isDeleting={deleteShortMutation.isPending}
        itemType="short"
      />

      <ShareSheet
        visible={showShare}
        onClose={() => {
          setShowShare(false);
          setShareShortId(null);
        }}
        content={shareShortId ? {
          id: shareShortId,
          type: 'short',
          title: shorts.find((s) => s.id === shareShortId)?.title ?? '',
          authorName: shorts.find((s) => s.id === shareShortId)?.author_name,
        } : null}
      />

      {showUploadModal && (
        <View style={[StyleSheet.absoluteFillObject, styles.uploadOverlay]}>
          <View style={[styles.uploadSheet, { paddingBottom: insets.bottom + 20 }]}> 
            <View style={styles.uploadHeader}>
              <TouchableOpacity onPress={resetUploadForm}>
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
              <Text style={styles.uploadHeaderTitle}>Create Short</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!uploadTitle.trim()) {
                    Alert.alert('Required', 'Please enter a title for your short.');
                    return;
                  }
                  createShortMutation.mutate({
                    title: uploadTitle.trim(),
                    description: uploadDescription.trim(),
                    category: uploadCategory,
                    video: selectedVideo,
                  });
                }}
                disabled={!uploadTitle.trim() || createShortMutation.isPending}
              >
                {createShortMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.uploadSubmitText, !uploadTitle.trim() && { opacity: 0.4 }]}>Post</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.uploadScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.uploadForm}>
                {selectedVideo ? (
                  <View style={styles.selectedVideoContainer}>
                    {selectedVideo.uri ? (
                      <Image
                        source={{ uri: selectedVideo.uri }}
                        style={styles.videoThumbnail}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.selectedVideoOverlay}>
                      <Video size={28} color={theme.colors.white} />
                      <Text style={styles.selectedVideoLabel}>Video Selected</Text>
                      {selectedVideo.duration ? (
                        <Text style={styles.selectedVideoDuration}>
                          {Math.round(selectedVideo.duration / 1000)}s
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.removeVideoBtn}
                      onPress={() => setSelectedVideo(null)}
                    >
                      <X size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.videoPickerContainer}>
                    <TouchableOpacity
                      style={styles.videoPickerBtn}
                      onPress={pickVideo}
                      activeOpacity={0.7}
                    >
                      <Upload size={28} color={theme.colors.accent} />
                      <Text style={styles.videoPickerTitle}>Choose from Library</Text>
                      <Text style={styles.videoPickerHint}>Select a video up to 60s</Text>
                    </TouchableOpacity>
                    {Platform.OS !== 'web' && (
                      <TouchableOpacity
                        style={styles.videoRecordBtn}
                        onPress={recordVideo}
                        activeOpacity={0.7}
                      >
                        <Video size={20} color={theme.colors.accent} />
                        <Text style={styles.videoRecordText}>Record Video</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TextInput
                  style={styles.uploadInput}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                  placeholder="Title *"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <MentionInput
                  value={uploadDescription}
                  onChangeText={setUploadDescription}
                  placeholder="Description (optional) — type @ to mention"
                  placeholderTextColor={'rgba(255,255,255,0.3)'}
                  multiline
                  inputStyle={StyleSheet.flatten([styles.uploadInput, styles.uploadDescInput])}
                  suggestionsPosition="below"
                  darkMode
                />

                <TouchableOpacity
                  style={styles.mentionBtn}
                  onPress={() => setShowMentionPicker(true)}
                  activeOpacity={0.7}
                >
                  <AtSign size={15} color={theme.colors.accent} />
                  <Text style={styles.mentionBtnText}>Mention Someone</Text>
                </TouchableOpacity>

                <Text style={styles.uploadCategoryLabel}>Category</Text>
                <View style={styles.uploadCategoryRow}>
                  {SHORT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.uploadCategoryChip, uploadCategory === cat && styles.uploadCategoryChipActive]}
                      onPress={() => setUploadCategory(cat)}
                    >
                      <Text style={[styles.uploadCategoryText, uploadCategory === cat && styles.uploadCategoryTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
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
  fab: {
    position: 'absolute' as const,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  uploadSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  uploadHeaderTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  uploadSubmitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  uploadScrollView: {
    flex: 1,
  },
  uploadForm: {
    gap: 14,
    paddingBottom: 20,
  },
  videoPickerContainer: {
    gap: 10,
  },
  videoPickerBtn: {
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoPickerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  videoPickerHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  videoRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  videoRecordText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.accent,
  },
  selectedVideoContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    position: 'relative' as const,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  selectedVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selectedVideoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  selectedVideoDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  removeVideoBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadInput: {
    fontSize: 16,
    color: theme.colors.white,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  uploadDescInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  uploadCategoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  uploadCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  uploadCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  uploadCategoryChipActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  uploadCategoryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  uploadCategoryTextActive: {
    color: theme.colors.accent,
  },
  mentionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 165, 116, 0.12)',
    alignSelf: 'flex-start' as const,
  },
  mentionBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.accent,
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
    color: theme.colors.white,
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
