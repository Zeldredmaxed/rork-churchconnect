import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Music, Edit3, Play, DollarSign, Plus, Disc } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

interface Song {
  id: number;
  title: string;
  genre: string;
  audio_url: string;
  cover_url: string | null;
  play_count: number;
  donation_count: number;
  created_at: string;
}

interface ArtistProfile {
  id: number;
  artist_name: string;
  bio: string | null;
  cover_image_url: string | null;
  total_earnings: number;
  is_verified: boolean;
  song_count: number;
  created_at: string;
}

export default function ArtistDashboardScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['artist-profile'],
    queryFn: () => api.get<{ data: ArtistProfile | null }>('/music/artist/me'),
  });

  const { data: songsData, isLoading: songsLoading, refetch } = useQuery({
    queryKey: ['my-songs'],
    queryFn: () => api.get<{ data: Song[] }>('/music/artist/me/songs'),
    enabled: !!profileData?.data,
  });

  const profile = profileData?.data;
  const songs = songsData?.data || [];
  const isLoading = profileLoading || songsLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'My Music', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text }} />
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'My Music', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text }} />
        <View style={styles.emptyState}>
          <Disc size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Not Registered as Artist</Text>
          <Text style={styles.emptySubtitle}>Register as an artist to upload songs and manage your music.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/upload-song')}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderSong = ({ item }: { item: Song }) => (
    <View style={styles.songCard}>
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={styles.songCover} />
      ) : (
        <View style={[styles.songCover, styles.songCoverPlaceholder]}>
          <Music size={24} color={theme.colors.textSecondary} />
        </View>
      )}

      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songGenre}>{item.genre || 'Gospel'}</Text>
        <View style={styles.songStats}>
          <View style={styles.stat}>
            <Play size={12} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{item.play_count || 0}</Text>
          </View>
          <View style={styles.stat}>
            <DollarSign size={12} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{item.donation_count || 0}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => router.push(`/edit-song?id=${item.id}&title=${encodeURIComponent(item.title)}&genre=${encodeURIComponent(item.genre || '')}&cover_url=${encodeURIComponent(item.cover_url || '')}`)}
      >
        <Edit3 size={18} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Music', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text }} />

      <FlatList
        data={songs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSong}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Music size={32} color="#fff" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.artistName}>{profile.artist_name}</Text>
                {profile.is_verified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
                <Text style={styles.bio}>{profile.bio || 'Gospel artist'}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{songs.length}</Text>
                <Text style={styles.statLabel}>Songs</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{songs.reduce((t, s) => t + (s.play_count || 0), 0)}</Text>
                <Text style={styles.statLabel}>Plays</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>${profile.total_earnings.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Earnings</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/upload-song')}>
              <Plus size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>Upload New Song</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>My Songs</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Music size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptySubtitle}>No songs yet. Upload your first song!</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1, marginLeft: 16 },
  artistName: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  verifiedBadge: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  bio: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  statCard: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary, borderRadius: 12, padding: 14, gap: 8, marginBottom: 24,
  },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  songCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 10,
  },
  songCover: { width: 56, height: 56, borderRadius: 8 },
  songCoverPlaceholder: { backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  songInfo: { flex: 1, marginLeft: 12 },
  songTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  songGenre: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  songStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: theme.colors.textSecondary },
  editBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, flex: 1, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
