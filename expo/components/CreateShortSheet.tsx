import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { X, Video, Upload, AtSign } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { uploadSingleFile } from '@/utils/upload';
import MentionInput from '@/components/MentionInput';
import MentionPicker from '@/components/MentionPicker';
import type { Member } from '@/types';

const SHORT_CATEGORIES = ['Worship', 'Testimony', 'Teaching', 'Praise', 'Community', 'Other'] as const;

interface CreateShortSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateShortSheet({ visible, onClose }: CreateShortSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Worship');
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  const resetForm = useCallback(() => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('Worship');
    setSelectedVideo(null);
    onClose();
  }, [onClose]);

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

      console.log('[CreateShort] Picker result:', JSON.stringify(result).slice(0, 300));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
        console.log('[CreateShort] Video selected:', result.assets[0].uri.slice(0, 100));
      }
    } catch (error) {
      console.log('[CreateShort] Video picker error:', error);
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
        console.log('[CreateShort] Video recorded:', result.assets[0].uri.slice(0, 100));
      }
    } catch (error) {
      console.log('[CreateShort] Camera error:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  }, []);

  const createShortMutation = useMutation({
    mutationFn: async (params: { title: string; description: string; category: string; video: ImagePicker.ImagePickerAsset | null }) => {
      console.log('[CreateShort] Creating short with video:', !!params.video);

      let videoUrl = '';
      let durationSeconds: number | undefined;

      if (params.video) {
        console.log('[CreateShort] Step 1: Uploading video to CDN...');
        const videoResult = await uploadSingleFile({
          uri: params.video.uri,
          mimeType: params.video.mimeType || 'video/mp4',
          category: 'video',
        });
        videoUrl = videoResult.url;
        console.log('[CreateShort] Step 1 complete. Video URL:', videoUrl.slice(0, 80));

        if (params.video.duration) {
          durationSeconds = Math.round(params.video.duration / 1000);
        }
      }

      console.log('[CreateShort] Step 2: Creating short record...');
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['shorts'] });
      void queryClient.invalidateQueries({ queryKey: ['my-shorts'] });
      resetForm();
      Alert.alert('Success', 'Your short has been uploaded!');
    },
    onError: (error) => {
      console.log('[CreateShort] Upload mutation error:', error.message);
      Alert.alert('Upload Failed', error.message);
    },
  });

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.uploadOverlay]}>
      <TouchableOpacity style={styles.uploadOverlayDismiss} activeOpacity={1} onPress={resetForm} />
      <View style={[styles.uploadSheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.uploadHeader}>
          <TouchableOpacity onPress={resetForm}>
            <X size={22} color={theme.colors.text} />
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.uploadScrollContent}>
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
                  <Video size={28} color="#fff" />
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
                  <X size={16} color="#fff" />
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
              placeholderTextColor={theme.colors.textTertiary}
            />
            <MentionInput
              value={uploadDescription}
              onChangeText={setUploadDescription}
              placeholder="Description (optional) — type @ to mention"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              inputStyle={StyleSheet.flatten([styles.uploadInput, styles.uploadDescInput])}
              suggestionsPosition="below"
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

      <MentionPicker
        visible={showMentionPicker}
        onClose={() => setShowMentionPicker(false)}
        onSelect={(members: Member[]) => {
          const mentions = members.map((m) => `@${m.full_name}`).join(' ');
          setUploadDescription((prev) => (prev ? `${prev} ${mentions} ` : `${mentions} `));
        }}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  uploadOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  uploadOverlayDismiss: {
    flex: 1,
  },
  uploadSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  uploadScrollContent: {
    paddingBottom: 20,
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
    color: theme.colors.text,
  },
  uploadSubmitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
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
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
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
    color: theme.colors.textTertiary,
  },
  videoRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.surfaceElevated,
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
    color: '#fff',
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
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  uploadDescInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  uploadCategoryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surfaceElevated,
  },
  uploadCategoryChipActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  uploadCategoryText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
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
    backgroundColor: theme.colors.accentMuted,
    alignSelf: 'flex-start' as const,
  },
  mentionBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.accent,
  },
});
