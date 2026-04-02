import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi } from '@/utils/settings-api';

export default function LikeShareCountsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [hideLikeCounts, setHideLikeCounts] = useState(false);
  const [hideShareCounts, setHideShareCounts] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setHideLikeCounts(settingsQuery.data.hide_like_counts ?? false);
      setHideShareCounts(settingsQuery.data.hide_share_counts ?? false);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => settingsApi.updateSettings(updates as Partial<import('@/utils/settings-api').UserSettings>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  const handleToggleLikes = (value: boolean) => {
    setHideLikeCounts(value);
    updateMutation.mutate({ hide_like_counts: value });
  };

  const handleToggleShares = (value: boolean) => {
    setHideShareCounts(value);
    updateMutation.mutate({ hide_share_counts: value });
  };

  if (settingsQuery.isLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Like and share counts', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false }} />
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Like and share counts',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <Heart size={32} color={theme.colors.accent} />
          </View>
          <Text style={s.heroDesc}>
            Decide whether other people can see how many likes and shares your posts get.
          </Text>
        </View>

        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Hide like counts</Text>
            <Text style={s.toggleHint}>The number of likes on your posts will be hidden from others</Text>
          </View>
          <Switch
            value={hideLikeCounts}
            onValueChange={handleToggleLikes}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={s.divider} />

        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Hide share counts</Text>
            <Text style={s.toggleHint}>The number of shares on your posts will be hidden from others</Text>
          </View>
          <Switch
            value={hideShareCounts}
            onValueChange={handleToggleShares}
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
  heroSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2, lineHeight: 18 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16 },
});
