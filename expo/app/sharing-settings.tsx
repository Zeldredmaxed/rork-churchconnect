import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function SharingSettingsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [allowSharing, setAllowSharing] = useState(true);
  const [allowReshare, setAllowReshare] = useState(true);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Sharing',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Allow sharing to messages</Text>
            <Text style={s.toggleHint}>Let others share your posts and shorts as messages</Text>
          </View>
          <Switch
            value={allowSharing}
            onValueChange={setAllowSharing}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>
        <View style={s.divider} />
        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Allow resharing to stories</Text>
            <Text style={s.toggleHint}>Let others reshare your posts and shorts to their stories</Text>
          </View>
          <Switch
            value={allowReshare}
            onValueChange={setAllowReshare}
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
  content: { paddingBottom: 40, paddingTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16 },
});
