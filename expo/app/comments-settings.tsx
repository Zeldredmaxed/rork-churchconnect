import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function CommentsSettingsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [filterOffensive, setFilterOffensive] = useState(true);
  const [filterSpam, setFilterSpam] = useState(true);

  const commentOptions = ['Everyone', 'People you follow', 'Your followers', 'People you follow and your followers', 'No one'];
  const [selected, setSelected] = useState(0);

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
        {commentOptions.map((opt, idx) => (
          <TouchableOpacity key={idx} style={s.radioRow} onPress={() => setSelected(idx)} activeOpacity={0.6}>
            <Text style={s.radioLabel}>{opt}</Text>
            <View style={[s.radio, selected === idx && s.radioActive]}>
              {selected === idx && <View style={s.radioDot} />}
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
            onValueChange={setFilterOffensive}
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
            onValueChange={setFilterSpam}
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
  sectionHeader: { fontSize: 16, fontWeight: '600', color: theme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
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
