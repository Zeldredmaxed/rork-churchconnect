import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Download } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function ArchivingDownloadingScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [saveOriginal, setSaveOriginal] = useState(false);
  const [saveToDevice, setSaveToDevice] = useState(false);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Archiving and downloading',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <Download size={36} color={theme.colors.accent} />
          <Text style={s.heroText}>
            Manage how your content is saved and downloaded.
          </Text>
        </View>

        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Save original photos</Text>
            <Text style={s.toggleHint}>Save photos you post to your device</Text>
          </View>
          <Switch
            value={saveOriginal}
            onValueChange={setSaveOriginal}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={s.divider} />

        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Save posted videos to device</Text>
            <Text style={s.toggleHint}>Automatically save videos you post to your device</Text>
          </View>
          <Switch
            value={saveToDevice}
            onValueChange={setSaveToDevice}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Download your data</Text>
        <Text style={s.sectionDesc}>
          Request a copy of what you've shared on Shepherd. This may take up to 48 hours.
        </Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 32, gap: 12 },
  heroText: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: theme.colors.text, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionDesc: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, lineHeight: 18 },
});
