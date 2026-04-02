import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function TagsMentionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [allowMentions, setAllowMentions] = useState(true);

  const tagOptions = ['Everyone', 'People you follow', 'No one'];
  const [selectedTag, setSelectedTag] = useState(0);

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
        {tagOptions.map((opt, idx) => (
          <TouchableOpacity key={idx} style={s.radioRow} onPress={() => setSelectedTag(idx)} activeOpacity={0.6}>
            <Text style={s.radioLabel}>{opt}</Text>
            <View style={[s.radio, selectedTag === idx && s.radioActive]}>
              {selectedTag === idx && <View style={s.radioDot} />}
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
            onValueChange={setAllowMentions}
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
  content: { paddingBottom: 40 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: theme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
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
