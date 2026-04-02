import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function AccountPrivacyScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Account privacy',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.row}>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Private account</Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>
        <Text style={s.hint}>
          When your account is private, only people you approve can see your posts, followers list, and following list.
        </Text>
        <View style={s.divider} />
        <View style={s.infoBox}>
          <Lock size={20} color={theme.colors.textTertiary} />
          <Text style={s.infoText}>
            Your existing followers won't be affected. Posts you share to other apps may be visible to anyone, depending on the privacy settings for those apps.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 16, color: theme.colors.text },
  hint: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, lineHeight: 18, marginTop: 4 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginVertical: 20, marginHorizontal: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: 16, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
});
