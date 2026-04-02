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
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  Minus,
  Plus,
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
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [rsvpGuestCount, setRsvpGuestCount] = useState(1);
  const [rsvpTargetEvent, setRsvpTargetEvent] = useState<Event | null>(null);

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<Event[] | { data: Event[] }>('/events'),
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, count }: { eventId: string; count?: number }) => api.post(`/events/${eventId}/rsvp`, {
      count: count ?? 1,
      guest_count: count ?? 1,
      guests: count ?? 1,
      number_of_guests: count ?? 1,
    }),
    onMutate: async ({ eventId, count }) => {
      setRsvpingId(eventId);
      const guestNum = count ?? 1;
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previousEvents = queryClient.getQueryData(['events']);

      queryClient.setQueryData(['events'], (old: unknown) => {
        if (!old) return old;
        const updateEvent = (event: Record<string, unknown>): Record<string, unknown> => {
          if (String(event.id) === eventId) {
            const wasRsvped = !!event.is_rsvped;
            return {
              ...event,
              is_rsvped: !wasRsvped,
              rsvp_count: ((event.rsvp_count as number) ?? 0) + (wasRsvped ? -guestNum : guestNum),
            };
          }
          return event;
        };

        if (Array.isArray(old)) return old.map(updateEvent);
        const obj = old as Record<string, unknown>;
        if (Array.isArray(obj.data)) return { ...obj, data: (obj.data as Record<string, unknown>[]).map(updateEvent) };
        if (Array.isArray(obj.events)) return { ...obj, events: (obj.events as Record<string, unknown>[]).map(updateEvent) };
        if (Array.isArray(obj.items)) return { ...obj, items: (obj.items as Record<string, unknown>[]).map(updateEvent) };
        if (Array.isArray(obj.results)) return { ...obj, results: (obj.results as Record<string, unknown>[]).map(updateEvent) };
        return old;
      });

      return { previousEvents };
    },
    onSuccess: (_data, { eventId }) => {
      console.log('[Events] RSVP toggled for event:', eventId);
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: (error, { eventId: _eventId }, context) => {
      console.log('[Events] RSVP error:', error.message);
      if (context?.previousEvents) {
        queryClient.setQueryData(['events'], context.previousEvents);
      }
    },
    onSettled: () => {
      setRsvpingId(null);
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['events'] });
  }, [queryClient]);

  const allEvents = useMemo(() => {
    const raw = eventsQuery.data as unknown;
    if (!raw) return [];
    let list: Record<string, unknown>[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) list = obj.data;
      else if (Array.isArray(obj.events)) list = obj.events;
      else if (Array.isArray(obj.items)) list = obj.items;
      else if (Array.isArray(obj.results)) list = obj.results;
      else {
        console.log('[Events] Could not parse events response:', JSON.stringify(raw).slice(0, 300));
        return [];
      }
    }
    console.log('[Events] Raw list count:', list.length, 'sample:', JSON.stringify(list[0]).slice(0, 300));
    return list.map((e) => {
      const item = e as Record<string, unknown>;
      return {
        ...item,
        start_date: (item.start_date ?? item.start_datetime ?? item.startDate ?? item.date ?? '') as string,
        end_date: (item.end_date ?? item.end_datetime ?? item.endDate ?? item.date ?? '') as string,
      } as Event;
    });
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

  const handleRsvp = useCallback((eventItem: Event) => {
    const eventId = String(eventItem.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (eventItem.is_rsvped) {
      rsvpMutation.mutate({ eventId, count: 1 });
      return;
    }

    if (eventItem.max_capacity) {
      const spotsLeft = eventItem.max_capacity - (eventItem.rsvp_count ?? 0);
      if (spotsLeft <= 0) {
        Alert.alert(
          'Event Full',
          "Sorry, we're full! Please reach out to administration for further information.",
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    }

    setRsvpTargetEvent(eventItem);
    setRsvpGuestCount(1);
    setShowRsvpModal(true);
  }, [rsvpMutation]);

  const handleConfirmRsvp = useCallback(() => {
    if (!rsvpTargetEvent) return;
    const eventId = String(rsvpTargetEvent.id);
    if (rsvpTargetEvent.max_capacity) {
      const spotsLeft = rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0);
      if (rsvpGuestCount > spotsLeft) {
        Alert.alert(
          'Not Enough Spots',
          `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left. Please reduce the number of attendees.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    }
    setShowRsvpModal(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate({ eventId, count: rsvpGuestCount });
    console.log('[Events] RSVP confirmed for event:', eventId, 'guests:', rsvpGuestCount);
  }, [rsvpTargetEvent, rsvpGuestCount, rsvpMutation]);

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
            onRsvp={() => handleRsvp(item)}
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

      <Modal
        visible={showRsvpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRsvpModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowRsvpModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <CalendarCheck size={28} color={theme.colors.accent} />
                <Text style={styles.modalTitle}>How many attending?</Text>
                <Text style={styles.modalSubtitle}>
                  {rsvpTargetEvent?.max_capacity
                    ? `${rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0)} spot${(rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0)) === 1 ? '' : 's'} remaining`
                    : 'Enter the number of people in your party'}
                </Text>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[styles.counterBtn, rsvpGuestCount <= 1 && styles.counterBtnDisabled]}
                  onPress={() => {
                    if (rsvpGuestCount > 1) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRsvpGuestCount((c) => c - 1);
                    }
                  }}
                  disabled={rsvpGuestCount <= 1}
                  activeOpacity={0.7}
                >
                  <Minus size={20} color={rsvpGuestCount <= 1 ? theme.colors.textTertiary : theme.colors.accent} />
                </TouchableOpacity>

                <View style={styles.counterDisplay}>
                  <Text style={styles.counterValue}>{rsvpGuestCount}</Text>
                  <Text style={styles.counterLabel}>{rsvpGuestCount === 1 ? 'person' : 'people'}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    rsvpTargetEvent?.max_capacity && rsvpGuestCount >= (rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0)) && styles.counterBtnDisabled,
                  ]}
                  onPress={() => {
                    const maxAllowed = rsvpTargetEvent?.max_capacity ? rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0) : 99;
                    if (rsvpGuestCount < maxAllowed) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRsvpGuestCount((c) => c + 1);
                    }
                  }}
                  disabled={!!rsvpTargetEvent?.max_capacity && rsvpGuestCount >= (rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0))}
                  activeOpacity={0.7}
                >
                  <Plus
                    size={20}
                    color={
                      rsvpTargetEvent?.max_capacity && rsvpGuestCount >= (rsvpTargetEvent.max_capacity - (rsvpTargetEvent.rsvp_count ?? 0))
                        ? theme.colors.textTertiary
                        : theme.colors.accent
                    }
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowRsvpModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmRsvp}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalConfirmText}>Confirm RSVP</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  counterRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 20,
    marginBottom: 28,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  counterBtnDisabled: {
    backgroundColor: theme.colors.surfaceElevated,
    opacity: 0.5,
  },
  counterDisplay: {
    alignItems: 'center' as const,
    minWidth: 60,
  },
  counterValue: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: theme.colors.text,
    lineHeight: 48,
  },
  counterLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row' as const,
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center' as const,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center' as const,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.textInverse,
  },
});
