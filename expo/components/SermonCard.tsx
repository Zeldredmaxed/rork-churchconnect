import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play, Eye, Heart, Radio } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import type { Sermon } from '@/types';

interface SermonCardProps {
  sermon: Sermon;
  onPress: (sermon: Sermon) => void;
}

export default function SermonCard({ sermon, onPress }: SermonCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(sermon)} activeOpacity={0.7}>
      <View style={styles.thumbnailContainer}>
        {sermon.thumbnail_url ? (
          <Image source={{ uri: sermon.thumbnail_url }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Play size={28} color={theme.colors.accent} />
          </View>
        )}
        {sermon.is_live && (
          <View style={styles.liveBadge}>
            <Radio size={10} color={theme.colors.white} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        {sermon.duration && !sermon.is_live && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{sermon.duration}</Text>
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Play size={18} color={theme.colors.white} fill={theme.colors.white} />
          </View>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{sermon.title}</Text>
        <Text style={styles.speaker}>{sermon.speaker}</Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Eye size={12} color={theme.colors.textTertiary} />
            <Text style={styles.metaText}>{sermon.view_count}</Text>
          </View>
          <View style={styles.metaItem}>
            <Heart
              size={12}
              color={sermon.is_liked ? theme.colors.error : theme.colors.textTertiary}
              fill={sermon.is_liked ? theme.colors.error : 'transparent'}
            />
            <Text style={styles.metaText}>{sermon.like_count}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(sermon.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  thumbnailContainer: {
    height: 180,
    backgroundColor: theme.colors.surfaceElevated,
    position: 'relative' as const,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  liveBadge: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: theme.colors.white,
    letterSpacing: 1,
  },
  durationBadge: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    color: theme.colors.white,
    fontWeight: '600' as const,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 14,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    lineHeight: 20,
  },
  speaker: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginLeft: 'auto',
  },
});
