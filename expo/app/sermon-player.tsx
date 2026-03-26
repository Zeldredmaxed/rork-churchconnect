import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Eye, Play, Send, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { Sermon, SermonNote } from '@/types';

const { width } = Dimensions.get('window');

export default function SermonPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [timestampMarker, setTimestampMarker] = useState('');

  const sermonQuery = useQuery({
    queryKey: ['sermon', id],
    queryFn: () => api.get<{ data: Sermon }>(`/sermons/${id}`),
    enabled: !!id,
  });

  const notesQuery = useQuery({
    queryKey: ['sermon-notes', id],
    queryFn: () => api.get<{ data: SermonNote[] }>(`/sermons/${id}/notes`),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/sermons/${id}/like`),
    onSuccess: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void queryClient.invalidateQueries({ queryKey: ['sermon', id] });
    },
  });

  const viewMutation = useMutation({
    mutationFn: () => api.post(`/sermons/${id}/view`),
  });

  React.useEffect(() => {
    if (id) viewMutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addNoteMutation = useMutation({
    mutationFn: (params: { content: string; timestamp_marker?: string }) =>
      api.post(`/sermons/${id}/notes`, params as unknown as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sermon-notes', id] });
      setNoteText('');
      setTimestampMarker('');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const handleAddNote = useCallback(() => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate({
      content: noteText.trim(),
      timestamp_marker: timestampMarker.trim() || undefined,
    });
  }, [noteText, timestampMarker, addNoteMutation]);

  const sermon = sermonQuery.data?.data;
  const notes = notesQuery.data?.data ?? [];

  if (sermonQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Sermon' }} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!sermon) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Sermon' }} />
        <Text style={styles.errorText}>Sermon not found</Text>
      </View>
    );
  }

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
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Play size={40} color={theme.colors.white} fill={theme.colors.white} />
            <Text style={styles.videoHint}>Video Player</Text>
          </View>
        </View>

        <View style={styles.sermonInfo}>
          <Text style={styles.title}>{sermon.title}</Text>
          <Text style={styles.speaker}>{sermon.speaker}</Text>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statBtn} onPress={() => likeMutation.mutate()}>
              <Heart
                size={18}
                color={sermon.is_liked ? theme.colors.error : theme.colors.textTertiary}
                fill={sermon.is_liked ? theme.colors.error : 'transparent'}
              />
              <Text style={styles.statText}>{sermon.like_count}</Text>
            </TouchableOpacity>
            <View style={styles.statBtn}>
              <Eye size={18} color={theme.colors.textTertiary} />
              <Text style={styles.statText}>{sermon.view_count} views</Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(sermon.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          {sermon.description ? (
            <Text style={styles.description}>{sermon.description}</Text>
          ) : null}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>MY NOTES</Text>

          <View style={styles.noteInputRow}>
            <View style={styles.timestampInput}>
              <Clock size={14} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.timestampField}
                value={timestampMarker}
                onChangeText={setTimestampMarker}
                placeholder="00:00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !noteText.trim() && styles.sendBtnDisabled]}
              onPress={handleAddNote}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Send size={18} color={noteText.trim() ? theme.colors.accent : theme.colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>

          {notes.map((note) => (
            <View key={note.id} style={styles.noteItem}>
              {note.timestamp_marker ? (
                <TouchableOpacity style={styles.timestampPill}>
                  <Clock size={10} color={theme.colors.accent} />
                  <Text style={styles.timestampPillText}>{note.timestamp_marker}</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.noteContent}>{note.content}</Text>
              <Text style={styles.noteDate}>
                {new Date(note.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}

          {notes.length === 0 && !notesQuery.isLoading && (
            <Text style={styles.emptyNotes}>No notes yet. Start taking notes during the sermon.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  errorText: {
    color: theme.colors.textTertiary,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  videoContainer: {
    width: width,
    height: width * 9 / 16,
    backgroundColor: theme.colors.black,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  sermonInfo: {
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  speaker: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  statBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  dateText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginLeft: 'auto',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  notesSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  timestampInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: 70,
  },
  timestampField: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  noteInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 40,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  noteItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  timestampPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  timestampPillText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  noteContent: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
  emptyNotes: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
