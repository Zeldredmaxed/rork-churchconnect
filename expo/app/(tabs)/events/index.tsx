import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import {
  MapPin,
  Users,
  Clock,
  Bookmark,
  BookmarkCheck,
  Check,
  CalendarCheck,
  CalendarClock,
  History,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useSaved } from '@/contexts/SavedContext';
import EmptyState from '@/components/EmptyState';
import Badge from '@/components/Badge';
import type { Event } from '@/types';

type EventFilter = 'upcoming' | 'past' | 'bookmarked';

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

function getRelativeDate(date: string): string {
  const now = new Date();
  const eventDate = new Date(date);
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -1) return 'Yesterday';
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(date);
}

function FilterTab({
  label,
  icon,
  active,
  onPress,
  theme,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  theme: AppTheme;
}) {
  const styles = createStyles(theme);
  return (
    <TouchableOpacity
      style={[styles.filterTab, active && styles.filterTabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EnhancedEventCard({
  event,
  onPress,
  onRsvp,
  onBookmark,
  isBookmarked,
  isRsvping,
  theme,
}: {
  event: Event;
  onPress: () => void;
  onRsvp: () => void;
  onBookmark: () => void;
  isBookmarked: boolean;
  isRsvping: boolean;
  theme: AppTheme;
}) {
  const styles = createStyles(theme);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isPast = new Date(event.end_date) < new Date();

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const eventMonth = new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const eventDay = new Date(event.start_date).getDate();
  const relativeLabel = getRelativeDate(event.start_date);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.eventCard, isPast && styles.eventCardPast]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        testID={`event-card-${event.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateMonth}>{eventMonth}</Text>
            <Text style={styles.dateDay}>{eventDay}</Text>
          </View>

          <View style={styles.cardHeaderRight}>
            <View style={styles.badgeRow}>
              <Badge
                label={event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : 'Event'}
                variant={typeBadgeVariant[event.type ?? 'event'] || 'accent'}
                small
              />
              {event.status === 'cancelled' && <Badge label="Cancelled" variant="error" small />}
              {!isPast && relativeLabel && (
                <View style={styles.relativeBadge}>
                  <Text style={styles.relativeText}>{relativeLabel}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBookmark();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`bookmark-event-${event.id}`}
            >
              {isBookmarked ? (
                <BookmarkCheck size={20} color={theme.colors.accent} />
              ) : (
                <Bookmark size={20} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.eventTitle, isPast && styles.eventTitlePast]} numberOfLines={2}>
          {event.title}
        </Text>

        {event.description ? (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}

        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Clock size={14} color={theme.colors.textTertiary} />
            <Text style={styles.metaText}>
              {formatDate(event.start_date)} · {formatTime(event.start_date)}
            </Text>
          </View>
          {event.location ? (
            <View style={styles.metaItem}>
              <MapPin size={14} color={theme.colors.textTertiary} />
              <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.attendeeInfo}>
            <Users size={14} color={theme.colors.accent} />
            <Text style={styles.attendeeText}>
              {event.rsvp_count}{event.max_capacity ? ` / ${event.max_capacity}` : ''} going
            </Text>
          </View>

          {event.status !== 'cancelled' && !isPast && (
            <TouchableOpacity
              style={[
                styles.rsvpChip,
                event.is_rsvped && styles.rsvpChipActive,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRsvp();
              }}
              disabled={isRsvping}
              activeOpacity={0.7}
              testID={`rsvp-event-${event.id}`}
            >
              {isRsvping ? (
                <ActivityIndicator size="small" color={event.is_rsvped ? theme.colors.success : theme.colors.accent} />
              ) : (
                <>
                  {event.is_rsvped ? (
                    <Check size={14} color={theme.colors.success} />
                  ) : (
                    <CalendarCheck size={14} color={theme.colors.accent} />
                  )}
                  <Text style={[styles.rsvpChipText, event.is_rsvped && styles.rsvpChipTextActive]}>
                    {event.is_rsvped ? "Going" : "RSVP"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isPast && (
            <View style={styles.pastChip}>
              <Text style={styles.pastChipText}>Past</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function EventsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isItemSaved, toggleSave } = useSaved();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [rsvpingId, setRsvpingId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<Event[] | { data: Event[] }>('/events'),
  });

  const rsvpMutation = useMutation({
    mutationFn: (eventId: string) => api.post(`/events/${eventId}/rsvp`),
    onMutate: (eventId) => {
      setRsvpingId(eventId);
    },
    onSuccess: (_data, eventId) => {
      console.log('[Events] RSVP toggled for event:', eventId);
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: (error) => {
      console.log('[Events] RSVP error:', error.message);
    },
    onSettled: () => {
      setRsvpingId(null);
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['events'] });
  }, [queryClient]);

  const allEvents = useMemo(() => {
    const raw = eventsQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: Event[] }).data)) return (raw as { data: Event[] }).data;
    return [];
  }, [eventsQuery.data]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    let filtered: Event[];

    switch (filter) {
      case 'upcoming':
        filtered = allEvents.filter((e) => new Date(e.end_date) >= now && e.status !== 'cancelled');
        return filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      case 'past':
        filtered = allEvents.filter((e) => new Date(e.end_date) < now || e.status === 'completed');
        return filtered.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      case 'bookmarked':
        return allEvents.filter((e) => isItemSaved(String(e.id), 'event'));
      default:
        return allEvents;
    }
  }, [allEvents, filter, isItemSaved]);

  const handleBookmark = useCallback((event: Event) => {
    toggleSave({
      itemId: String(event.id),
      itemType: 'event',
      title: event.title,
      preview: event.description?.slice(0, 150) ?? '',
      authorName: '',
      authorId: '',
    });
  }, [toggleSave]);

  const handleRsvp = useCallback((eventId: string) => {
    rsvpMutation.mutate(eventId);
  }, [rsvpMutation]);

  const upcomingCount = useMemo(() => {
    const now = new Date();
    return allEvents.filter((e) => new Date(e.end_date) >= now && e.status !== 'cancelled').length;
  }, [allEvents]);

  const emptyConfig = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return {
          icon: <CalendarClock size={28} color={theme.colors.textTertiary} />,
          title: 'No upcoming events',
          description: 'Check back later for new events from your church',
        };
      case 'past':
        return {
          icon: <History size={28} color={theme.colors.textTertiary} />,
          title: 'No past events',
          description: 'Past events will appear here',
        };
      case 'bookmarked':
        return {
          icon: <Bookmark size={28} color={theme.colors.textTertiary} />,
          title: 'No bookmarked events',
          description: 'Tap the bookmark icon on events to save them here',
        };
    }
  }, [filter, theme]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Events</Text>
              {upcomingCount > 0 && (
                <View style={styles.headerCount}>
                  <Text style={styles.headerCountText}>{upcomingCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <View style={styles.filterRow}>
        <FilterTab
          label="Upcoming"
          icon={<CalendarClock size={15} color={filter === 'upcoming' ? theme.colors.accent : theme.colors.textTertiary} />}
          active={filter === 'upcoming'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('upcoming');
          }}
          theme={theme}
        />
        <FilterTab
          label="Past"
          icon={<History size={15} color={filter === 'past' ? theme.colors.accent : theme.colors.textTertiary} />}
          active={filter === 'past'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('past');
          }}
          theme={theme}
        />
        <FilterTab
          label="Saved"
          icon={<Bookmark size={15} color={filter === 'bookmarked' ? theme.colors.accent : theme.colors.textTertiary} />}
          active={filter === 'bookmarked'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('bookmarked');
          }}
          theme={theme}
        />
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EnhancedEventCard
            event={item}
            onPress={() => router.push(`/event-detail?id=${item.id}` as never)}
            onRsvp={() => handleRsvp(String(item.id))}
            onBookmark={() => handleBookmark(item)}
            isBookmarked={isItemSaved(String(item.id), 'event')}
            isRsvping={rsvpingId === String(item.id)}
            theme={theme}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          eventsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={emptyConfig.icon}
              title={emptyConfig.title}
              description={emptyConfig.description}
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    backgroundColor: theme.colors.accent,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerCountText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.textInverse,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
  },
  filterTabActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
  },
  filterTabTextActive: {
    color: theme.colors.accent,
    fontWeight: '600' as const,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  eventCardPast: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateBlock: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.accent,
    marginTop: -1,
  },
  cardHeaderRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  relativeBadge: {
    backgroundColor: theme.colors.infoMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  relativeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.colors.info,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  eventTitlePast: {
    color: theme.colors.textSecondary,
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 20,
    marginBottom: 8,
  },
  eventMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeeText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  rsvpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.accentMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rsvpChipActive: {
    backgroundColor: theme.colors.successMuted,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  rsvpChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  rsvpChipTextActive: {
    color: theme.colors.success,
  },
  pastChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
  },
  pastChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
  },
});
