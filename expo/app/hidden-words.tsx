import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Type, Plus, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi, type HiddenWord } from '@/utils/settings-api';

export default function HiddenWordsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [hideOffensive, setHideOffensive] = useState(true);
  const [customWords, setCustomWords] = useState('');

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  const wordsQuery = useQuery({
    queryKey: ['hidden-words'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getHiddenWords();
        console.log('[HiddenWords] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[HiddenWords] Error:', e);
        return [] as HiddenWord[];
      }
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setHideOffensive(settingsQuery.data.hide_offensive_words ?? true);
    }
  }, [settingsQuery.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: (value: boolean) => settingsApi.updateSettings({ hide_offensive_words: value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  const addWordMutation = useMutation({
    mutationFn: (word: string) => settingsApi.addHiddenWord(word),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hidden-words'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCustomWords('');
    },
    onError: (err) => {
      console.log('[HiddenWords] Add error:', err);
      Alert.alert('Error', 'Failed to add word.');
    },
  });

  const removeWordMutation = useMutation({
    mutationFn: (wordId: string) => settingsApi.removeHiddenWord(wordId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hidden-words'] });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (err) => {
      console.log('[HiddenWords] Remove error:', err);
      Alert.alert('Error', 'Failed to remove word.');
    },
  });

  const handleToggleOffensive = (value: boolean) => {
    setHideOffensive(value);
    updateSettingsMutation.mutate(value);
  };

  const handleAddWord = () => {
    const word = customWords.trim();
    if (!word) return;
    const existing = wordsQuery.data ?? [];
    if (existing.some((w) => w.word.toLowerCase() === word.toLowerCase())) {
      Alert.alert('Duplicate', 'This word is already in your list.');
      return;
    }
    addWordMutation.mutate(word);
  };

  const wordsList = wordsQuery.data ?? [];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Hidden words',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Hide offensive words and phrases</Text>
            <Text style={s.toggleHint}>Automatically hide comments and messages that contain commonly reported offensive words and phrases</Text>
          </View>
          <Switch
            value={hideOffensive}
            onValueChange={handleToggleOffensive}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Custom words and phrases</Text>
        <Text style={s.sectionDesc}>
          Add specific words, phrases, or emojis that you'd like to filter from comments and messages.
        </Text>

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Add a word or phrase"
            placeholderTextColor={theme.colors.textTertiary}
            value={customWords}
            onChangeText={setCustomWords}
            onSubmitEditing={handleAddWord}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addButton, addWordMutation.isPending && s.addButtonDisabled]}
            onPress={handleAddWord}
            disabled={addWordMutation.isPending}
          >
            {addWordMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Plus size={18} color={theme.colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {wordsQuery.isLoading ? (
          <View style={s.loadingState}><ActivityIndicator size="small" color={theme.colors.accent} /></View>
        ) : wordsList.length > 0 ? (
          <View style={s.chipContainer}>
            {wordsList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.chip}
                onPress={() => removeWordMutation.mutate(item.id)}
              >
                <Text style={s.chipText}>{item.word}</Text>
                <X size={14} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Type size={24} color={theme.colors.textTertiary} />
            <Text style={s.emptyText}>No custom words added yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, lineHeight: 18 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16, marginVertical: 8 },
  sectionHeader: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionDesc: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, marginBottom: 16, lineHeight: 18 },
  inputRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  input: { flex: 1, backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 14, height: 42, fontSize: 15, color: theme.colors.text },
  addButton: { width: 42, height: 42, borderRadius: 10, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { opacity: 0.6 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  chipText: { fontSize: 14, color: theme.colors.text },
  loadingState: { alignItems: 'center', paddingTop: 32 },
  emptyState: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary },
});
