import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Send, Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

export default function AdminAnnouncementsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'group'>('all');

  const broadcastMutation = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      console.log('[Announcements] Sending broadcast:', JSON.stringify(params));
      try {
        return await api.post('/announcements', params);
      } catch {
        console.log('[Announcements] /announcements failed, trying /notifications/broadcast');
        try {
          return await api.post('/notifications/broadcast', params);
        } catch {
          console.log('[Announcements] /notifications/broadcast also failed, trying /notifications');
          return await api.post('/notifications', params);
        }
      }
    },
    onSuccess: () => {
      console.log('[Announcements] Broadcast sent successfully');
      Alert.alert('Sent', 'Notification has been sent to members.');
      setTitle('');
      setBody('');
    },
    onError: (error) => {
      console.log('[Announcements] Broadcast error:', error.message);
      Alert.alert('Error', error.message || 'Failed to send announcement');
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    broadcastMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      message: body.trim(),
      content: body.trim(),
      target,
      target_audience: target,
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Announcements' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <Bell size={32} color={theme.colors.accent} />
        </View>
        <Text style={styles.heading}>Send Announcement</Text>
        <Text style={styles.subheading}>Push a notification to your congregation</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Notification Title"
            placeholderTextColor={theme.colors.textTertiary}
          />
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder="Message body..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>Send To</Text>
          <View style={styles.targetRow}>
            <TouchableOpacity
              style={[styles.targetChip, target === 'all' && styles.targetChipActive]}
              onPress={() => setTarget('all')}
            >
              <Text style={[styles.targetText, target === 'all' && styles.targetTextActive]}>
                All Members
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.targetChip, target === 'group' && styles.targetChipActive]}
              onPress={() => setTarget('group')}
            >
              <Text style={[styles.targetText, target === 'group' && styles.targetTextActive]}>
                Specific Group
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.sendButton, (!title.trim() || !body.trim()) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!title.trim() || !body.trim() || broadcastMutation.isPending}
            activeOpacity={0.8}
          >
            {broadcastMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <>
                <Send size={18} color={theme.colors.background} />
                <Text style={styles.sendButtonText}>Send Notification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  iconContainer: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: theme.colors.accentMuted,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 20, marginBottom: 16,
  },
  heading: { fontSize: 22, fontWeight: '700' as const, color: theme.colors.text, textAlign: 'center' },
  subheading: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  form: { gap: 12 },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1,
    borderColor: theme.colors.borderLight, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, color: theme.colors.text,
  },
  bodyInput: { minHeight: 120, textAlignVertical: 'top' },
  fieldLabel: {
    fontSize: 13, fontWeight: '600' as const, color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 4,
  },
  targetRow: { flexDirection: 'row', gap: 8 },
  targetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated },
  targetChipActive: { backgroundColor: theme.colors.accentMuted },
  targetText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' as const },
  targetTextActive: { color: theme.colors.accent },
  sendButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingVertical: 16, marginTop: 8,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.background },
});

