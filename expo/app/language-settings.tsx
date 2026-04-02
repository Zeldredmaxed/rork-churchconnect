import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Check, Languages } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi } from '@/utils/settings-api';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'Portuguese', 'German',
  'Italian', 'Korean', 'Japanese', 'Chinese (Simplified)',
  'Arabic', 'Hindi', 'Swahili', 'Tagalog', 'Vietnamese',
];

export default function LanguageSettingsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState('English');

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data?.language) {
      setSelected(settingsQuery.data.language);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (language: string) => settingsApi.updateSettings({ language }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleSelect = (lang: string) => {
    setSelected(lang);
    updateMutation.mutate(lang);
  };

  if (settingsQuery.isLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Language', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, headerShadowVisible: false }} />
        <View style={s.loadingContainer}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Language',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <Languages size={32} color={theme.colors.accent} />
          <Text style={s.heroText}>Choose your preferred language for the app.</Text>
        </View>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity key={lang} style={s.row} onPress={() => handleSelect(lang)} activeOpacity={0.6}>
            <Text style={[s.rowLabel, selected === lang && s.rowLabelActive]}>{lang}</Text>
            {selected === lang && <Check size={18} color={theme.colors.accent} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, gap: 10 },
  heroText: { fontSize: 14, color: theme.colors.textTertiary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowLabel: { flex: 1, fontSize: 16, color: theme.colors.text },
  rowLabelActive: { color: theme.colors.accent, fontWeight: '600' as const },
});
