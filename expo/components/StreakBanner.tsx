import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Flame, Trophy, Calendar } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { LoginStreak } from '@/types';

export default function StreakBanner() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const flameScale = useRef(new Animated.Value(0.8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const streakQuery = useQuery({
    queryKey: ['login-streak'],
    queryFn: async () => {
      const res = await api.get<{ data: LoginStreak }>('/auth/streak');
      console.log('[Streak] Response:', JSON.stringify(res));
      return res?.data ?? null;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(flameScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flameScale, fadeIn]);

  const streak = streakQuery.data;
  if (!streak || streakQuery.isLoading) return null;

  const isPersonalBest = streak.current_streak > 0 && streak.current_streak >= streak.longest_streak;
  const hasStreak = streak.current_streak > 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      <View style={styles.topRow}>
        <View style={styles.flameSection}>
          <Animated.View style={[styles.flameWrap, { transform: [{ scale: flameScale }] }]}>
            <View style={[styles.flameBg, hasStreak ? styles.flameBgActive : styles.flameBgInactive]}>
              <Flame
                size={22}
                color={hasStreak ? '#FF6B35' : theme.colors.textTertiary}
                fill={hasStreak ? '#FF6B35' : 'none'}
              />
            </View>
          </Animated.View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakNumber}>
              {hasStreak ? `${streak.current_streak}-day streak` : 'Start a streak!'}
            </Text>
            {isPersonalBest && (
              <View style={styles.bestBadge}>
                <Trophy size={10} color="#FFB800" />
                <Text style={styles.bestBadgeText}>Personal Best!</Text>
              </View>
            )}
            {!hasStreak && (
              <Text style={styles.streakSubtext}>Log in tomorrow to begin</Text>
            )}
          </View>
        </View>
        <View style={styles.statsCompact}>
          <View style={styles.statPill}>
            <Calendar size={11} color={theme.colors.textTertiary} />
            <Text style={styles.statPillText}>{streak.total_logins} visits</Text>
          </View>
          {streak.longest_streak > 0 && !isPersonalBest && (
            <View style={styles.statPill}>
              <Flame size={11} color={theme.colors.textTertiary} />
              <Text style={styles.statPillText}>Best: {streak.longest_streak}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flameWrap: {},
  flameBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameBgActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  flameBgInactive: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  streakInfo: {
    flex: 1,
    gap: 2,
  },
  streakNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  streakSubtext: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFB800',
  },
  statsCompact: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
  },
});
