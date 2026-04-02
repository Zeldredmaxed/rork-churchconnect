import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function AboutScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'About',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fv408whgqhsmotq5f9m63' }}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.version}>Version 1.0.0</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>App name</Text>
            <Text style={s.cardValue}>Shepherd</Text>
          </View>
          <View style={s.cardDivider} />
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Version</Text>
            <Text style={s.cardValue}>1.0.0</Text>
          </View>
          <View style={s.cardDivider} />
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Build</Text>
            <Text style={s.cardValue}>2026.04.01</Text>
          </View>
        </View>

        <View style={s.legalSection}>
          <Text style={s.legalTitle}>Legal</Text>
          <Text style={s.legalLink}>Terms of Service</Text>
          <Text style={s.legalLink}>Privacy Policy</Text>
          <Text style={s.legalLink}>Community Guidelines</Text>
          <Text style={s.legalLink}>Open Source Licenses</Text>
        </View>

        <Text style={s.copyright}>© 2026 Shepherd. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  logo: { width: 120, height: 32, marginBottom: 8 },
  version: { fontSize: 14, color: theme.colors.textTertiary },
  card: { marginHorizontal: 16, backgroundColor: theme.colors.surfaceElevated, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  cardLabel: { fontSize: 15, color: theme.colors.textSecondary },
  cardValue: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  cardDivider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginLeft: 16 },
  legalSection: { paddingHorizontal: 16, marginBottom: 24 },
  legalTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.textTertiary, marginBottom: 12 },
  legalLink: { fontSize: 15, color: theme.colors.accent, paddingVertical: 10 },
  copyright: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'center' },
});
