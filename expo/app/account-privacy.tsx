import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi } from '@/utils/settings-api';

export default function AccountPrivacyScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [isPrivate, setIsPrivate] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setIsPrivate(settingsQuery.data.is_private_account ?? false);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (value: boolean) => settingsApi.updateSettings({ is_private_account: value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  const handleToggle = (value: boolean) => {
    setIsPrivate(value);
    updateMutation.mutate(value);
  };

  if (settingsQuery.isLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Account privacy', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false }} />
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Account privacy',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.row}>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Private account</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={handleToggle}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>
        <Text style={s.hint}>
          When your account is private, only people you approve can see your posts, followers list, and following list.
        </Text>
        <View style={s.divider} />
        <View style={s.infoBox}>
          <Lock size={20} color={theme.colors.textTertiary} />
          <Text style={s.infoText}>
            Your existing followers won't be affected. Posts you share to other apps may be visible to anyone, depending on the privacy settings for those apps.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 16, color: theme.colors.text },
  hint: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, lineHeight: 18, marginTop: 4 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginVertical: 20, marginHorizontal: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: 16, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
});
