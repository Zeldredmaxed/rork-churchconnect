import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi } from '@/utils/settings-api';

const COMMENT_OPTIONS: { label: string; value: 'everyone' | 'following' | 'followers' | 'both' | 'nobody' }[] = [
  { label: 'Everyone', value: 'everyone' },
  { label: 'People you follow', value: 'following' },
  { label: 'Your followers', value: 'followers' },
  { label: 'People you follow and your followers', value: 'both' },
  { label: 'No one', value: 'nobody' },
];

export default function CommentsSettingsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [filterOffensive, setFilterOffensive] = useState(true);
  const [filterSpam, setFilterSpam] = useState(true);
  const [selected, setSelected] = useState<string>('everyone');

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSelected(settingsQuery.data.allow_comments_from ?? 'everyone');
      setFilterOffensive(settingsQuery.data.filter_offensive_comments ?? true);
      setFilterSpam(settingsQuery.data.filter_spam_comments ?? true);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => settingsApi.updateSettings(updates as Partial<import('@/utils/settings-api').UserSettings>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  const handleSelectOption = (value: string) => {
    setSelected(value);
    updateMutation.mutate({ allow_comments_from: value });
  };

  const handleFilterOffensive = (value: boolean) => {
    setFilterOffensive(value);
    updateMutation.mutate({ filter_offensive_comments: value });
  };

  const handleFilterSpam = (value: boolean) => {
    setFilterSpam(value);
    updateMutation.mutate({ filter_spam_comments: value });
  };

  if (settingsQuery.isLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Comments', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false }} />
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Comments',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionHeader}>Allow comments from</Text>
        {COMMENT_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.value} style={s.radioRow} onPress={() => handleSelectOption(opt.value)} activeOpacity={0.6}>
            <Text style={s.radioLabel}>{opt.label}</Text>
            <View style={[s.radio, selected === opt.value && s.radioActive]}>
              {selected === opt.value && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Filters</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Hide offensive comments</Text>
            <Text style={s.toggleHint}>Automatically hide comments that may be offensive</Text>
          </View>
          <Switch
            value={filterOffensive}
            onValueChange={handleFilterOffensive}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Hide spam and scams</Text>
            <Text style={s.toggleHint}>Automatically filter out spam comments</Text>
          </View>
          <Switch
            value={filterSpam}
            onValueChange={handleFilterSpam}
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
  sectionHeader: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
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
