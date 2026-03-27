import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, ActivityIndicator, Platform, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { Animated } from 'react-native';

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
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
      setHasError(false);
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

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load video</Text>
        <Text style={styles.errorSubtext}>Please try again later</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={togglePlayPause}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
          usePoster={!!thumbnailUrl}
          posterStyle={styles.poster}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isVisible}
          isMuted={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(error) => {
            console.log('[ShortVideoPlayer] Video error:', error);
            setHasError(true);
          }}
          {...(Platform.OS === 'web' ? { useNativeControls: false } : {})}
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
