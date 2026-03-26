import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import FollowButton from './FollowButton';
import type { FlockUser } from '@/types';

interface SuggestedUserRowProps {
  user: FlockUser;
  subtitle?: string;
  onDismiss?: (userId: string) => void;
  showDismiss?: boolean;
}

export default function SuggestedUserRow({ user, subtitle, onDismiss, showDismiss = true }: SuggestedUserRowProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.is_following ?? false);

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/user-profile?id=${user.id}` as never);
        }}
        activeOpacity={0.6}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.userName} numberOfLines={1}>{user.full_name}</Text>
          <Text style={styles.userSubtitle} numberOfLines={1}>
            {subtitle ?? (user.church_name ? user.church_name : 'Suggested for you')}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <FollowButton
          userId={user.id}
          isFollowing={isFollowing}
          size="medium"
          onToggle={(newState) => setIsFollowing(newState)}
        />
        {showDismiss && onDismiss && (
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => onDismiss(user.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  textContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  userSubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dismissBtn: {
    padding: 4,
  },
});
