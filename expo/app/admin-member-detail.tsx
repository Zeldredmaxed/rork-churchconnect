import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Trash2, Send } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import Badge from '@/components/Badge';
import type { Member, MemberNote, MemberEngagement } from '@/types';

export default function AdminMemberDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const memberQuery = useQuery({
    queryKey: ['member', id],
    queryFn: () => api.get<{ data: Member }>(`/members/${id}`),
    enabled: !!id,
  });

  const notesQuery = useQuery({
    queryKey: ['member-notes', id],
    queryFn: () => api.get<{ data: MemberNote[] }>(`/members/${id}/notes`),
    enabled: !!id,
  });

  const engagementQuery = useQuery({
    queryKey: ['member-engagement', id],
    queryFn: () => api.get<{ data: MemberEngagement }>(`/members/${id}/engagement`),
    enabled: !!id,
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/members/${id}/notes`, { content } as unknown as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['member-notes', id] });
      setNoteText('');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/members/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      Alert.alert('Deleted', 'Member has been removed.');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const member = memberQuery.data?.data;
  const notes = notesQuery.data?.data ?? [];
  const engagement = engagementQuery.data?.data;

  if (memberQuery.isLoading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Member' }} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Member' }} />
        <Text style={styles.emptyText}>Member not found</Text>
      </View>
    );
  }

  const initials = member.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const statusVariant: Record<string, 'success' | 'warning' | 'info'> = {
    active: 'success', prospect: 'warning', visitor: 'info',
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: member.full_name }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{member.full_name}</Text>
          <Badge
            label={member.membership_status.charAt(0).toUpperCase() + member.membership_status.slice(1)}
            variant={statusVariant[member.membership_status] ?? 'info'}
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={16} color={theme.colors.textTertiary} />
            <Text style={styles.infoText}>{member.email}</Text>
          </View>
          {member.phone && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Phone size={16} color={theme.colors.textTertiary} />
                <Text style={styles.infoText}>{member.phone}</Text>
              </View>
            </>
          )}
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <User size={16} color={theme.colors.textTertiary} />
            <Text style={styles.infoText}>
              Role: {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </Text>
          </View>
          {member.family_name && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <User size={16} color={theme.colors.textTertiary} />
                <Text style={styles.infoText}>Family: {member.family_name}</Text>
              </View>
            </>
          )}
        </View>

        {engagement && (
          <View style={styles.engagementCard}>
            <Text style={styles.sectionTitle}>ENGAGEMENT</Text>
            <View style={styles.engagementGrid}>
              <View style={styles.engagementItem}>
                <Text style={styles.engagementValue}>{Math.round(engagement.attendance_rate)}%</Text>
                <Text style={styles.engagementLabel}>Attendance</Text>
              </View>
              <View style={styles.engagementItem}>
                <Text style={styles.engagementValue}>${engagement.giving_total.toLocaleString()}</Text>
                <Text style={styles.engagementLabel}>Total Given</Text>
              </View>
              <View style={styles.engagementItem}>
                <Text style={styles.engagementValue}>{engagement.groups_joined}</Text>
                <Text style={styles.engagementLabel}>Groups</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <View style={styles.noteInputRow}>
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
              onPress={() => addNoteMutation.mutate(noteText.trim())}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              <Send size={16} color={noteText.trim() ? theme.colors.accent : theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
          {notes.map((n) => (
            <View key={n.id} style={styles.noteItem}>
              <Text style={styles.noteContent}>{n.content}</Text>
              <View style={styles.noteMeta}>
                <Text style={styles.noteAuthor}>{n.author_name}</Text>
                <Text style={styles.noteDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            Alert.alert('Delete Member', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Trash2 size={16} color={theme.colors.error} />
          <Text style={styles.deleteText}>Delete Member</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: theme.colors.textTertiary, fontSize: 16 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: theme.colors.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700' as const, color: theme.colors.accent },
  name: { fontSize: 22, fontWeight: '700' as const, color: theme.colors.text },
  infoCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1,
    borderColor: theme.colors.borderLight, overflow: 'hidden', marginTop: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  infoText: { fontSize: 15, color: theme.colors.text, flex: 1 },
  infoDivider: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: 42 },
  engagementCard: { marginTop: 20 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600' as const, color: theme.colors.textTertiary,
    letterSpacing: 0.8, marginBottom: 10,
  },
  engagementGrid: {
    flexDirection: 'row', gap: 10,
  },
  engagementItem: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  engagementValue: { fontSize: 18, fontWeight: '700' as const, color: theme.colors.text },
  engagementLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  notesSection: { marginTop: 20 },
  noteInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  noteInput: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1,
    borderColor: theme.colors.borderLight, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: theme.colors.text, maxHeight: 80,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  sendBtnDisabled: { opacity: 0.5 },
  noteItem: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  noteContent: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  noteAuthor: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '500' as const },
  noteDate: { fontSize: 12, color: theme.colors.textTertiary },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.errorMuted, borderRadius: theme.radius.md, paddingVertical: 14,
    marginTop: 24, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
  },
  deleteText: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.error },
});
