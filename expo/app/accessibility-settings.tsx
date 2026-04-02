import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Accessibility } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function AccessibilitySettingsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [autoCaption, setAutoCaption] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Accessibility',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <Accessibility size={36} color={theme.colors.accent} />
        </View>

        <Text style={s.sectionHeader}>Media</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Auto-generated captions</Text>
            <Text style={s.toggleHint}>Show captions on videos when available</Text>
          </View>
          <Switch value={autoCaption} onValueChange={setAutoCaption} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Display</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Larger text</Text>
            <Text style={s.toggleHint}>Increase text size throughout the app</Text>
          </View>
          <Switch value={largeText} onValueChange={setLargeText} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Reduce motion</Text>
            <Text style={s.toggleHint}>Limit animations and motion effects</Text>
          </View>
          <Switch value={reduceMotion} onValueChange={setReduceMotion} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Translations</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Auto-translate posts</Text>
            <Text style={s.toggleHint}>Automatically translate posts written in other languages</Text>
          </View>
          <Switch value={autoTranslate} onValueChange={setAutoTranslate} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  sectionHeader: { fontSize: 14, fontWeight: '500', color: theme.colors.textTertiary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16, marginVertical: 4 },
});
