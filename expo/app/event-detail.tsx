import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, MapPin, Users, Clock, Check, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
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

  const eventQuery = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get<{ data: Event }>(`/events/${id}`),
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: () => api.post(`/events/${id}/rsvp`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['event', id] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: () => api.delete(`/events/${id}/rsvp`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['event', id] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const event = eventQuery.data?.data;

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgeRow}>
          <Badge
            label={event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            variant={typeBadgeVariant[event.type] ?? 'accent'}
          />
          {event.status === 'cancelled' && <Badge label="Cancelled" variant="error" />}
          {event.is_recurring && <Badge label="Recurring" variant="info" />}
        </View>

        <Text style={styles.title}>{event.title}</Text>

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

        {event.status !== 'cancelled' && (
          <View style={styles.actionSection}>
            {event.is_rsvped ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => cancelRsvpMutation.mutate()}
                disabled={cancelRsvpMutation.isPending}
                activeOpacity={0.8}
              >
                {cancelRsvpMutation.isPending ? (
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
                style={styles.rsvpButton}
                onPress={() => rsvpMutation.mutate()}
                disabled={rsvpMutation.isPending}
                activeOpacity={0.8}
              >
                {rsvpMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.background} />
                ) : (
                  <>
                    <Check size={18} color={theme.colors.background} />
                    <Text style={styles.rsvpButtonText}>RSVP</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 20,
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
    color: theme.colors.background,
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
});

