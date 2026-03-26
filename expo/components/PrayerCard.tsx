import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { HandHeart, AlertTriangle, CheckCircle2, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import Badge from './Badge';
import type { Prayer } from '@/types';

interface PrayerCardProps {
  prayer: Prayer;
  onPray: (id: string) => void;
  onPress: (prayer: Prayer) => void;
}

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
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function PrayerCard({ prayer, onPray, onPress }: PrayerCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePray = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onPray(prayer.id);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(prayer)} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.badges}>
          <Badge label={categoryLabels[prayer.category] || 'General'} variant="accent" small />
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
        </View>
        <Text style={styles.time}>{formatTimeAgo(prayer.created_at)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>{prayer.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{prayer.description}</Text>

      <View style={styles.footer}>
        <Text style={styles.author}>
          {prayer.is_anonymous ? 'Anonymous' : prayer.author_name}
        </Text>
      </View>

      {prayer.has_prayed && prayer.pray_count > 0 && (
        <View style={styles.socialProof}>
          <Users size={13} color={theme.colors.accent} />
          <Text style={styles.socialProofText}>
            You and {prayer.pray_count - 1 > 0 ? `${prayer.pray_count - 1} other${prayer.pray_count - 1 === 1 ? '' : 's'}` : 'others'} are praying for this
          </Text>
        </View>
      )}

      {!prayer.has_prayed && prayer.pray_count > 0 && (
        <View style={styles.socialProof}>
          <Users size={13} color={theme.colors.textTertiary} />
          <Text style={styles.socialProofTextMuted}>
            {prayer.pray_count} {prayer.pray_count === 1 ? 'person is' : 'people are'} praying for this
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.prayForThisButton, prayer.has_prayed && styles.prayForThisButtonActive]}
        onPress={handlePray}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.prayButtonInner, { transform: [{ scale: scaleAnim }] }]}>
          <HandHeart
            size={18}
            color={prayer.has_prayed ? theme.colors.accent : theme.colors.white}
          />
        </Animated.View>
        <Text style={[styles.prayForThisText, prayer.has_prayed && styles.prayForThisTextActive]}>
          {prayer.has_prayed ? 'Praying' : 'Pray for this'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.errorMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.colors.error,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.successMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  answeredText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.colors.success,
  },
  time: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  author: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  socialProofText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  socialProofTextMuted: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  prayForThisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
  },
  prayForThisButtonActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  prayButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayForThisText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  prayForThisTextActive: {
    color: theme.colors.accent,
  },
});
