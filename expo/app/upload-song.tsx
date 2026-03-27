import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Upload, Music, Mic, Image as ImageIcon, CheckCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api, BASE_URL } from '@/utils/api';
import * as SecureStore from 'expo-secure-store';

export default function UploadSongScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('gospel');
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [coverImage, setCoverImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  // Check if user is artist
  const artistQuery = useQuery({
    queryKey: ['music', 'artist', 'me'],
    queryFn: () => api.get<{ data: any }>('/music/artist/me'),
  });

  const isArtist = artistQuery.data?.data != null;

  // Register as artist
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');

  const registerMutation = useMutation({
    mutationFn: (data: { artist_name: string; bio: string }) =>
      api.post('/music/artist/register', data as any),
    onSuccess: () => {
      Alert.alert('🎵 Welcome, Artist!', 'You are now registered as an artist.');
      queryClient.invalidateQueries({ queryKey: ['music', 'artist', 'me'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Registration failed'),
  });

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setAudioFile(result.assets[0]);
      }
    } catch (e) {
      console.log('Audio pick error:', e);
    }
  };

  const pickCoverArt = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to select cover art.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setCoverImage(result.assets[0]);
      }
    } catch (e) {
      console.log('Image pick error:', e);
    }
  };

  const uploadFile = async (
    uri: string,
    name: string,
    mimeType: string,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', { uri, name, type: mimeType } as any);

    const token = await SecureStore.getItemAsync('access_token');
    const res = await fetch(`${BASE_URL}/api/v1/uploads/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }

    const data = await res.json();
    const url = data.url || data.secure_url;
    if (!url) throw new Error('No URL returned from upload');
    return url;
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a song title.');
      return;
    }
    if (!coverImage) {
      Alert.alert('Cover Art Required', 'Please add cover art for your song.');
      return;
    }
    if (!audioFile) {
      Alert.alert('No Audio', 'Please select an audio file to upload.');
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload cover art
      const coverUrl = await uploadFile(
        coverImage.uri,
        'cover.jpg',
        coverImage.mimeType || 'image/jpeg',
      );

      // Step 2: Upload audio file
      const audioUrl = await uploadFile(
        audioFile.uri,
        audioFile.name || 'audio.mp3',
        audioFile.mimeType || 'audio/mpeg',
      );

      // Step 3: Create the song record
      await api.post('/music/songs', {
        title: title.trim(),
        genre: genre.trim() || 'gospel',
        audio_url: audioUrl,
        cover_url: coverUrl,
      } as any);

      Alert.alert('🎵 Song Published!', 'Your song is now live on Gospel Radio.');
      queryClient.invalidateQueries({ queryKey: ['music'] });
      router.back();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = title.trim() && audioFile && coverImage && !uploading;

  // ── Not an artist yet ──
  if (!isArtist && !artistQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Become an Artist',
            headerStyle: { backgroundColor: '#0D0D15' },
            headerTintColor: theme.colors.text,
          }}
        />
        <ScrollView contentContainerStyle={styles.registerContent}>
          <View style={styles.heroIcon}>
            <Mic size={48} color={theme.colors.accent} />
          </View>
          <Text style={styles.registerTitle}>Share Your Gift</Text>
          <Text style={styles.registerSubtitle}>
            Register as an artist to upload your songs to Gospel Radio.
            Your music will reach the community, and listeners can bless you with donations.
            You receive 70% of every gift!
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Artist / Stage Name"
            placeholderTextColor={theme.colors.textTertiary}
            value={artistName}
            onChangeText={setArtistName}
          />
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell the community about yourself..."
            placeholderTextColor={theme.colors.textTertiary}
            value={artistBio}
            onChangeText={setArtistBio}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, !artistName.trim() && styles.submitBtnDisabled]}
            onPress={() => registerMutation.mutate({ artist_name: artistName.trim(), bio: artistBio.trim() })}
            disabled={!artistName.trim() || registerMutation.isPending}
            activeOpacity={0.7}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.submitBtnText}>Register as Artist</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Upload Form ──
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Upload Song',
          headerStyle: { backgroundColor: '#0D0D15' },
          headerTintColor: theme.colors.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.formContent}>
        <View style={styles.heroIcon}>
          <Upload size={40} color={theme.colors.accent} />
        </View>
        <Text style={styles.formTitle}>Share Your Music</Text>

        {/* Cover Art Picker */}
        <TouchableOpacity style={styles.coverPickBtn} onPress={pickCoverArt} activeOpacity={0.7}>
          {coverImage ? (
            <View style={styles.coverPreviewWrap}>
              <Image source={{ uri: coverImage.uri }} style={styles.coverPreview} />
              <View style={styles.coverCheckBadge}>
                <CheckCircle size={20} color={theme.colors.success} />
              </View>
            </View>
          ) : (
            <View style={styles.coverPlaceholder}>
              <ImageIcon size={32} color={theme.colors.accent} />
              <Text style={styles.coverPlaceholderText}>Tap to add Cover Art</Text>
              <Text style={styles.coverRequiredText}>Required</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Song Title"
          placeholderTextColor={theme.colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Genre (default: gospel)"
          placeholderTextColor={theme.colors.textTertiary}
          value={genre}
          onChangeText={setGenre}
        />

        {/* Audio File Picker */}
        <TouchableOpacity style={styles.pickBtn} onPress={pickAudio} activeOpacity={0.7}>
          <Music size={20} color={theme.colors.accent} />
          <Text style={styles.pickBtnText}>
            {audioFile ? audioFile.name : 'Pick Audio File'}
          </Text>
          {audioFile && <CheckCircle size={18} color={theme.colors.success} />}
        </TouchableOpacity>

        {audioFile && (
          <Text style={styles.fileInfo}>
            {(audioFile.size ? (audioFile.size / (1024 * 1024)).toFixed(1) : '?')} MB
          </Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleUpload}
          disabled={!canSubmit}
          activeOpacity={0.7}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={theme.colors.textInverse} />
              <Text style={styles.submitBtnText}>  Uploading...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Publish to Gospel Radio 🎵</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0D0D15',
    },
    registerContent: {
      padding: 24,
      alignItems: 'center',
    },
    formContent: {
      padding: 24,
      alignItems: 'center',
    },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(212, 165, 116, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      marginTop: 12,
    },
    registerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#F2F2F2',
      marginBottom: 8,
    },
    registerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
    },
    formTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#F2F2F2',
      marginBottom: 24,
    },
    input: {
      width: '100%',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: '#F2F2F2',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    bioInput: {
      height: 100,
      textAlignVertical: 'top',
    },

    // Cover Art
    coverPickBtn: {
      width: '100%',
      marginBottom: 16,
      alignItems: 'center',
    },
    coverPlaceholder: {
      width: 160,
      height: 160,
      borderRadius: 16,
      backgroundColor: 'rgba(212, 165, 116, 0.08)',
      borderWidth: 2,
      borderColor: 'rgba(212, 165, 116, 0.3)',
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    coverPlaceholderText: {
      fontSize: 14,
      color: theme.colors.accent,
      fontWeight: '500',
    },
    coverRequiredText: {
      fontSize: 11,
      color: theme.colors.error,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    coverPreviewWrap: {
      position: 'relative',
    },
    coverPreview: {
      width: 160,
      height: 160,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    coverCheckBadge: {
      position: 'absolute',
      bottom: -6,
      right: -6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#0D0D15',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Audio picker
    pickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
      backgroundColor: 'rgba(212, 165, 116, 0.12)',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(212, 165, 116, 0.25)',
      borderStyle: 'dashed',
      marginBottom: 8,
    },
    pickBtnText: {
      fontSize: 15,
      color: theme.colors.accent,
      fontWeight: '500',
      flex: 1,
    },
    fileInfo: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginBottom: 16,
    },

    // Submit
    submitBtn: {
      width: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    submitBtnDisabled: {
      opacity: 0.4,
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textInverse,
    },
    uploadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
