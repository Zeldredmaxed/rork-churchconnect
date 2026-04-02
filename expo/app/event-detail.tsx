import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Check,
  X,
  Bookmark,
  BookmarkCheck,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useSaved } from '@/contexts/SavedContext';
import Badge from '@/components/Badge';
import type { Event } from '@/types';

const typeBadgeVariant: Record<string, 'accent' | 'info' | 'warning' | 'success'> = {
  service: 'accent',
  event: 'info',
  meeting: 'warning',
  conference: 'success',
};

export default function EventDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isItemSaved, toggleSave } = useSaved();

  const eventQuery = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const raw = await api.get<Event | { data: Event }>(`/events/${id}`);
      let evt: Record<string, unknown>;
      if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data: Event }).data) {
        evt = (raw as { data: Event }).data as unknown as Record<string, unknown>;
      } else {
        evt = raw as unknown as Record<string, unknown>;
      }
      return {
        ...evt,
        start_date: (evt.start_date ?? evt.start_datetime ?? evt.startDate ?? evt.date ?? '') as string,
        end_date: (evt.end_date ?? evt.end_datetime ?? evt.endDate ?? evt.date ?? '') as string,
      } as Event;
    },
    enabled: !!id,
  });

  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [guestCount, setGuestCount] = useState(1);

  const rsvpMutation = useMutation({
    mutationFn: (params: { count?: number }) => api.post(`/events/${id}/rsvp`, {
      count: params.count ?? 1,
      guest_count: params.count ?? 1,
      guests: params.count ?? 1,
      number_of_guests: params.count ?? 1,
    }),
    onMutate: async (params) => {
      const count = params.count ?? 1;
      await queryClient.cancelQueries({ queryKey: ['event', id] });
      const previousEvent = queryClient.getQueryData(['event', id]);

      queryClient.setQueryData(['event', id], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const ev = old as Record<string, unknown>;
        const wasRsvped = !!ev.is_rsvped;
        return {
          ...ev,
          is_rsvped: !wasRsvped,
          rsvp_count: ((ev.rsvp_count as number) ?? 0) + (wasRsvped ? -count : count),
        };
      });

      queryClient.setQueryData(['events'], (old: unknown) => {
        if (!old) return old;
        const updateEvent = (event: Record<string, unknown>): Record<string, unknown> => {
          if (String(event.id) === id) {
            const wasRsvped = !!event.is_rsvped;
            return {
              ...event,
              is_rsvped: !wasRsvped,
              rsvp_count: ((event.rsvp_count as number) ?? 0) + (wasRsvped ? -count : count),
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

      return { previousEvent };
    },
    onSuccess: () => {
      console.log('[EventDetail] RSVP toggled');
      void queryClient.invalidateQueries({ queryKey: ['event', id] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error, _vars, context) => {
      Alert.alert('Error', error.message);
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', id], context.previousEvent);
      }
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const event = eventQuery.data;
  const isBookmarked = event ? isItemSaved(String(event.id), 'event') : false;

  const handleBookmark = useCallback(() => {
    if (!event) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSave({
      itemId: String(event.id),
      itemType: 'event',
      title: event.title,
      preview: event.description?.slice(0, 150) ?? '',
      authorName: '',
      authorId: '',
    });
  }, [event, toggleSave]);

  const handleRsvpPress = useCallback(() => {
    if (!event) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (event.is_rsvped) {
      rsvpMutation.mutate({ count: 1 });
      return;
    }

    if (event.max_capacity) {
      const spotsLeft = event.max_capacity - (event.rsvp_count ?? 0);
      if (spotsLeft <= 0) {
        Alert.alert(
          'Event Full',
          "Sorry, we're full! Please reach out to administration for further information.",
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    }

    setGuestCount(1);
    setShowRsvpModal(true);
  }, [event, rsvpMutation]);

  const handleConfirmRsvp = useCallback(() => {
    if (!event) return;
    if (event.max_capacity) {
      const spotsLeft = event.max_capacity - (event.rsvp_count ?? 0);
      if (guestCount > spotsLeft) {
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
    rsvpMutation.mutate({ count: guestCount });
    console.log('[EventDetail] RSVP confirmed with guest count:', guestCount);
  }, [event, guestCount, rsvpMutation]);

  if (eventQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Event' }} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Event' }} />
        <Text style={styles.emptyText}>Event not found</Text>
      </View>
    );
  }

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isPast = new Date(event.end_date) < new Date();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleBookmark}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID="event-detail-bookmark"
              >
                {isBookmarked ? (
                  <BookmarkCheck size={22} color={theme.colors.accent} />
                ) : (
                  <Bookmark size={22} color={theme.colors.text} />
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroDateBlock}>
            <Text style={styles.heroMonth}>
              {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.heroDay}>{new Date(event.start_date).getDate()}</Text>
            <Text style={styles.heroWeekday}>
              {new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <Badge
                label={(event.type ?? 'event').charAt(0).toUpperCase() + (event.type ?? 'event').slice(1)}
                variant={typeBadgeVariant[event.type ?? 'event'] ?? 'accent'}
              />
              {event.status === 'cancelled' && <Badge label="Cancelled" variant="error" />}
              {event.is_recurring && <Badge label="Recurring" variant="info" />}
              {isPast && <Badge label="Past" variant="default" />}
            </View>
            <Text style={styles.title}>{event.title}</Text>
          </View>
        </View>

        {event.is_rsvped && !isPast && (
          <View style={styles.rsvpConfirmBanner}>
            <Check size={16} color={theme.colors.success} />
            <Text style={styles.rsvpConfirmText}>You're going to this event</Text>
          </View>
        )}

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={16} color={theme.colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Start</Text>
              <Text style={styles.detailValue}>{formatDateTime(event.start_date)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={16} color={theme.colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>End</Text>
              <Text style={styles.detailValue}>{formatDateTime(event.end_date)}</Text>
            </View>
          </View>
          {event.location ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MapPin size={16} color={theme.colors.accent} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{event.location}</Text>
                </View>
              </View>
            </>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Users size={16} color={theme.colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Attendees</Text>
              <Text style={styles.detailValue}>
                {event.rsvp_count}{event.max_capacity ? ` / ${event.max_capacity}` : ''} going
              </Text>
            </View>
          </View>
        </View>

        {event.description ? (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        ) : null}

        {event.status !== 'cancelled' && !isPast && (
          <View style={styles.actionSection}>
            {event.is_rsvped ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleRsvpPress}
                disabled={rsvpMutation.isPending}
                activeOpacity={0.8}
                testID="cancel-rsvp-btn"
              >
                {rsvpMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <>
                    <X size={18} color={theme.colors.error} />
                    <Text style={styles.cancelButtonText}>Cancel RSVP</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  event.max_capacity && (event.max_capacity - (event.rsvp_count ?? 0)) <= 0 && styles.rsvpButtonFull,
                ]}
                onPress={handleRsvpPress}
                disabled={rsvpMutation.isPending}
                activeOpacity={0.8}
                testID="rsvp-btn"
              >
                {rsvpMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.textInverse} />
                ) : (
                  <>
                    {event.max_capacity && (event.max_capacity - (event.rsvp_count ?? 0)) <= 0 ? (
                      <>
                        <AlertCircle size={18} color={theme.colors.textTertiary} />
                        <Text style={styles.rsvpButtonFullText}>Event Full</Text>
                      </>
                    ) : (
                      <>
                        <CalendarCheck size={18} color={theme.colors.textInverse} />
                        <Text style={styles.rsvpButtonText}>RSVP to this Event</Text>
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.bookmarkButton}
              onPress={handleBookmark}
              activeOpacity={0.8}
              testID="bookmark-btn"
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck size={18} color={theme.colors.accent} />
                  <Text style={styles.bookmarkButtonText}>Saved</Text>
                </>
              ) : (
                <>
                  <Bookmark size={18} color={theme.colors.accent} />
                  <Text style={styles.bookmarkButtonText}>Save Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
                  {event?.max_capacity
                    ? `${event.max_capacity - (event.rsvp_count ?? 0)} spot${(event.max_capacity - (event.rsvp_count ?? 0)) === 1 ? '' : 's'} remaining`
                    : 'Enter the number of people in your party'}
                </Text>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[styles.counterBtn, guestCount <= 1 && styles.counterBtnDisabled]}
                  onPress={() => {
                    if (guestCount > 1) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGuestCount((c) => c - 1);
                    }
                  }}
                  disabled={guestCount <= 1}
                  activeOpacity={0.7}
                  testID="rsvp-minus-btn"
                >
                  <Minus size={20} color={guestCount <= 1 ? theme.colors.textTertiary : theme.colors.accent} />
                </TouchableOpacity>

                <View style={styles.counterDisplay}>
                  <Text style={styles.counterValue}>{guestCount}</Text>
                  <Text style={styles.counterLabel}>{guestCount === 1 ? 'person' : 'people'}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    event?.max_capacity && guestCount >= (event.max_capacity - (event.rsvp_count ?? 0)) && styles.counterBtnDisabled,
                  ]}
                  onPress={() => {
                    const maxAllowed = event?.max_capacity ? event.max_capacity - (event.rsvp_count ?? 0) : 99;
                    if (guestCount < maxAllowed) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGuestCount((c) => c + 1);
                    }
                  }}
                  disabled={!!event?.max_capacity && guestCount >= (event.max_capacity - (event.rsvp_count ?? 0))}
                  activeOpacity={0.7}
                  testID="rsvp-plus-btn"
                >
                  <Plus
                    size={20}
                    color={
                      event?.max_capacity && guestCount >= (event.max_capacity - (event.rsvp_count ?? 0))
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
                  testID="rsvp-modal-cancel"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmRsvp}
                  activeOpacity={0.8}
                  testID="rsvp-modal-confirm"
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
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  heroDateBlock: {
    width: 64,
    height: 72,
    borderRadius: 16,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMonth: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  heroDay: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: theme.colors.accent,
    marginTop: -2,
  },
  heroWeekday: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: theme.colors.accent,
    opacity: 0.7,
    marginTop: -2,
  },
  heroContent: {
    flex: 1,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.text,
    lineHeight: 28,
  },
  rsvpConfirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.successMuted,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  rsvpConfirmText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.success,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 60,
  },
  descriptionSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  actionSection: {
    marginTop: 28,
    gap: 10,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
  },
  rsvpButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.textInverse,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.error,
  },
  bookmarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  bookmarkButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  rsvpButtonFull: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  rsvpButtonFullText: {
    fontSize: 17,
    fontWeight: '600' as const,
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
