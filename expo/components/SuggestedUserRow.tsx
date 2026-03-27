import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import FollowButton from './FollowButton';
import Avatar from '@/components/Avatar';
import type { FlockUser } from '@/types';

interface SuggestedUserRowProps {
  user: FlockUser;
  subtitle?: string;
  onDismiss?: (userId: string) => void;
  showDismiss?: boolean;
}

export default function SuggestedUserRow({ user, subtitle, onDismiss, showDismiss = true }: SuggestedUserRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(user.is_following ?? false);

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
        <Avatar url={user.avatar_url} name={user.full_name} size={48} />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
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
