import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Save, Image as ImageIcon, Music } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api, BASE_URL } from '@/utils/api';
import * as SecureStore from 'expo-secure-store';

export default function EditSongScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string; title: string; genre: string; cover_url: string }>();

  const [title, setTitle] = useState(params.title || '');
  const [genre, setGenre] = useState(params.genre || '');
  const [coverImage, setCoverImage] = useState<{ uri: string; mimeType?: string } | null>(
    params.cover_url ? { uri: decodeURIComponent(params.cover_url) } : null
  );
  const [newCoverPicked, setNewCoverPicked] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverImage({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType || 'image/jpeg' });
      setNewCoverPicked(true);
    }
  };

  const uploadCoverToCloudinary = async (uri: string, mimeType: string): Promise<string> => {
    let fileUri = uri;
    if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = 'file://' + fileUri;
    }

    const signData = await api.get<{
      cloud_name: string; api_key: string; timestamp: number; signature: string; folder: string;
    }>('/uploads/sign?resource_type=image');

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: 'cover.jpg',
      type: mimeType || 'image/jpeg',
    } as any);
    formData.append('api_key', signData.api_key);
    formData.append('timestamp', String(signData.timestamp));
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`,
      { method: 'POST', body: formData },
    );

    if (!res.ok) throw new Error(`Cover upload failed (${res.status})`);
    const result = await res.json();
    if (!result.secure_url) throw new Error('No URL from Cloudinary');
    return result.secure_url;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a song title.');
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, string> = {};

      if (title.trim() !== params.title) {
        updateData.title = title.trim();
      }
      if (genre.trim() !== params.genre) {
        updateData.genre = genre.trim() || 'gospel';
      }

      // Upload new cover if changed
      if (newCoverPicked && coverImage) {
        const coverUrl = await uploadCoverToCloudinary(coverImage.uri, coverImage.mimeType || 'image/jpeg');
        updateData.cover_url = coverUrl;
      }

      if (Object.keys(updateData).length === 0) {
        Alert.alert('No Changes', 'Nothing has been modified.');
        setSaving(false);
        return;
      }

      await api.put(`/music/songs/${params.id}`, updateData as any);

      Alert.alert('✅ Song Updated!', 'Your changes have been saved.');
      queryClient.invalidateQueries({ queryKey: ['my-songs'] });
      queryClient.invalidateQueries({ queryKey: ['music'] });
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{
        title: 'Edit Song',
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
      }} />

      {/* Cover Art */}
      <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage}>
        {coverImage?.uri ? (
          <Image source={{ uri: coverImage.uri }} style={styles.coverPreview} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <ImageIcon size={40} color={theme.colors.textSecondary} />
            <Text style={styles.coverLabel}>Tap to change cover art</Text>
          </View>
        )}
        <View style={styles.coverOverlay}>
          <ImageIcon size={20} color="#fff" />
          <Text style={styles.coverOverlayText}>Change Cover</Text>
        </View>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.label}>Song Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter song title"
        placeholderTextColor={theme.colors.textSecondary}
        maxLength={255}
      />

      {/* Genre */}
      <Text style={styles.label}>Genre</Text>
      <TextInput
        style={styles.input}
        value={genre}
        onChangeText={setGenre}
        placeholder="e.g. Gospel, Worship, Hymn"
        placeholderTextColor={theme.colors.textSecondary}
        maxLength={100}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Save size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingBottom: 40 },
  coverPicker: {
    width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden',
    backgroundColor: theme.colors.surface, marginBottom: 24, position: 'relative',
  },
  coverPreview: { width: '100%', height: '100%' },
  coverPlaceholder: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  coverLabel: { fontSize: 14, color: theme.colors.textSecondary },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
  },
  coverOverlayText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16,
    fontSize: 16, color: theme.colors.text, marginBottom: 20,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary, borderRadius: 14, padding: 16, gap: 8, marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
