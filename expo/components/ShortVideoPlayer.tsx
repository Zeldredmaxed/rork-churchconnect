import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, ActivityIndicator, Platform, Text, Animated } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';

interface ShortVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  isVisible: boolean;
}

export default function ShortVideoPlayer({ videoUrl, thumbnailUrl, isVisible }: ShortVideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.log('[ShortVideoPlayer] Audio mode setup error:', e);
      }
    };
    void setupAudio();
  }, []);

  const handleRetry = useCallback(() => {
    console.log('[ShortVideoPlayer] Retrying video load, attempt:', retryCount + 1);
    setHasError(false);
    setRetryCount((c) => c + 1);
  }, [retryCount]);

  if (hasError) {
    return (
      <TouchableWithoutFeedback onPress={handleRetry}>
        <View style={styles.errorContainer}>
          <Play size={36} color="rgba(255,255,255,0.5)" />
          <Text style={styles.errorText}>Unable to load video</Text>
          <Text style={styles.errorSubtext}>Tap to retry</Text>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  if (isVisible) {
    return (
      <ActiveVideoPlayer
        videoUrl={videoUrl}
        thumbnailUrl={thumbnailUrl}
        retryCount={retryCount}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.placeholder} />
    </View>
  );
}

interface ActiveVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  retryCount: number;
  onError: () => void;
}

function ActiveVideoPlayer({ videoUrl, thumbnailUrl, retryCount, onError }: ActiveVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[ShortVideoPlayer] ActiveVideoPlayer mounted for:', videoUrl.slice(0, 60));
    const currentRef = videoRef.current;
    return () => {
      console.log('[ShortVideoPlayer] ActiveVideoPlayer unmounting, destroying video:', videoUrl.slice(0, 60));
      if (currentRef) {
        currentRef.setStatusAsync({ shouldPlay: false, volume: 0, isMuted: true }).catch(() => {});
        currentRef.stopAsync().catch(() => {});
        currentRef.unloadAsync().catch(() => {});
      }
    };
  }, [videoUrl]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
    } else if ('error' in status && status.error) {
      console.log('[ShortVideoPlayer] Playback error:', status.error);
      onError();
    }
  }, [onError]);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
        Animated.sequence([
          Animated.timing(pauseIconOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(pauseIconOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    } catch (error) {
      console.log('[ShortVideoPlayer] Toggle play/pause error:', error);
    }
  }, [pauseIconOpacity]);

  return (
    <TouchableWithoutFeedback onPress={togglePlayPause}>
      <View style={styles.container}>
        <Video
          key={`video-${retryCount}`}
          ref={videoRef}
          source={{ uri: videoUrl }}
          posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
          usePoster={!!thumbnailUrl}
          posterStyle={styles.poster}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping={true}
          shouldPlay={true}
          isMuted={false}
          volume={1.0}
          rate={1.0}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={() => {
            console.log('[ShortVideoPlayer] Video loaded successfully:', videoUrl.slice(0, 80));
            setIsBuffering(false);
          }}
          onError={(error) => {
            console.log('[ShortVideoPlayer] Video error:', error, 'URL:', videoUrl.slice(0, 80));
            onError();
          }}
          {...(Platform.OS === 'web' ? { useNativeControls: true } : {})}
        />

        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          </View>
        )}

        <Animated.View style={[styles.pauseIconContainer, { opacity: pauseIconOpacity }]} pointerEvents="none">
          <View style={styles.pauseIconBg}>
            {isPlaying ? (
              <Pause size={32} color="#fff" fill="#fff" />
            ) : (
              <Play size={32} color="#fff" fill="#fff" />
            )}
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  poster: {
    flex: 1,
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#000',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pauseIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  errorSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
});
