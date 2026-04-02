import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { AlertCircle, Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function LimitInteractionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [limitEnabled, setLimitEnabled] = useState(false);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Limit interactions',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <Shield size={36} color={theme.colors.accent} />
          </View>
          <Text style={s.heroTitle}>Limit unwanted interactions</Text>
          <Text style={s.heroDesc}>
            Temporarily limit comments and messages from accounts that don't follow you or that recently followed you.
          </Text>
        </View>

        <View style={s.toggleRow}>
          <View style={s.toggleContent}>
            <Text style={s.toggleLabel}>Limit interactions</Text>
            <Text style={s.toggleHint}>Comments and messages from accounts that don't follow you will be hidden</Text>
          </View>
          <Switch
            value={limitEnabled}
            onValueChange={setLimitEnabled}
            trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
            thumbColor={theme.colors.white}
          />
        </View>

        <View style={s.infoBox}>
          <AlertCircle size={18} color={theme.colors.info} />
          <Text style={s.infoText}>
            This setting is useful if you're experiencing a surge of unwanted attention. You can turn it off at any time.
          </Text>
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
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  toggleContent: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 16, fontWeight: '500', color: theme.colors.text },
  toggleHint: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, lineHeight: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: 16, marginTop: 16, backgroundColor: theme.colors.infoMuted, borderRadius: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
});
