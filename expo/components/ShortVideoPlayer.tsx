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
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

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

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
      setHasError(false);

      if (status.didJustFinish && !status.isLooping) {
        console.log('[ShortVideoPlayer] Video finished, replaying...');
        videoRef.current?.replayAsync().catch(() => {});
      }
    } else if ('error' in status && status.error) {
      console.log('[ShortVideoPlayer] Playback error:', status.error);
      setHasError(true);
      setIsBuffering(false);
    }
  }, []);

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

  React.useEffect(() => {
    if (!videoRef.current) return;

    const updatePlayback = async () => {
      try {
        const status = await videoRef.current?.getStatusAsync();
        if (!status?.isLoaded) return;

        if (isVisible && !status.isPlaying) {
          await videoRef.current?.playAsync();
        } else if (!isVisible && status.isPlaying) {
          await videoRef.current?.pauseAsync();
          await videoRef.current?.setPositionAsync(0);
        }
      } catch (error) {
        console.log('[ShortVideoPlayer] Visibility change error:', error);
      }
    };

    void updatePlayback();
  }, [isVisible]);

  const handleRetry = useCallback(() => {
    console.log('[ShortVideoPlayer] Retrying video load, attempt:', retryCount + 1);
    setHasError(false);
    setIsBuffering(true);
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
          shouldPlay={isVisible}
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
            setHasError(true);
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
