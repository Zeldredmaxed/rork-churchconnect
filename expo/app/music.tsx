import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, Alert, Dimensions, Image,
  AppState, Animated, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Play, Pause, SkipForward, SkipBack, Heart, Radio, ChevronDown,
  User, Gift, X, MoreHorizontal, ListMusic, Upload,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ART_SIZE = SCREEN_WIDTH - 64;

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
  const insets = useSafeAreaInsets();
  const soundRef = useRef<Audio.Sound | null>(null);
  const isTransitioningRef = useRef(false);
  const hasInitialLoadRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showDonate, setShowDonate] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number>(0);
  const currentSongIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueLength, setQueueLength] = useState(0);

  const skipQuery = useQuery({
    queryKey: ['music', 'skip-premium'],
    queryFn: () => api.get<{ data: { is_active: boolean; expires_at: string | null } }>('/music/skip-premium/status'),
  });

  useQuery({
    queryKey: ['music', 'artist', 'me'],
    queryFn: () => api.get<{ data: any }>('/music/artist/me'),
  });

  const canSkip = skipQuery.data?.data?.is_active ?? false;

  const donateMutation = useMutation({
    mutationFn: (data: { song_id: number; amount: number }) =>
      api.post('/music/donate', data as any),
    onSuccess: (resp: unknown) => {
      const sent = (resp as any)?.data?.download_email_sent;
      Alert.alert(
        '🙏 Donation Sent!',
        `Thank you for your gift! The artist receives 70%.${sent ? '\n\nA download link has been sent to your email.' : ''}`,
      );
      setShowDonate(false);
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'Donation failed'),
  });

  const skipMutation = useMutation({
    mutationFn: () => api.post('/music/skip-premium', {}),
    onSuccess: () => {
      Alert.alert('👑 Skip Premium Activated!', 'You can now skip songs for 30 days.');
      void queryClient.invalidateQueries({ queryKey: ['music', 'skip-premium'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'Subscription failed'),
  });

  const playMutation = useMutation({
    mutationFn: (songId: number) => api.post(`/music/songs/${songId}/play`, {}),
  });

  const loadAndPlaySong = useCallback(async (song: Song, seekMs: number) => {
    console.log('[Radio] loadAndPlaySong:', song.title, 'seek:', seekMs);
    try {
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch (unloadErr) {
          console.log('[Radio] Non-fatal unload error:', unloadErr);
        }
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: song.audio_url },
        {
          shouldPlay: true,
          positionMillis: seekMs,
          progressUpdateIntervalMillis: 500,
          androidImplementation: 'MediaPlayer',
        },
        onPlaybackStatusUpdate,
      );

      soundRef.current = sound;
      currentSongIdRef.current = song.id;
      setCurrentSong(song);
      setIsPlaying(true);

      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (e) {
      console.log('[Radio] loadAndPlaySong error:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.log('[Radio] Playback error:', status.error);
      }
      return;
    }

    const pos = status.positionMillis || 0;
    const dur = status.durationMillis || 0;
    setProgress(pos);
    if (dur > 0) {
      setDuration(dur);
    }

    if (status.isBuffering) {
      console.log('[Radio] Buffering at position:', Math.floor(pos / 1000), 's');
    }

    if (status.didJustFinish && !isTransitioningRef.current) {
      console.log('[Radio] Song finished naturally at', Math.floor(pos / 1000), 's of', Math.floor(dur / 1000), 's — transitioning...');
      isTransitioningRef.current = true;

      const finishedSongId = currentSongIdRef.current;
      if (finishedSongId) {
        playMutation.mutate(finishedSongId);
      }

      const advanceAndLoad = async () => {
        try {
          await api.post('/music/radio/advance');
        } catch (err) {
          console.log('[Radio] Error advancing:', err);
        }
        currentSongIdRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 500));
        await syncToStation();
        isTransitioningRef.current = false;
      };
      void advanceAndLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const syncToStation = useCallback(async (): Promise<void> => {
    if (isTransitioningRef.current) {
      console.log('[Radio] Sync skipped — transition in progress');
      return;
    }

    try {
      const resp = await api.get<{ data: any }>('/music/stream/radio');
      const data = resp?.data;
      if (!data || (!data.song && !data.current_song)) return;

      const serverSong = (data.song || data.current_song) as Song;
      const elapsedSeconds = data.elapsed_seconds ?? data.position_seconds ?? 0;
      const elapsedMs = Math.floor(elapsedSeconds * 1000);
      const serverDurationSec = data.song_duration_seconds ?? 0;

      setQueuePosition(data.queue_position || 0);
      setQueueLength(data.queue_length || 0);

      if (serverDurationSec > 0 && duration === 0) {
        setDuration(serverDurationSec * 1000);
      }

      // CASE 1: No audio loaded
      if (!currentSongIdRef.current || !soundRef.current) {
        console.log('[Radio] No audio loaded, loading server song:', serverSong.title);
        await loadAndPlaySong(serverSong, elapsedMs);
        hasInitialLoadRef.current = true;
        return;
      }

      // CASE 2: Same song playing
      if (serverSong.id === currentSongIdRef.current) {
        console.log('[Radio] Same song playing, no action needed');
        return;
      }

      // CASE 3 & 4: Server reports different song
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const remaining = (status.durationMillis || 0) - (status.positionMillis || 0);
          if (status.isPlaying || status.isBuffering || remaining > 2000) {
            console.log('[Radio] Server advanced, but audio still playing (' + Math.floor(remaining / 1000) + 's remaining) — letting it finish.');
            return;
          }
        }
      } catch (statusErr) {
        console.log('[Radio] Error checking status, safe to switch:', statusErr);
      }

      // CASE 4: Audio idle/stalled/errored — safe to switch
      console.log('[Radio] Audio idle, switching to server song:', serverSong.title);
      await loadAndPlaySong(serverSong, elapsedMs);
    } catch (e) {
      console.log('[Radio] Sync error:', e);
    }
  }, [duration, loadAndPlaySong]);

  const handlePlayPause = async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (!soundRef.current) {
      void syncToStation();
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

  const handleLike = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLiked(prev => !prev);
  };

  useEffect(() => {
    void syncToStation();

    syncIntervalRef.current = setInterval(() => {
      void syncToStation();
    }, 45_000);

    heartbeatIntervalRef.current = setInterval(() => {
      void api.post('/music/radio/heartbeat', {}).catch(() => {});
    }, 60_000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      void soundRef.current?.unloadAsync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        void syncToStation();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <Animated.View style={styles.loadingIconWrap}>
            <Radio size={56} color={theme.colors.accent} />
          </Animated.View>
          <Text style={styles.loadingText}>Tuning in to Gospel Radio...</Text>
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {currentSong?.cover_url && (
        <Image
          source={{ uri: currentSong.cover_url }}
          style={styles.bgBlur}
          blurRadius={80}
        />
      )}
      <View style={styles.bgOverlay} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronDown size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>PLAYING FROM</Text>
          <Text style={styles.headerStation}>Gospel Radio</Text>
        </View>
        <TouchableOpacity
          onPress={() => setActionMenuVisible(true)}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MoreHorizontal size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.artSection}>
        <Animated.View style={[styles.artShadow, { opacity: fadeAnim }]}>
          {currentSong?.cover_url ? (
            <Image
              source={{ uri: currentSong.cover_url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Radio size={80} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </Animated.View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.songTextWrap}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong?.title || 'No songs available'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (currentSong) router.push(`/user-profile?id=${currentSong.artist_id}` as never);
            }}
          >
            <Text style={styles.artistName} numberOfLines={1}>
              {currentSong?.artist_name || 'Unknown Artist'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLike} style={styles.likeBtn}>
          <Heart
            size={24}
            color={liked ? theme.colors.accent : 'rgba(255,255,255,0.7)'}
            fill={liked ? theme.colors.accent : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <Text style={styles.timeText}>
            -{formatTime(duration > progress ? duration - progress : 0)}
          </Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.sideControl, { opacity: canSkip ? 1 : 0.4 }]}
          onPress={async () => {
            if (isTransitioningRef.current || !canSkip) return;
            isTransitioningRef.current = true;
            try {
              await api.post('/music/radio/advance');
              currentSongIdRef.current = null;
              await new Promise(resolve => setTimeout(resolve, 200));
              await syncToStation();
            } catch (err) {
              console.log('[Radio] Skip back error:', err);
            } finally {
              isTransitioningRef.current = false;
            }
          }}
        >
          <SkipBack size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={handlePlayPause}
            activeOpacity={0.85}
          >
            {isPlaying ? (
              <Pause size={32} color="#000000" fill="#000000" />
            ) : (
              <Play size={32} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.sideControl}
          onPress={() => {
            if (!canSkip) {
              Alert.alert(
                '👑 Skip Premium',
                'Skip any song for $3.99/month.\nNo more waiting — skip freely!',
                [
                  { text: 'Not Now', style: 'cancel' },
                  { text: 'Subscribe $3.99/mo', onPress: () => skipMutation.mutate() },
                ],
              );
            } else {
              if (isTransitioningRef.current) return;
              isTransitioningRef.current = true;
              api.post('/music/radio/advance')
                .then(() => {
                  currentSongIdRef.current = null;
                  return new Promise(resolve => setTimeout(resolve, 200));
                })
                .then(() => syncToStation())
                .catch(err => console.log('[Radio] Skip forward error:', err))
                .finally(() => { isTransitioningRef.current = false; });
            }
          }}
        >
          <SkipForward size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.bottomAction}
          onPress={() => setActionMenuVisible(true)}
        >
          <MoreHorizontal size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomAction}
          onPress={() => setShowQueue(true)}
        >
          <ListMusic size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomAction}
          onPress={() => setShowDonate(true)}
        >
          <Gift size={22} color={theme.colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomAction}
          onPress={() => router.push('/upload-song' as never)}
        >
          <Upload size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      <View style={styles.liveTag}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
        <Text style={styles.liveInfo}>
          Song {queuePosition + 1} of {queueLength}
        </Text>
      </View>

      {/* Action Menu */}
      <Modal visible={actionMenuVisible} transparent animationType="slide" onRequestClose={() => setActionMenuVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setActionMenuVisible(false)}>
          <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.actionSheetHeader}>
              {currentSong?.cover_url ? (
                <Image source={{ uri: currentSong.cover_url as string }} style={styles.actionSheetImg} />
              ) : (
                <View style={styles.actionSheetImgPlaceholder}>
                  <Radio size={24} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={styles.actionSheetTextWrap}>
                <Text style={styles.actionSheetTitle} numberOfLines={1}>{currentSong?.title}</Text>
                <Text style={styles.actionSheetArtist} numberOfLines={1}>{currentSong?.artist_name}</Text>
              </View>
            </View>
            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={() => { handleLike(); setActionMenuVisible(false); }}>
              <Heart size={22} color={liked ? theme.colors.accent : '#FFFFFF'} fill={liked ? theme.colors.accent : 'transparent'} />
              <Text style={styles.actionRowText}>{liked ? 'Unlike' : 'Like'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { setActionMenuVisible(false); router.push(`/user-profile?id=${currentSong?.artist_id}` as never); }}>
              <User size={22} color="#FFFFFF" />
              <Text style={styles.actionRowText}>View Artist</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { setActionMenuVisible(false); setShowQueue(true); }}>
              <ListMusic size={22} color="#FFFFFF" />
              <Text style={styles.actionRowText}>Up Next</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { setActionMenuVisible(false); setShowDonate(true); }}>
              <Gift size={22} color={theme.colors.accent} />
              <Text style={[styles.actionRowText, { color: theme.colors.accent }]}>Donate / Support Artist</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => { setActionMenuVisible(false); router.push('/upload-song' as never); }}>
              <Upload size={22} color="#FFFFFF" />
              <Text style={styles.actionRowText}>Upload a Song</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActionMenuVisible(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Donation Sheet */}
      <Modal visible={showDonate} transparent animationType="slide" onRequestClose={() => setShowDonate(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowDonate(false)}>
          <Pressable style={styles.donateSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.donateTitle}>Bless This Artist 🙏</Text>
            <Text style={styles.donateSubtitle}>
              Your donation supports {currentSong?.artist_name}. They receive 70% of every gift.
              You'll also get this song sent to your email!
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
                <View style={styles.tierTextWrap}>
                  <Text style={styles.tierLabel}>{tier.label}</Text>
                  <Text style={styles.tierShare}>Artist gets ${(tier.amount * 0.7).toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {donateMutation.isPending && (
              <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginTop: 12 }} />
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDonate(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Queue Sheet */}
      <Modal visible={showQueue} transparent animationType="slide" onRequestClose={() => setShowQueue(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowQueue(false)}>
          <Pressable style={styles.queueSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.queueHeader}>
              <Text style={styles.queueTitle}>Now Playing</Text>
              <TouchableOpacity onPress={() => setShowQueue(false)}>
                <X size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <View style={styles.queueItem}>
              <View style={styles.queueLiveDot}>
                <View style={styles.queueLiveDotInner} />
              </View>
              {currentSong?.cover_url ? (
                <Image source={{ uri: currentSong.cover_url as string }} style={styles.queueCover} />
              ) : (
                <View style={[styles.queueCover, styles.queueCoverPlaceholder]}>
                  <Radio size={16} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={styles.queueInfo}>
                <Text style={styles.queueSongTitle} numberOfLines={1}>{currentSong?.title}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{currentSong?.artist_name}</Text>
              </View>
            </View>
            <View style={styles.queueDivider} />
            <Text style={styles.queueNote}>
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
      backgroundColor: '#0A0A0A',
    },
    bgBlur: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      opacity: 0.45,
    },
    bgOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(212,165,116,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 12,
      fontWeight: '500' as const,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      zIndex: 10,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerLabel: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: 1.5,
      textTransform: 'uppercase' as const,
    },
    headerStation: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      marginTop: 2,
    },

    artSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    artShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 20,
    },
    coverImage: {
      width: ART_SIZE,
      height: ART_SIZE,
      borderRadius: 12,
    },
    coverPlaceholder: {
      width: ART_SIZE,
      height: ART_SIZE,
      borderRadius: 12,
      backgroundColor: '#1E1E1E',
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 28,
      marginTop: 24,
    },
    songTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    songTitle: {
      fontSize: 22,
      fontWeight: '800' as const,
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    artistName: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.6)',
      fontWeight: '500' as const,
      marginTop: 4,
    },
    likeBtn: {
      padding: 8,
    },

    progressWrap: {
      paddingHorizontal: 28,
      marginTop: 24,
    },
    progressTrack: {
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 2,
      position: 'relative' as const,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 2,
      position: 'absolute' as const,
      left: 0,
    },
    progressThumb: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#FFFFFF',
      position: 'absolute' as const,
      top: -5,
      marginLeft: -7,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    timeText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      fontVariant: ['tabular-nums'],
      fontWeight: '500' as const,
    },

    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 48,
      marginTop: 20,
    },
    sideControl: {
      padding: 8,
    },
    playBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 40,
      marginTop: 24,
    },
    bottomAction: {
      padding: 10,
    },

    liveTag: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingBottom: 32,
      marginTop: 8,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FF4444',
    },
    liveText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: '#FF4444',
      letterSpacing: 1,
    },
    liveInfo: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.4)',
      fontWeight: '500' as const,
    },

    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignSelf: 'center',
      marginBottom: 20,
    },

    actionSheet: {
      backgroundColor: '#1A1A1A',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    actionSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    actionSheetImg: {
      width: 52,
      height: 52,
      borderRadius: 6,
    },
    actionSheetImgPlaceholder: {
      width: 52,
      height: 52,
      borderRadius: 6,
      backgroundColor: '#2A2A2A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionSheetTextWrap: {
      marginLeft: 14,
      flex: 1,
    },
    actionSheetTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    actionSheetArtist: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 3,
    },
    actionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginBottom: 8,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      gap: 16,
    },
    actionRowText: {
      fontSize: 16,
      color: '#FFFFFF',
      fontWeight: '500' as const,
    },
    cancelBtn: {
      alignItems: 'center',
      paddingVertical: 16,
      marginTop: 8,
    },
    cancelText: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.5)',
      fontWeight: '600' as const,
    },

    donateSheet: {
      backgroundColor: '#1A1A1A',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },
    donateTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    donateSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.5)',
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
      lineHeight: 20,
    },
    tierBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      gap: 14,
    },
    tierEmoji: {
      fontSize: 26,
    },
    tierTextWrap: {
      flex: 1,
    },
    tierLabel: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    tierShare: {
      fontSize: 13,
      color: theme.colors.accent,
      fontWeight: '500' as const,
      marginTop: 2,
    },

    queueSheet: {
      backgroundColor: '#1A1A1A',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    queueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    queueTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    queueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    queueLiveDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,68,68,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueLiveDotInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF4444',
    },
    queueCover: {
      width: 44,
      height: 44,
      borderRadius: 6,
    },
    queueCoverPlaceholder: {
      backgroundColor: '#2A2A2A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueInfo: {
      flex: 1,
    },
    queueSongTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    queueArtist: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 2,
    },
    queueDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginVertical: 16,
    },
    queueNote: {
      textAlign: 'center',
      color: 'rgba(255,255,255,0.4)',
      fontSize: 14,
      lineHeight: 20,
    },
  });
