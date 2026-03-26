import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  size?: 'small' | 'medium' | 'large';
  onToggle?: (newState: boolean) => void;
}

export default function FollowButton({ userId, isFollowing, size = 'medium', onToggle }: FollowButtonProps) {
  const queryClient = useQueryClient();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        console.log('[Follow] Unfollowing user:', userId);
        return api.delete(`/social/flock/${userId}`);
      } else {
        console.log('[Follow] Following user:', userId);
        return api.post(`/social/flock/${userId}`);
      }
    },
    onSuccess: () => {
      console.log('[Follow] Toggle success, new state:', !isFollowing);
      void queryClient.invalidateQueries({ queryKey: ['flock'] });
      void queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      void queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onToggle?.(!isFollowing);
    },
    onError: (error) => {
      console.log('[Follow] Toggle error:', error.message);
    },
  });

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, friction: 5 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    followMutation.mutate();
  };

  const sizeStyles = {
    small: { paddingHorizontal: 14, paddingVertical: 5, fontSize: 12 },
    medium: { paddingHorizontal: 20, paddingVertical: 7, fontSize: 13 },
    large: { paddingHorizontal: 28, paddingVertical: 9, fontSize: 15 },
  };

  const currentSize = sizeStyles[size];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          isFollowing ? styles.followingButton : styles.followButton,
          { paddingHorizontal: currentSize.paddingHorizontal, paddingVertical: currentSize.paddingVertical },
        ]}
        onPress={handlePress}
        disabled={followMutation.isPending}
        activeOpacity={0.7}
      >
        {followMutation.isPending ? (
          <ActivityIndicator size="small" color={isFollowing ? theme.colors.textSecondary : '#FFF'} />
        ) : (
          <Text
            style={[
              styles.buttonText,
              isFollowing ? styles.followingText : styles.followText,
              { fontSize: currentSize.fontSize },
            ]}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  followButton: {
    backgroundColor: '#0095F6',
  },
  followingButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  followText: {
    color: '#FFFFFF',
  },
  followingText: {
    color: theme.colors.text,
  },
});
