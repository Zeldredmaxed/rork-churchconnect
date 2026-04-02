import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Plus, X, CalendarDays } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EventCard from '@/components/EventCard';
import EmptyState from '@/components/EmptyState';
import type { Event } from '@/types';

export default function AdminEventsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'service' | 'event' | 'meeting' | 'conference'>('event');
  const [location, setLocation] = useState('');
  const [regRequired, setRegRequired] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState('');

  const eventsQuery = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      const res = await api.get<unknown>('/events');
      console.log('[AdminEvents] Raw response:', JSON.stringify(res).slice(0, 500));
      return res;
    },
  });

  const createMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      console.log('[AdminEvents] Creating event with:', JSON.stringify(params));
      return api.post('/events', params);
    },
    onSuccess: () => {
      console.log('[AdminEvents] Event created successfully');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      resetForm();
      Alert.alert('Success', 'Event created successfully!');
    },
    onError: (error) => {
      console.log('[AdminEvents] Create error:', error.message);
      Alert.alert('Error', error.message || 'Failed to create event');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: string) => api.put(`/events/${eventId}`, { status: 'cancelled' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const resetForm = () => {
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setEventType('event');
    setLocation('');
    setRegRequired(false);
    setRecurring(false);
    setMaxCapacity('');
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || 'No description provided',
      type: eventType,
      location: location.trim() || 'TBD',
      start_date: tomorrow.toISOString(),
      end_date: new Date(tomorrow.getTime() + 7200000).toISOString(),
      registration_required: regRequired,
      is_recurring: recurring,
      ...(maxCapacity ? { max_capacity: parseInt(maxCapacity, 10) } : {}),
    });
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
  }, [queryClient]);

  const events = React.useMemo(() => {
    const raw = eventsQuery.data as unknown;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Event[];
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as Event[];
      if (Array.isArray(obj.events)) return obj.events as Event[];
      if (Array.isArray(obj.items)) return obj.items as Event[];
      if (Array.isArray(obj.results)) return obj.results as Event[];
    }
    console.log('[AdminEvents] Could not parse:', JSON.stringify(raw).slice(0, 300));
    return [];
  }, [eventsQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Events' }} />

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View>
            <EventCard
              event={item}
              onPress={() => {
                Alert.alert(item.title, 'Actions', [
                  { text: 'Close', style: 'cancel' },
                  {
                    text: 'Cancel Event',
                    style: 'destructive',
                    onPress: () => cancelMutation.mutate(String(item.id)),
                  },
                ]);
              }}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          eventsQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={<CalendarDays size={28} color={theme.colors.textTertiary} />} title="No events" description="Create your first event" />
          )
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
        <Plus size={24} color={theme.colors.background} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetForm}><X size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Create Event</Text>
              <TouchableOpacity onPress={handleCreate} disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.submitText, !title.trim() && styles.submitDisabled]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={theme.colors.textTertiary} />
              <TextInput style={[styles.input, styles.multilineInput]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={theme.colors.textTertiary} multiline textAlignVertical="top" />
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeRow}>
                {(['service', 'event', 'meeting', 'conference'] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.typeChip, eventType === t && styles.typeChipActive]} onPress={() => setEventType(t)}>
                    <Text style={[styles.typeText, eventType === t && styles.typeTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor={theme.colors.textTertiary} />
              <TextInput style={styles.input} value={maxCapacity} onChangeText={setMaxCapacity} placeholder="Max Capacity (optional)" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" />
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Registration Required</Text>
                <Switch value={regRequired} onValueChange={setRegRequired} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }} thumbColor={regRequired ? theme.colors.accent : theme.colors.textTertiary} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Recurring</Text>
                <Switch value={recurring} onValueChange={setRecurring} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }} thumbColor={recurring ? theme.colors.accent : theme.colors.textTertiary} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  fab: {
    position: 'absolute' as const, bottom: 24, right: 20, width: 56, height: 56, borderRadius: 16,
    backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.text },
  submitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.accent },
  submitDisabled: { opacity: 0.4 },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text, marginBottom: 10 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.textTertiary, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated },
  typeChipActive: { backgroundColor: theme.colors.accentMuted },
  typeText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' as const },
  typeTextActive: { color: theme.colors.accent },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  toggleLabel: { fontSize: 15, color: theme.colors.text },
});

