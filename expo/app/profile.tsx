import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { uploadSingleFile } from '@/utils/upload';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const handleFieldPress = (route: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  };

  const avatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      console.log('[Profile] Step 1: Uploading avatar to CDN...');
      const uploadResult = await uploadSingleFile({
        uri,
        category: 'image',
      });
      console.log('[Profile] Step 2: Updating profile with avatar URL...');
      await api.put('/auth/me', { avatar_url: uploadResult.url });
      return uploadResult.url;
    },
    onSuccess: (avatarUrl) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void updateUser({ avatar_url: avatarUrl });
      console.log('[Profile] Avatar updated successfully');
    },
    onError: (error) => {
      console.log('[Profile] Avatar upload error:', error.message);
      Alert.alert('Upload Failed', error.message || 'Failed to update profile picture.');
    },
  });

  const pickAvatar = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.',
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        avatarMutation.mutate(result.assets[0].uri);
      }
    } catch (error) {
      console.log('[Profile] Image picker error:', error);
    }
  }, [avatarMutation]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit profile',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7} disabled={avatarMutation.isPending}>
              <View style={styles.avatar}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                {avatarMutation.isPending && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7} disabled={avatarMutation.isPending}>
            <Text style={styles.editPictureText}>
              {avatarMutation.isPending ? 'Uploading...' : 'Edit picture or avatar'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldsSection}>
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => handleFieldPress('/edit-name')}
            activeOpacity={0.6}
            testID="edit-name-field"
          >
            <Text style={styles.fieldLabel}>Name</Text>
            <Text style={styles.fieldValue} numberOfLines={1}>
              {user?.full_name || ''}
            </Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => handleFieldPress('/edit-username')}
            activeOpacity={0.6}
            testID="edit-username-field"
          >
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.fieldValue} numberOfLines={1}>
              {user?.username || ''}
            </Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => handleFieldPress('/edit-pronouns')}
            activeOpacity={0.6}
            testID="edit-pronouns-field"
          >
            <Text style={styles.fieldLabel}>Pronouns</Text>
            <Text style={[styles.fieldValue, !user?.pronouns && styles.fieldPlaceholder]} numberOfLines={1}>
              {user?.pronouns || 'Pronouns'}
            </Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => handleFieldPress('/edit-bio')}
            activeOpacity={0.6}
            testID="edit-bio-field"
          >
            <Text style={styles.fieldLabel}>Bio</Text>
            <Text style={[styles.fieldValue, !user?.bio && styles.fieldPlaceholder]} numberOfLines={1}>
              {user?.bio || ''}
            </Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fieldRow}
            activeOpacity={0.6}
            testID="edit-link-field"
          >
            <Text style={styles.fieldLabel}>Add Link</Text>
            <Text style={[styles.fieldValue, !user?.link && styles.fieldPlaceholder]} numberOfLines={1}>
              {user?.link || ''}
            </Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fieldRowWithArrow}
            onPress={() => handleFieldPress('/edit-gender')}
            activeOpacity={0.6}
            testID="edit-gender-field"
          >
            <View style={styles.fieldRowContent}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {user?.gender || 'Prefer not to say'}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
            <View style={styles.fieldDividerFull} />
          </TouchableOpacity>
        </View>

        <View style={styles.linksSection}>
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.6}>
            <Text style={styles.linkText}>Switch to Professional account</Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} activeOpacity={0.6}>
            <Text style={styles.linkText}>Personal information settings</Text>
            <View style={styles.fieldDivider} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 45,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  editPictureText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0095F6',
  },
  fieldsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  fieldRow: {
    paddingVertical: 14,
    position: 'relative' as const,
  },
  fieldRowWithArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative' as const,
  },
  fieldRowContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: theme.colors.text,
  },
  fieldPlaceholder: {
    color: theme.colors.textTertiary,
  },
  fieldDivider: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
  },
  fieldDividerFull: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: -16,
    height: 0.5,
    backgroundColor: theme.colors.borderLight,
  },
  linksSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  linkRow: {
    paddingVertical: 14,
    position: 'relative' as const,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#0095F6',
  },
});

