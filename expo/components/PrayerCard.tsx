import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { HandHeart, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { Prayer } from '@/types';

interface PrayerCardProps {
  prayer: Prayer;
  onPray: (id: string) => void;
  onPress: (prayer: Prayer) => void;
}

const categoryEmojis: Record<string, string> = {
  general: '🙏',
  health: '💊',
  family: '👨‍👩‍👧‍👦',
  financial: '💰',
  spiritual: '✝️',
};

const categoryLabels: Record<string, string> = {
  general: 'General',
  health: 'Health',
  family: 'Family',
  financial: 'Financial',
  spiritual: 'Spiritual',
};

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function getPrayerContent(prayer: Prayer): { title: string; description: string } {
  const raw = prayer as unknown as Record<string, unknown>;
  const title = (prayer.title || raw.subject || raw.name || raw.request_title || 'Prayer Request') as string;
  const description = (prayer.description || raw.body || raw.content || raw.request || raw.message || raw.text || '') as string;
  return { title, description };
}

export default function PrayerCard({ prayer, onPray, onPress }: PrayerCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { title, description } = getPrayerContent(prayer);
  const prayCount = prayer.pray_count ?? 0;
  const hasPrayed = prayer.has_prayed ?? false;
  const authorName = prayer.is_anonymous ? 'Anonymous' : (prayer.author_name || 'Member');
  const category = prayer.category || 'general';
  const emoji = categoryEmojis[category] || '🙏';

  const handlePray = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onPray(prayer.id);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(prayer)} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryEmoji}>{emoji}</Text>
          <Text style={styles.categoryLabel}>{categoryLabels[category] || 'General'}</Text>
        </View>
        <View style={styles.topRight}>
          {prayer.is_urgent && (
            <View style={styles.urgentBadge}>
              <AlertTriangle size={10} color={theme.colors.error} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
          {prayer.is_answered && (
            <View style={styles.answeredBadge}>
              <CheckCircle2 size={10} color={theme.colors.success} />
              <Text style={styles.answeredText}>Answered</Text>
            </View>
          )}
          <Text style={styles.time}>{formatTimeAgo(prayer.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{title}</Text>

      {description ? (
        <Text style={styles.description} numberOfLines={3}>{description}</Text>
      ) : null}

      <View style={styles.authorRow}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorInitial}>
            {authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.authorName}>{authorName}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.prayButton, hasPrayed && styles.prayButtonActive]}
          onPress={handlePray}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <HandHeart
              size={18}
              color={hasPrayed ? theme.colors.accent : theme.colors.white}
            />
          </Animated.View>
          <Text style={[styles.prayButtonText, hasPrayed && styles.prayButtonTextActive]}>
            {hasPrayed ? 'Praying' : 'Pray'}
          </Text>
          {prayCount > 0 && (
            <View style={[styles.countBadge, hasPrayed && styles.countBadgeActive]}>
              <Text style={[styles.countText, hasPrayed && styles.countTextActive]}>
                {prayCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.errorMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.error,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.successMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  answeredText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.success,
  },
  time: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginBottom: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  authorName: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '500' as const,
  },
  actionRow: {
    marginTop: 14,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
  },
  prayButtonActive: {
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  prayButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  prayButtonTextActive: {
    color: theme.colors.accent,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: theme.colors.accent,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.white,
  },
  countTextActive: {
    color: theme.colors.white,
  },
});
