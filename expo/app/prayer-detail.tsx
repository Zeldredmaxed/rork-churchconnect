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
import { HandHeart, AlertTriangle, CheckCircle2, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import Badge from '@/components/Badge';
import Avatar from '@/components/Avatar';
import type { Prayer, PrayerResponse } from '@/types';

export default function PrayerDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [responseText, setResponseText] = useState('');

  const prayerQuery = useQuery({
    queryKey: ['prayer', id],
    queryFn: () => api.get<{ data: Prayer }>(`/prayers/${id}`),
    enabled: !!id,
  });

  const responsesQuery = useQuery({
    queryKey: ['prayer-responses', id],
    queryFn: () => api.get<{ data: PrayerResponse[] }>(`/prayers/${id}/responses`),
    enabled: !!id,
  });

  const [localHasPrayed, setLocalHasPrayed] = useState<boolean | null>(null);
  const [localPrayCount, setLocalPrayCount] = useState<number | null>(null);

  const prayMutation = useMutation({
    mutationFn: () => api.post<{ data: { prayed: boolean; prayed_count: number; has_prayed?: boolean; pray_count?: number } }>(`/prayers/${id}/pray`),
    onSuccess: (data) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = (data as unknown as Record<string, unknown>)?.data as { prayed?: boolean; prayed_count?: number; has_prayed?: boolean; pray_count?: number } | undefined;
      if (result) {
        const prayedState = result.prayed ?? result.has_prayed;
        const prayedCount = result.prayed_count ?? result.pray_count;
        if (prayedState != null) setLocalHasPrayed(prayedState);
        if (prayedCount != null) setLocalPrayCount(prayedCount);
      }
      void queryClient.invalidateQueries({ queryKey: ['prayer', id] });
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/prayers/${id}/responses`, { content, is_anonymous: false } as unknown as Record<string, unknown>),
    onSuccess: () => {
      console.log('[PrayerDetail] Response submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['prayer-responses', id] });
      setResponseText('');
    },
    onError: (error) => {
      console.log('[PrayerDetail] Response submit error:', error.message);
      Alert.alert('Error', error.message);
    },
  });

  const rawPrayer = prayerQuery.data;
  const prayer = React.useMemo(() => {
    if (!rawPrayer) return undefined;
    const rp = rawPrayer as unknown as Record<string, unknown>;
    if (rp.data && typeof rp.data === 'object') return rp.data as Prayer;
    if (rp.id) return rp as unknown as Prayer;
    return undefined;
  }, [rawPrayer]);
  const responses = responsesQuery.data?.data ?? [];

  if (prayerQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Prayer' }} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!prayer) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Prayer' }} />
        <Text style={styles.emptyText}>Prayer not found</Text>
      </View>
    );
  }

  const categoryLabels: Record<string, string> = {
    general: 'General',
    health: 'Health',
    family: 'Family',
    financial: 'Financial',
    spiritual: 'Spiritual',
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
          <Badge label={categoryLabels[prayer.category] ?? 'General'} variant="accent" />
          {prayer.is_urgent && (
            <View style={styles.urgentBadge}>
              <AlertTriangle size={12} color={theme.colors.error} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
          {prayer.is_answered && (
            <View style={styles.answeredBadge}>
              <CheckCircle2 size={12} color={theme.colors.success} />
              <Text style={styles.answeredText}>Answered</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{prayer.title}</Text>
        <Text style={styles.author}>
          by {prayer.is_anonymous ? 'Anonymous' : prayer.author_name}
        </Text>
        <Text style={styles.description}>{prayer.description}</Text>

        <View style={styles.prayRow}>
          <TouchableOpacity
            style={[styles.prayButton, (localHasPrayed ?? prayer.has_prayed) && styles.prayButtonActive]}
            onPress={() => {
              const rp = prayer as unknown as Record<string, unknown>;
              const isPrayedByMe = rp.is_prayed_by_me;
              const current = localHasPrayed ?? (isPrayedByMe != null ? Boolean(isPrayedByMe) : (prayer.has_prayed ?? false));
              const currentCount = localPrayCount ?? prayer.prayed_count ?? prayer.pray_count ?? 0;
              setLocalHasPrayed(!current);
              setLocalPrayCount(!current ? currentCount + 1 : Math.max(0, currentCount - 1));
              prayMutation.mutate();
            }}
            activeOpacity={0.7}
          >
            <HandHeart
              size={20}
              color={(localHasPrayed ?? prayer.has_prayed) ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text style={[styles.prayButtonText, (localHasPrayed ?? prayer.has_prayed) && styles.prayButtonTextActive]}>
              {(localHasPrayed ?? prayer.has_prayed) ? 'Praying' : 'Pray'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.prayCount}>{localPrayCount ?? prayer.prayed_count ?? prayer.pray_count ?? 0} people praying</Text>
        </View>

        <View style={styles.responsesSection}>
          <Text style={styles.sectionTitle}>RESPONSES ({responses.length})</Text>

          {responses.map((r) => (
            <View key={r.id} style={styles.responseItem}>
              <View style={styles.responseHeader}>
                <Avatar url={r.author_avatar} name={r.author_name} size={30} />
                <View style={styles.responseInfo}>
                  <Text style={styles.responseName}>{r.author_name}</Text>
                  <Text style={styles.responseDate}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Text style={styles.responseContent}>{r.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.responseInput}
          value={responseText}
          onChangeText={setResponseText}
          placeholder="Write a response..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !responseText.trim() && styles.sendBtnDisabled]}
          onPress={() => respondMutation.mutate(responseText.trim())}
          disabled={!responseText.trim() || respondMutation.isPending}
        >
          {respondMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Send size={18} color={responseText.trim() ? theme.colors.accent : theme.colors.textTertiary} />
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.errorMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.error,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.successMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  answeredText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.success,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  author: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginTop: 16,
  },
  prayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  prayButtonActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  prayButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  prayButtonTextActive: {
    color: theme.colors.accent,
  },
  prayCount: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  responsesSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  responseItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  responseInfo: {
    flex: 1,
  },
  responseName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  responseDate: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  responseContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  inputBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 8,
  },
  responseInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

