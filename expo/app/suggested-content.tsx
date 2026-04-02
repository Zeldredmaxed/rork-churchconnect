import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Eye } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function SuggestedContentScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [showSuggested, setShowSuggested] = useState(true);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Suggested content',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <Eye size={32} color={theme.colors.accent} />
          </View>
          <Text style={s.heroTitle}>Suggested content</Text>
          <Text style={s.heroDesc}>
            Control the types of suggested content you see. This includes posts and shorts from accounts you don't follow.
          </Text>
        </View>

        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Show suggested posts in feed</Text>
            <Text style={s.toggleHint}>See recommended posts from the community in your main feed</Text>
          </View>
          <Switch
            value={showSuggested}
            onValueChange={setShowSuggested}
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
  heroSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2, lineHeight: 18 },
});
