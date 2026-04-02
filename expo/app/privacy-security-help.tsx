import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Shield, Lock, Eye, AlertTriangle, UserX, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function PrivacySecurityHelpScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const items = [
    { icon: <Lock size={22} color={theme.colors.textSecondary} />, label: 'Account security', sub: 'Tips to keep your account safe', route: '/security-tips' },
    { icon: <Eye size={22} color={theme.colors.textSecondary} />, label: 'Privacy checkup', sub: 'Review your privacy settings', route: '/privacy-checkup' },
    { icon: <AlertTriangle size={22} color={theme.colors.textSecondary} />, label: 'Report something', sub: 'Report harassment, abuse, or scams', route: '/report-abuse' },
    { icon: <UserX size={22} color={theme.colors.textSecondary} />, label: 'Hacked accounts', sub: 'Steps to recover your account', route: '/hacked-account' },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Privacy and security help',
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
          <Text style={s.heroTitle}>Privacy & security</Text>
          <Text style={s.heroDesc}>
            Learn how to protect your account and manage your privacy settings.
          </Text>
        </View>
        {items.map((item, idx) => (
          <TouchableOpacity key={idx} style={s.row} activeOpacity={0.6} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as never); }}>
            <View style={s.rowIcon}>{item.icon}</View>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Text style={s.rowSub}>{item.sub}</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        ))}
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowIcon: { width: 28, alignItems: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  rowSub: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
});
