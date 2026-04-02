import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi } from '@/utils/settings-api';

const TAG_OPTIONS: { label: string; value: 'everyone' | 'following' | 'nobody' }[] = [
  { label: 'Everyone', value: 'everyone' },
  { label: 'People you follow', value: 'following' },
  { label: 'No one', value: 'nobody' },
];

export default function TagsMentionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [allowMentions, setAllowMentions] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('everyone');

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSelectedTag(settingsQuery.data.allow_tags_from ?? 'everyone');
      setAllowMentions(settingsQuery.data.allow_mentions ?? true);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => settingsApi.updateSettings(updates as Partial<import('@/utils/settings-api').UserSettings>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  const handleSelectTag = (value: string) => {
    setSelectedTag(value);
    updateMutation.mutate({ allow_tags_from: value });
  };

  const handleToggleMentions = (value: boolean) => {
    setAllowMentions(value);
    updateMutation.mutate({ allow_mentions: value });
  };

  if (settingsQuery.isLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Tags and mentions', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false }} />
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Tags and mentions',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionHeader}>Tags</Text>
        <Text style={s.sectionDesc}>Allow tags from</Text>
        {TAG_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.value} style={s.radioRow} onPress={() => handleSelectTag(opt.value)} activeOpacity={0.6}>
            <Text style={s.radioLabel}>{opt.label}</Text>
            <View style={[s.radio, selectedTag === opt.value && s.radioActive]}>
              {selectedTag === opt.value && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Mentions</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Allow @mentions</Text>
            <Text style={s.toggleHint}>Allow others to mention you in their posts and comments</Text>
          </View>
          <Switch
            value={allowMentions}
            onValueChange={handleToggleMentions}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  sectionHeader: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionDesc: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, marginBottom: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  radioLabel: { flex: 1, fontSize: 15, color: theme.colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: theme.colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginVertical: 12, marginHorizontal: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
});
