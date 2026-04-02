import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Type, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function HiddenWordsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [hideOffensive, setHideOffensive] = useState(true);
  const [customWords, setCustomWords] = useState('');
  const [customList, setCustomList] = useState<string[]>([]);

  const addWord = () => {
    const word = customWords.trim();
    if (word && !customList.includes(word)) {
      setCustomList([...customList, word]);
      setCustomWords('');
    }
  };

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
            onValueChange={setHideOffensive}
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
            onSubmitEditing={addWord}
            returnKeyType="done"
          />
          <TouchableOpacity style={s.addButton} onPress={addWord}>
            <Plus size={18} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        {customList.length > 0 && (
          <View style={s.chipContainer}>
            {customList.map((word, idx) => (
              <TouchableOpacity key={idx} style={s.chip} onPress={() => setCustomList(customList.filter((_, i) => i !== idx))}>
                <Text style={s.chipText}>{word}</Text>
                <Text style={s.chipRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {customList.length === 0 && (
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
  toggleLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, lineHeight: 18 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16, marginVertical: 8 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: theme.colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionDesc: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, marginBottom: 16, lineHeight: 18 },
  inputRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  input: { flex: 1, backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 14, height: 42, fontSize: 15, color: theme.colors.text },
  addButton: { width: 42, height: 42, borderRadius: 10, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  chipText: { fontSize: 14, color: theme.colors.text },
  chipRemove: { fontSize: 18, color: theme.colors.textTertiary, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary },
});
