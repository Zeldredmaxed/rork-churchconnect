import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  ArrowLeft,
  Camera,
  ImageIcon,
  ChevronDown,
  Eye,
  AtSign,
  Users,
  Hash,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import MentionInput from '@/components/MentionInput';
import MentionPicker from '@/components/MentionPicker';
import type { Member } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'pick' | 'details';

interface SelectedImage {
  uri: string;
  width: number;
  height: number;
  type?: string;
}

export default function CreatePostScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('pick');
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'leaders'>('all');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const userInitials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const createPostMutation = useMutation({
    mutationFn: async (params: { content: string; visibility: string; images?: SelectedImage[] }) => {
      if (params.images && params.images.length > 0) {
        const formData = new FormData();
        formData.append('content', params.content);
        formData.append('visibility', params.visibility);
        params.images.forEach((img, index) => {
          const uriParts = img.uri.split('.');
          const fileExtension = uriParts[uriParts.length - 1] || 'jpg';
          const mimeType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;
          formData.append('images', {
            uri: img.uri,
            name: `photo_${index}.${fileExtension}`,
            type: mimeType,
          } as unknown as Blob);
        });
        console.log('[CreatePost] Uploading with FormData, images:', params.images.length);
        return api.post('/feed', formData as unknown as Record<string, unknown>);
      }
      console.log('[CreatePost] Creating text-only post');
      return api.post('/feed', { content: params.content, visibility: params.visibility });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      console.log('[CreatePost] Post created successfully');
      router.back();
    },
    onError: (error) => {
      console.log('[CreatePost] Error creating post:', error.message);
      Alert.alert('Error', error.message || 'Failed to create post');
    },
  });

  const goToDetails = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep('details');
      slideAnim.setValue(SCREEN_WIDTH);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [slideAnim, fadeAnim]);

  const pickFromGallery = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[CreatePost] Media library permission:', permissionResult.status);
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select images for your post.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS !== 'web') {
                void import('expo-linking').then((Linking) => Linking.openSettings());
              }
            }},
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
        orderedSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        console.log('[CreatePost] Picked', result.assets.length, 'images');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const images: SelectedImage[] = result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type,
        }));
        setSelectedImages(images);
        goToDetails();
      }
    } catch (error) {
      console.log('[CreatePost] Gallery picker error:', error);
    }
  }, [goToDetails]);

  const pickFromCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        console.log('[CreatePost] Captured photo');
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const images: SelectedImage[] = result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type,
        }));
        setSelectedImages(images);
        goToDetails();
      }
    } catch (error) {
      console.log('[CreatePost] Camera error:', error);
    }
  }, [goToDetails]);

  const goBack = useCallback(() => {
    if (step === 'details') {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep('pick');
        setSelectedImages([]);
        slideAnim.setValue(0);
        fadeAnim.setValue(1);
      });
    } else {
      router.back();
    }
  }, [step, router, slideAnim, fadeAnim]);

  const handleShare = useCallback(() => {
    if (!caption.trim() && selectedImages.length === 0) {
      Alert.alert('Missing content', 'Please add a caption or select an image.');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPostMutation.mutate({
      content: caption.trim(),
      visibility,
      images: selectedImages.length > 0 ? selectedImages : undefined,
    });
  }, [caption, visibility, selectedImages, createPostMutation]);

  const handleSkipToText = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToDetails();
  }, [goToDetails]);

  useEffect(() => {
    slideAnim.setValue(0);
    fadeAnim.setValue(1);
  }, [slideAnim, fadeAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_bottom' }} />

      {step === 'pick' && (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New post</Text>
            <TouchableOpacity onPress={handleSkipToText} style={styles.headerActionBtn}>
              <Text style={styles.skipText}>Text only</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickContent}>
            <View style={styles.previewPlaceholder}>
              <View style={styles.previewIconWrap}>
                <ImageIcon size={48} color={theme.colors.textTertiary} strokeWidth={1.2} />
              </View>
              <Text style={styles.previewTitle}>Create a new post</Text>
              <Text style={styles.previewSubtitle}>Share photos or write something with your church</Text>
            </View>

            <View style={styles.pickActions}>
              <TouchableOpacity style={styles.pickMainBtn} onPress={pickFromGallery} activeOpacity={0.7}>
                <ImageIcon size={22} color={theme.colors.textInverse} />
                <Text style={styles.pickMainBtnText}>Select from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickSecondaryBtn} onPress={pickFromCamera} activeOpacity={0.7}>
                <Camera size={22} color={theme.colors.accent} />
                <Text style={styles.pickSecondaryBtnText}>Take a Photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Quick options</Text>
            </View>
            <View style={styles.quickOptions}>
              <TouchableOpacity style={styles.quickOption} onPress={pickFromGallery} activeOpacity={0.6}>
                <View style={[styles.quickOptionIcon, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                  <ImageIcon size={20} color="#60A5FA" />
                </View>
                <Text style={styles.quickOptionText}>Photo Post</Text>
                <Text style={styles.quickOptionDesc}>Share images</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickOption} onPress={handleSkipToText} activeOpacity={0.6}>
                <View style={[styles.quickOptionIcon, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Hash size={20} color="#34D399" />
                </View>
                <Text style={styles.quickOptionText}>Text Post</Text>
                <Text style={styles.quickOptionDesc}>Write something</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickOption} onPress={pickFromCamera} activeOpacity={0.6}>
                <View style={[styles.quickOptionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Camera size={20} color="#FBBF24" />
                </View>
                <Text style={styles.quickOptionText}>Camera</Text>
                <Text style={styles.quickOptionDesc}>Take a photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {step === 'details' && (
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New post</Text>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareBtn}
              disabled={createPostMutation.isPending}
              activeOpacity={0.7}
            >
              {createPostMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.shareBtnText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.detailsContainer}
            keyboardVerticalOffset={insets.top + 50}
          >
            <ScrollView
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {selectedImages.length > 0 && (
                <View style={styles.imagePreviewSection}>
                  {selectedImages.length === 1 ? (
                    <Image
                      source={{ uri: selectedImages[0].uri }}
                      style={styles.singleImagePreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View>
                      <FlatList
                        data={selectedImages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, index) => index.toString()}
                        onMomentumScrollEnd={(e) => {
                          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                          setCurrentImageIndex(index);
                        }}
                        renderItem={({ item }) => (
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.carouselImage}
                            resizeMode="cover"
                          />
                        )}
                      />
                      <View style={styles.paginationDots}>
                        {selectedImages.map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.dot,
                              index === currentImageIndex && styles.dotActive,
                            ]}
                          />
                        ))}
                      </View>
                      <View style={styles.imageCountBadge}>
                        <Text style={styles.imageCountText}>
                          {currentImageIndex + 1}/{selectedImages.length}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.captionSection}>
                <View style={styles.captionAuthorRow}>
                  <View style={styles.captionAvatar}>
                    <Text style={styles.captionAvatarText}>{userInitials}</Text>
                  </View>
                  <Text style={styles.captionAuthorName}>{user?.full_name ?? 'User'}</Text>
                </View>
                <MentionInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Write a caption and add hashtags..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  autoFocus={selectedImages.length === 0}
                  inputStyle={styles.captionInput}
                  suggestionsPosition="below"
                />
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowMentionPicker(true)}
                activeOpacity={0.6}
              >
                <View style={styles.optionLeft}>
                  <AtSign size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.optionText}>Mention people</Text>
                </View>
                <ChevronDown size={18} color={theme.colors.textTertiary} style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowVisibilityMenu(!showVisibilityMenu)}
                activeOpacity={0.6}
              >
                <View style={styles.optionLeft}>
                  <Eye size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.optionText}>Audience</Text>
                </View>
                <View style={styles.optionRight}>
                  <Text style={styles.optionValue}>
                    {visibility === 'all' ? 'Everyone' : 'Leaders Only'}
                  </Text>
                  <ChevronDown size={18} color={theme.colors.textTertiary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </View>
              </TouchableOpacity>

              {showVisibilityMenu && (
                <View style={styles.visibilityDropdown}>
                  <TouchableOpacity
                    style={[styles.visibilityItem, visibility === 'all' && styles.visibilityItemActive]}
                    onPress={() => {
                      setVisibility('all');
                      setShowVisibilityMenu(false);
                      void Haptics.selectionAsync();
                    }}
                  >
                    <Users size={18} color={visibility === 'all' ? theme.colors.accent : theme.colors.textSecondary} />
                    <View style={styles.visibilityItemContent}>
                      <Text style={[styles.visibilityItemTitle, visibility === 'all' && styles.visibilityItemTitleActive]}>
                        Everyone
                      </Text>
                      <Text style={styles.visibilityItemDesc}>All church members can see this</Text>
                    </View>
                    {visibility === 'all' && <Check size={18} color={theme.colors.accent} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.visibilityItem, visibility === 'leaders' && styles.visibilityItemActive]}
                    onPress={() => {
                      setVisibility('leaders');
                      setShowVisibilityMenu(false);
                      void Haptics.selectionAsync();
                    }}
                  >
                    <Eye size={18} color={visibility === 'leaders' ? theme.colors.accent : theme.colors.textSecondary} />
                    <View style={styles.visibilityItemContent}>
                      <Text style={[styles.visibilityItemTitle, visibility === 'leaders' && styles.visibilityItemTitleActive]}>
                        Leaders Only
                      </Text>
                      <Text style={styles.visibilityItemDesc}>Only leaders and above can see this</Text>
                    </View>
                    {visibility === 'leaders' && <Check size={18} color={theme.colors.accent} />}
                  </TouchableOpacity>
                </View>
              )}

              {selectedImages.length === 0 && (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={pickFromGallery}
                  activeOpacity={0.6}
                >
                  <View style={styles.optionLeft}>
                    <ImageIcon size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.optionText}>Add photo</Text>
                  </View>
                  <ChevronDown size={18} color={theme.colors.textTertiary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              )}

              <View style={styles.bottomSpacer} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      <MentionPicker
        visible={showMentionPicker}
        onClose={() => setShowMentionPicker(false)}
        onSelect={(members: Member[]) => {
          const mentions = members.map((m) => `@${m.full_name}`).join(' ');
          setCaption((prev) => (prev ? `${prev} ${mentions} ` : `${mentions} `));
        }}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stepContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  headerActionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  shareBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.textInverse,
  },
  pickContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  previewIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  pickActions: {
    gap: 12,
    marginBottom: 32,
  },
  pickMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 10,
  },
  pickMainBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.textInverse,
  },
  pickSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickSecondaryBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  recentHeader: {
    marginBottom: 14,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  quickOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickOption: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  quickOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  quickOptionDesc: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsScrollContent: {
    paddingBottom: 40,
  },
  imagePreviewSection: {
    position: 'relative' as const,
  },
  singleImagePreview: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: theme.colors.surfaceElevated,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: theme.colors.surfaceElevated,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textTertiary,
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageCountBadge: {
    position: 'absolute' as const,
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  captionSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  captionAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  captionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  captionAvatarText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  captionAuthorName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  captionInput: {
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top' as const,
    lineHeight: 22,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500' as const,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionValue: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  visibilityDropdown: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: -1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  visibilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  visibilityItemActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  visibilityItemContent: {
    flex: 1,
  },
  visibilityItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  visibilityItemTitleActive: {
    color: theme.colors.accent,
  },
  visibilityItemDesc: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  bottomSpacer: {
    height: 100,
  },
});
