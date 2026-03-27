import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Alert } from 'react-native';
import { Heart, MessageCircle, MoreVertical, AlertTriangle, CheckCircle2, Flag, Trash2, PartyPopper } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { Prayer } from '@/types';

interface PrayerCardProps {
  prayer: Prayer;
  onPray: (id: string) => void;
  onPress: (prayer: Prayer) => void;
  onMarkFulfilled?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  isOwner?: boolean;
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'JUST NOW';
  if (diff < 3600) return `${Math.floor(diff / 60)} MIN AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} HOURS AGO`;
  if (diff < 172800) return 'YESTERDAY';
  if (diff < 604800) return `${Math.floor(diff / 86400)} DAYS AGO`;
  return d.toLocaleDateString().toUpperCase();
}

function getPrayerContent(prayer: Prayer): { title: string; description: string } {
  const raw = prayer as unknown as Record<string, unknown>;
  const title = (prayer.title || raw.subject || raw.name || raw.request_title || 'Prayer Request') as string;
  const description = (prayer.description || raw.body || raw.content || raw.request || raw.message || raw.text || '') as string;
  return { title, description };
}

export default function PrayerCard({ prayer, onPray, onPress, onMarkFulfilled, onDelete, onReport, isOwner }: PrayerCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showMenu, setShowMenu] = useState(false);
  const [localHasPrayed, setLocalHasPrayed] = useState<boolean | null>(null);
  const [localPrayCount, setLocalPrayCount] = useState<number | null>(null);

  const { description } = getPrayerContent(prayer);
  const prayCount = localPrayCount ?? prayer.pray_count ?? 0;
  const hasPrayed = localHasPrayed ?? prayer.has_prayed ?? false;
  const authorName = prayer.is_anonymous ? 'Anonymous' : (prayer.author_name || 'Member');
  const responseCount = prayer.response_count ?? 0;

  const handlePray = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, friction: 3 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();

    const newHasPrayed = !hasPrayed;
    setLocalHasPrayed(newHasPrayed);
    setLocalPrayCount(newHasPrayed ? prayCount + 1 : Math.max(0, prayCount - 1));
    onPray(prayer.id);
  };

  const handleMorePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(true);
  };

  const handleMarkFulfilled = () => {
    setShowMenu(false);
    if (onMarkFulfilled) {
      Alert.alert(
        'Prayer Fulfilled',
        'Mark this prayer as fulfilled? Everyone who prayed will be notified. Thank you for sharing!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Fulfilled!',
            onPress: () => onMarkFulfilled(prayer.id),
          },
        ]
      );
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (onDelete) {
      Alert.alert(
        'Delete Prayer',
        'Are you sure you want to delete this prayer request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete(prayer.id),
          },
        ]
      );
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    if (onReport) {
      onReport(prayer.id);
    }
  };

  const initials = authorName
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => onPress(prayer)} activeOpacity={0.85}>
        {(prayer.is_urgent || prayer.is_answered) && (
          <View style={styles.badgeRow}>
            {prayer.is_urgent && (
              <View style={styles.urgentBadge}>
                <AlertTriangle size={10} color={theme.colors.error} />
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
            {prayer.is_answered && (
              <View style={styles.answeredBadge}>
                <CheckCircle2 size={10} color={theme.colors.success} />
                <Text style={styles.answeredText}>Fulfilled</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(prayer.created_at)}</Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleMorePress}
          >
            <MoreVertical size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.prayerText}>{description || prayer.title}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.prayButton, hasPrayed && styles.prayButtonActive]}
            onPress={handlePray}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Heart
                size={16}
                color={hasPrayed ? theme.colors.accent : theme.colors.textTertiary}
                fill={hasPrayed ? theme.colors.accent : 'none'}
              />
            </Animated.View>
            <Text style={[styles.prayButtonText, hasPrayed && styles.prayButtonTextActive]}>
              {hasPrayed ? 'Praying' : 'Pray'}
            </Text>
            {prayCount > 0 && (
              <Text style={[styles.prayCount, hasPrayed && styles.prayCountActive]}>
                {prayCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.messagesLink} onPress={() => onPress(prayer)}>
            <MessageCircle size={14} color={theme.colors.textTertiary} />
            {responseCount > 0 ? (
              <Text style={styles.messagesText}>Messages ({responseCount})</Text>
            ) : (
              <Text style={styles.messagesTextMuted}>Add a comment</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />

            {isOwner && !prayer.is_answered && (
              <TouchableOpacity style={styles.menuItem} onPress={handleMarkFulfilled} activeOpacity={0.7}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme.colors.successMuted }]}>
                  <PartyPopper size={18} color={theme.colors.success} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Prayer Fulfilled</Text>
                  <Text style={styles.menuItemDesc}>Let everyone know this prayer was answered</Text>
                </View>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete} activeOpacity={0.7}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme.colors.errorMuted }]}>
                  <Trash2 size={18} color={theme.colors.error} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.error }]}>Delete Prayer</Text>
                  <Text style={styles.menuItemDesc}>Remove this prayer request</Text>
                </View>
              </TouchableOpacity>
            )}

            {!isOwner && (
              <TouchableOpacity style={styles.menuItem} onPress={handleReport} activeOpacity={0.7}>
                <View style={[styles.menuIconWrap, { backgroundColor: theme.colors.errorMuted }]}>
                  <Flag size={18} color={theme.colors.error} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Report</Text>
                  <Text style={styles.menuItemDesc}>Report this prayer request</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuCancelBtn}
              onPress={() => setShowMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.errorMuted,
    paddingHorizontal: 8,
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
    gap: 4,
    backgroundColor: theme.colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  answeredText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.success,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 1,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.3,
  },
  moreButton: {
    padding: 4,
  },
  prayerText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 23,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
  },
  prayButtonActive: {
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  prayButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
  },
  prayButtonTextActive: {
    color: theme.colors.accent,
  },
  prayCount: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: theme.colors.textTertiary,
  },
  prayCountActive: {
    color: theme.colors.accent,
  },
  messagesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  messagesText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
  },
  messagesTextMuted: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
    fontStyle: 'italic' as const,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
    alignSelf: 'center',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  menuItemDesc: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  menuCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
});
