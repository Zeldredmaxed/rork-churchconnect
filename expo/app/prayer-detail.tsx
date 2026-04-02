import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  InputAccessoryView,
  Keyboard,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);
  const [responseText, setResponseText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const inputAccessoryViewID = 'prayer-response-input';
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  const prayerQuery = useQuery({
    queryKey: ['prayer', id],
    queryFn: () => api.get<{ data: Prayer }>(`/prayers/${id}`),
    enabled: !!id,
  });

  const responsesQuery = useQuery({
    queryKey: ['prayer-responses', id],
    queryFn: async () => {
      console.log('[PrayerDetail] Fetching comments for prayer', id);
      try {
        const res = await api.get<unknown>(`/prayers/${id}/comments`);
        console.log('[PrayerDetail] Comments endpoint response:', JSON.stringify(res).slice(0, 300));
        const parsed = res as Record<string, unknown>;
        const commentsData = parsed.data ?? parsed.comments ?? parsed.results ?? res;
        if (Array.isArray(commentsData)) return { data: commentsData as PrayerResponse[] };
        return { data: [] as PrayerResponse[] };
      } catch (commentsErr) {
        console.log('[PrayerDetail] Comments endpoint failed, falling back to prayer object:', (commentsErr as Error).message);
        const res = await api.get<unknown>(`/prayers/${id}`);
        const parsed = res as Record<string, unknown>;
        const prayerData = (parsed.data ?? res) as Record<string, unknown>;
        const comments = prayerData.comments ?? prayerData.responses ?? [];
        if (Array.isArray(comments)) return { data: comments as PrayerResponse[] };
        return { data: [] as PrayerResponse[] };
      }
    },
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
      api.post(`/prayers/${id}/comments`, { content, is_anonymous: false } as unknown as Record<string, unknown>),
    onSuccess: (data) => {
      console.log('[PrayerDetail] Response submitted successfully:', JSON.stringify(data).slice(0, 300));
      void queryClient.invalidateQueries({ queryKey: ['prayer-responses', id] });
      void queryClient.invalidateQueries({ queryKey: ['prayer', id] });
      setResponseText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
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
  const responses = React.useMemo(() => {
    const raw = responsesQuery.data as unknown;
    if (!raw) return [] as PrayerResponse[];
    if (Array.isArray(raw)) return raw as PrayerResponse[];
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as PrayerResponse[];
    if (Array.isArray(obj.responses)) return obj.responses as PrayerResponse[];
    if (Array.isArray(obj.results)) return obj.results as PrayerResponse[];
    console.log('[PrayerDetail] Unexpected responses shape:', JSON.stringify(raw).slice(0, 200));
    return [] as PrayerResponse[];
  }, [responsesQuery.data]);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

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

  const renderInputBar = () => (
    <View style={styles.inputBar}>
      <TextInput
        style={styles.responseInput}
        value={responseText}
        onChangeText={setResponseText}
        placeholder="Write a response..."
        placeholderTextColor={theme.colors.textTertiary}
        multiline
        inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
        onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
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
  );

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

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
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

          {responsesQuery.isLoading && (
            <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginVertical: 16 }} />
          )}

          {!responsesQuery.isLoading && responses.length === 0 && (
            <Text style={styles.emptyResponsesText}>No responses yet. Be the first to respond!</Text>
          )}

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

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          {renderInputBar()}
        </InputAccessoryView>
      ) : (
        <Animated.View style={{ marginBottom: keyboardHeight }}>
          {renderInputBar()}
        </Animated.View>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme, bottomInset: number) => StyleSheet.create({
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
    paddingBottom: 16,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: bottomInset || 12,
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
  emptyResponsesText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
    marginVertical: 16,
  },
});

