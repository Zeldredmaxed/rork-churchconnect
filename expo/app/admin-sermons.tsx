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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Plus, X, PlayCircle, BookOpen } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import SermonCard from '@/components/SermonCard';
import EmptyState from '@/components/EmptyState';
import type { Sermon } from '@/types';

export default function AdminSermonsScreen() {
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScriptureModal, setShowScriptureModal] = useState(false);
  const [sermonTitle, setSermonTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sermonDesc, setSermonDesc] = useState('');
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verses, setVerses] = useState('');
  const [pastorNotes, setPastorNotes] = useState('');

  const sermonsQuery = useQuery({
    queryKey: ['admin', 'sermons'],
    queryFn: () => api.get<{ data: Sermon[] }>('/sermons'),
  });

  const createSermonMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('/sermons', params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] });
      void queryClient.invalidateQueries({ queryKey: ['sermons'] });
      setShowUploadModal(false);
      setSermonTitle('');
      setSpeaker('');
      setVideoUrl('');
      setSermonDesc('');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const createScriptureMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('/scriptures', params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scriptures'] });
      setShowScriptureModal(false);
      setBook('');
      setChapter('');
      setVerses('');
      setPastorNotes('');
      Alert.alert('Success', 'Scripture set for today\'s service.');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'sermons'] });
  }, [queryClient]);

  const sermons = sermonsQuery.data?.data ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sermons & Services' }} />

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowScriptureModal(true)}>
          <BookOpen size={16} color={theme.colors.accent} />
          <Text style={styles.actionText}>Set Scripture</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sermons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SermonCard sermon={item} onPress={() => {}} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={sermonsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />}
        ListEmptyComponent={
          sermonsQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={<PlayCircle size={28} color={theme.colors.textTertiary} />} title="No sermons" description="Upload sermon recordings" />
          )
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowUploadModal(true)} activeOpacity={0.8}>
        <Plus size={24} color={theme.colors.background} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={showUploadModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}><X size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Upload Sermon</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!sermonTitle.trim() || !speaker.trim() || !videoUrl.trim()) return;
                  createSermonMutation.mutate({
                    title: sermonTitle.trim(),
                    speaker: speaker.trim(),
                    video_url: videoUrl.trim(),
                    description: sermonDesc.trim(),
                  });
                }}
                disabled={createSermonMutation.isPending}
              >
                {createSermonMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={styles.submitText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} value={sermonTitle} onChangeText={setSermonTitle} placeholder="Sermon Title" placeholderTextColor={theme.colors.textTertiary} />
              <TextInput style={styles.input} value={speaker} onChangeText={setSpeaker} placeholder="Speaker" placeholderTextColor={theme.colors.textTertiary} />
              <TextInput style={styles.input} value={videoUrl} onChangeText={setVideoUrl} placeholder="Video URL (YouTube, Vimeo, MP4)" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
              <TextInput style={[styles.input, { minHeight: 80 }]} value={sermonDesc} onChangeText={setSermonDesc} placeholder="Description (optional)" placeholderTextColor={theme.colors.textTertiary} multiline textAlignVertical="top" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showScriptureModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowScriptureModal(false)}><X size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Set Scripture</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!book.trim() || !chapter.trim() || !verses.trim()) return;
                  createScriptureMutation.mutate({
                    book: book.trim(),
                    chapter: parseInt(chapter, 10),
                    verses: verses.trim(),
                    pastor_notes: pastorNotes.trim(),
                  });
                }}
                disabled={createScriptureMutation.isPending}
              >
                {createScriptureMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={styles.submitText}>Set</Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} value={book} onChangeText={setBook} placeholder="Book (e.g. John)" placeholderTextColor={theme.colors.textTertiary} />
            <TextInput style={styles.input} value={chapter} onChangeText={setChapter} placeholder="Chapter" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" />
            <TextInput style={styles.input} value={verses} onChangeText={setVerses} placeholder="Verses (e.g. 1-5)" placeholderTextColor={theme.colors.textTertiary} />
            <TextInput style={[styles.input, { minHeight: 100 }]} value={pastorNotes} onChangeText={setPastorNotes} placeholder="Pastor's notes for congregation..." placeholderTextColor={theme.colors.textTertiary} multiline textAlignVertical="top" />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  actionText: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.accent },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  fab: {
    position: 'absolute' as const, bottom: 24, right: 20, width: 56, height: 56, borderRadius: 16,
    backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%', gap: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.text },
  submitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.accent },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text, marginBottom: 2 },
});
