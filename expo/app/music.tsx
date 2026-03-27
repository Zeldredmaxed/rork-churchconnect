import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, Alert, Dimensions, Image,
  AppState,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Play, Pause, SkipForward, Heart, Music, Radio, ChevronDown,
  Upload, User, Search, Disc3, Gift, Crown, X,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

const { width } = Dimensions.get('window');

interface Song {
  id: number;
  artist_id: number;
  artist_name: string;
  title: string;
  genre: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  play_count: number;
  donation_count: number;
}

const DONATION_TIERS = [
  { amount: 2.99, label: '$2.99', emoji: '🙏' },
  { amount: 5.00, label: '$5.00', emoji: '💛' },
  { amount: 25.00, label: '$25.00', emoji: '👑' },
];

export default function MusicScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();
  const soundRef = useRef<Audio.Sound | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showDonate, setShowDonate] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number>(0);
  const currentSongIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Server-side radio: fetch what's currently playing ──────────
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueLength, setQueueLength] = useState(0);

  // Fetch skip premium status
  const skipQuery = useQuery({
    queryKey: ['music', 'skip-premium'],
    queryFn: () => api.get<{ data: { is_active: boolean; expires_at: string | null } }>('/music/skip-premium/status'),
  });

  // Artist profile check
  const artistQuery = useQuery({
    queryKey: ['music', 'artist', 'me'],
    queryFn: () => api.get<{ data: any }>('/music/artist/me'),
  });

  const canSkip = skipQuery.data?.data?.is_active ?? false;

  // Donate mutation
  const donateMutation = useMutation({
    mutationFn: (data: { song_id: number; amount: number }) =>
      api.post('/music/donate', data as any),
    onSuccess: (resp: any) => {
      const sent = resp?.data?.download_email_sent;
      Alert.alert(
        '🙏 Donation Sent!',
        `Thank you for your gift! The artist receives 70%.${sent ? '\n\nA download link has been sent to your email.' : ''}`,
      );
      setShowDonate(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Donation failed'),
  });

  // Skip premium mutation
  const skipMutation = useMutation({
    mutationFn: () => api.post('/music/skip-premium', {}),
    onSuccess: () => {
      Alert.alert('👑 Skip Premium Activated!', 'You can now skip songs for 30 days.');
      queryClient.invalidateQueries({ queryKey: ['music', 'skip-premium'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Subscription failed'),
  });

  // Play count mutation
  const playMutation = useMutation({
    mutationFn: (songId: number) => api.post(`/music/songs/${songId}/play`, {}),
  });

  // ── Sync to server-side radio station ──────────────────────────
  const syncToStation = useCallback(async () => {
    try {
      const resp = await api.get<{ data: any }>('/music/radio/now-playing');
      const data = resp?.data;
      if (!data || !data.song) return;

      const serverSong = data.song as Song;
      const elapsedSeconds = data.elapsed_seconds || 0;
      const elapsedMs = Math.floor(elapsedSeconds * 1000);

      setQueuePosition(data.queue_position || 0);
      setQueueLength(data.queue_length || 0);

      // If the song changed, load the new one and seek
      if (serverSong.id !== currentSongIdRef.current) {
        currentSongIdRef.current = serverSong.id;
        setCurrentSong(serverSong);

        // Unload previous
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: serverSong.audio_url },
          { shouldPlay: true, positionMillis: elapsedMs },
          (status) => {
            if (status.isLoaded) {
              setProgress(status.positionMillis || 0);
              setDuration(status.durationMillis || 0);
              if (status.didJustFinish) {
                // Song ended on client — force server to advance and re-sync
                playMutation.mutate(serverSong.id);
                api.post('/music/radio/advance')
                  .catch(err => console.error('[Radio] Error advancing:', err))
                  .finally(() => {
                    currentSongIdRef.current = null; // Force reload
                    syncToStation();
                  });
              }
            }
          },
        );
        soundRef.current = sound;
        setIsPlaying(true);
      }
    } catch (e) {
      console.log('[Radio] Sync error:', e);
    }
  }, []);

  const handlePlayPause = async () => {
    if (!soundRef.current) {
      // First play — sync to station
      await syncToStation();
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  // ── Initial sync + periodic re-sync every 30s ──────────────────
  useEffect(() => {
    // Tune in immediately on mount
    syncToStation();

    // Re-sync every 30 seconds to catch song changes
    syncIntervalRef.current = setInterval(() => {
      syncToStation();
    }, 30_000);

    // Heartbeat every 60s to keep station alive
    heartbeatIntervalRef.current = setInterval(() => {
      api.post('/music/radio/heartbeat', {}).catch(() => {});
    }, 60_000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Background / foreground handling ───────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextState.match(/inactive|background/)
      ) {
        backgroundTimeRef.current = Date.now();
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // Came back — re-sync to the server to join mid-song
        syncToStation();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Radio size={48} color={theme.colors.accent} />
          <Text style={styles.loadingText}>Tuning in to Gospel Radio...</Text>
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronDown size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Radio size={14} color={theme.colors.accent} />
          <Text style={styles.headerLabel}>GOSPEL RADIO</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/upload-song' as never)} style={styles.headerBtn}>
          <Upload size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Album Art */}
      <View style={styles.artContainer}>
        <View style={styles.albumArt}>
          {currentSong?.cover_url ? (
            <Image
              source={{ uri: currentSong.cover_url }}
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.albumArtInner}>
              <Disc3 size={80} color={theme.colors.accent} />
            </View>
          )}
          <View style={styles.vinylRing} />
        </View>
      </View>

      {/* Song Info */}
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {currentSong?.title || 'No songs available'}
        </Text>
        <TouchableOpacity
          onPress={() => currentSong && router.push(`/artist/${currentSong.artist_id}` as never)}
        >
          <Text style={styles.artistName}>{currentSong?.artist_name || 'Unknown Artist'}</Text>
        </TouchableOpacity>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {currentSong?.play_count ?? 0} plays
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>
            {currentSong?.donation_count ?? 0} gifts
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.donateBtn}
          onPress={() => setShowDonate(true)}
          activeOpacity={0.7}
        >
          <Gift size={22} color={theme.colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playBtn}
          onPress={handlePlayPause}
          activeOpacity={0.7}
        >
          {isPlaying ? (
            <Pause size={32} color={theme.colors.textInverse} />
          ) : (
            <Play size={32} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>

        {canSkip ? (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => {
              // Force re-sync to skip to whatever the server has next
              currentSongIdRef.current = null;
              syncToStation();
            }}
            activeOpacity={0.7}
          >
            <SkipForward size={22} color={theme.colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.premiumBtn}
            onPress={() => {
              Alert.alert(
                '👑 Skip Premium',
                'Skip any song for $3.99/month.\nNo more waiting — skip freely!',
                [
                  { text: 'Not Now', style: 'cancel' },
                  { text: 'Subscribe $3.99/mo', onPress: () => skipMutation.mutate() },
                ],
              );
            }}
            activeOpacity={0.7}
          >
            <Crown size={20} color={theme.colors.warning} />
          </TouchableOpacity>
        )}
      </View>

      {/* Queue Toggle */}
      <TouchableOpacity
        style={styles.queueToggle}
        onPress={() => setShowQueue(true)}
        activeOpacity={0.7}
      >
        <Music size={16} color={theme.colors.textSecondary} />
        <Text style={styles.queueToggleText}>
          Station · Song {queuePosition + 1} of {queueLength}
        </Text>
      </TouchableOpacity>

      {/* ── Donation Bottom Sheet ─────────────────────── */}
      <Modal visible={showDonate} transparent animationType="slide" onRequestClose={() => setShowDonate(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowDonate(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Bless This Artist 🙏</Text>
            <Text style={styles.sheetSubtitle}>
              Your donation supports {currentSong?.artist_name}. They receive 70% of every gift.
              You'll also get this song sent to your email for download!
            </Text>
            {DONATION_TIERS.map((tier) => (
              <TouchableOpacity
                key={tier.amount}
                style={styles.tierBtn}
                onPress={() => {
                  if (!currentSong) return;
                  donateMutation.mutate({ song_id: currentSong.id, amount: tier.amount });
                }}
                activeOpacity={0.7}
                disabled={donateMutation.isPending}
              >
                <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                <Text style={styles.tierLabel}>{tier.label}</Text>
                <Text style={styles.tierArtistShare}>Artist gets ${(tier.amount * 0.7).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
            {donateMutation.isPending && (
              <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginTop: 12 }} />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Queue Bottom Sheet ────────────────────────── */}
      <Modal visible={showQueue} transparent animationType="slide" onRequestClose={() => setShowQueue(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowQueue(false)}>
          <Pressable style={styles.queueSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.queueHeader}>
              <Text style={styles.sheetTitle}>Now Playing</Text>
              <TouchableOpacity onPress={() => setShowQueue(false)}>
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.queueItem}>
              <View style={styles.queueNum}>
                <Text style={styles.queueNumText}>🔴</Text>
              </View>
              <View style={styles.queueInfo}>
                <Text style={styles.queueSongTitle} numberOfLines={1}>{currentSong?.title}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{currentSong?.artist_name}</Text>
              </View>
            </View>
            <Text style={[styles.emptyQueue, { marginTop: 20 }]}>
              This is live radio — songs are chosen by the station.
              {"\n"}Song {queuePosition + 1} of {queueLength} in today's rotation.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0D0D15',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 12,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.accent,
      letterSpacing: 1.5,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      marginRight: 6,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#EF4444',
    },
    liveText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#EF4444',
      letterSpacing: 0.5,
    },

    // Album Art
    artContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    albumArt: {
      width: width * 0.65,
      height: width * 0.65,
      borderRadius: width * 0.325,
      backgroundColor: '#1a1a2e',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'rgba(212, 165, 116, 0.3)',
    },
    albumArtInner: {
      width: width * 0.4,
      height: width * 0.4,
      borderRadius: width * 0.2,
      backgroundColor: '#16213e',
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverImage: {
      width: width * 0.6,
      height: width * 0.6,
      borderRadius: width * 0.3,
    },
    vinylRing: {
      position: 'absolute',
      width: width * 0.55,
      height: width * 0.55,
      borderRadius: width * 0.275,
      borderWidth: 1,
      borderColor: 'rgba(212, 165, 116, 0.15)',
    },

    // Song Info
    songInfo: {
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 4,
    },
    songTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#F2F2F2',
      textAlign: 'center',
    },
    artistName: {
      fontSize: 16,
      color: theme.colors.accent,
      fontWeight: '500',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    statText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    statDot: {
      color: theme.colors.textTertiary,
    },

    // Progress
    progressContainer: {
      paddingHorizontal: 32,
      marginTop: 28,
    },
    progressBar: {
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: 2,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    timeText: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      fontVariant: ['tabular-nums'],
    },

    // Controls
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      marginTop: 28,
    },
    playBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    donateBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(212, 165, 116, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    premiumBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Queue Toggle
    queueToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 28,
    },
    queueToggleText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },

    // Sheets
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: '#1a1a2e',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#F2F2F2',
      textAlign: 'center',
    },
    sheetSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 20,
      lineHeight: 20,
    },

    // Donation Tiers
    tierBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      gap: 12,
    },
    tierEmoji: {
      fontSize: 24,
    },
    tierLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: '#F2F2F2',
      flex: 1,
    },
    tierArtistShare: {
      fontSize: 13,
      color: theme.colors.accent,
      fontWeight: '500',
    },

    // Queue Sheet
    queueSheet: {
      backgroundColor: '#1a1a2e',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      maxHeight: '65%',
    },
    queueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    queueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 12,
    },
    queueNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueNumText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontWeight: '600',
    },
    queueInfo: {
      flex: 1,
    },
    queueSongTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: '#F2F2F2',
    },
    queueArtist: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
    emptyQueue: {
      textAlign: 'center',
      color: theme.colors.textTertiary,
      marginTop: 40,
      fontSize: 14,
    },
  });
