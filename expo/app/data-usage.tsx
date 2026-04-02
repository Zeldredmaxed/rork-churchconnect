import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function DataUsageScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [dataSaver, setDataSaver] = useState(false);
  const [autoplayWifi, setAutoplayWifi] = useState(true);
  const [autoplayCellular, setAutoplayCellular] = useState(false);
  const [highQualityUploads, setHighQualityUploads] = useState(true);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Data usage and media quality',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <BarChart3 size={36} color={theme.colors.accent} />
        </View>

        <Text style={s.sectionHeader}>Data saver</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Use less data</Text>
            <Text style={s.toggleHint}>Load lower-quality media to reduce data usage on cellular</Text>
          </View>
          <Switch value={dataSaver} onValueChange={setDataSaver} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Video autoplay</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>On Wi-Fi</Text>
          </View>
          <Switch value={autoplayWifi} onValueChange={setAutoplayWifi} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>On cellular</Text>
          </View>
          <Switch value={autoplayCellular} onValueChange={setAutoplayCellular} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
        </View>

        <View style={s.divider} />

        <Text style={s.sectionHeader}>Upload quality</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Upload at highest quality</Text>
            <Text style={s.toggleHint}>This may use more data and take longer to upload</Text>
          </View>
          <Switch value={highQualityUploads} onValueChange={setHighQualityUploads} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }} thumbColor={theme.colors.white} />
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
