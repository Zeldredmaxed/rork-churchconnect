import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import Badge from './Badge';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onPress: (event: Event) => void;
}

const typeBadgeVariant: Record<string, 'accent' | 'info' | 'warning' | 'success'> = {
  service: 'accent',
  event: 'info',
  meeting: 'warning',
  conference: 'success',
};

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventCard({ event, onPress }: EventCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={styles.dateStrip}>
        <Text style={styles.dateMonth}>
          {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
        </Text>
        <Text style={styles.dateDay}>{new Date(event.start_date).getDate()}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Badge
            label={event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            variant={typeBadgeVariant[event.type] || 'accent'}
            small
          />
          {event.status === 'cancelled' && <Badge label="Cancelled" variant="error" small />}
        </View>

        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Calendar size={13} color={theme.colors.textTertiary} />
            <Text style={styles.detailText}>
              {formatDate(event.start_date)} at {formatTime(event.start_date)}
            </Text>
          </View>
          {event.location ? (
            <View style={styles.detailRow}>
              <MapPin size={13} color={theme.colors.textTertiary} />
              <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.rsvpInfo}>
            <Users size={13} color={theme.colors.accent} />
            <Text style={styles.rsvpText}>
              {event.rsvp_count}{event.max_capacity ? `/${event.max_capacity}` : ''} going
            </Text>
          </View>
          {event.is_rsvped && (
            <View style={styles.rsvpBadge}>
              <Text style={styles.rsvpBadgeText}>RSVP'd</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  dateStrip: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentMuted,
    paddingVertical: 14,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.accent,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rsvpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  rsvpBadge: {
    backgroundColor: theme.colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rsvpBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.success,
  },
});
