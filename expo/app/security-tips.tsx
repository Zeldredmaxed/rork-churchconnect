import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Lock, Shield, Smartphone, Key, Eye } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

interface Tip {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function SecurityTipsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  const tips: Tip[] = [
    {
      icon: <Key size={20} color={theme.colors.accent} />,
      title: 'Use a strong password',
      description: 'Create a unique password with at least 8 characters, including uppercase, lowercase, numbers, and symbols. Don\'t reuse passwords from other accounts.',
    },
    {
      icon: <Smartphone size={20} color={theme.colors.info} />,
      title: 'Enable two-factor authentication',
      description: 'Add an extra layer of security by requiring a verification code when logging in from a new device.',
    },
    {
      icon: <Eye size={20} color={theme.colors.warning} />,
      title: 'Review login activity',
      description: 'Regularly check where your account is logged in and remove any sessions you don\'t recognize.',
    },
    {
      icon: <Shield size={20} color={theme.colors.success} />,
      title: 'Keep your email up to date',
      description: 'Make sure your recovery email is current so you can reset your password if needed.',
    },
    {
      icon: <Lock size={20} color={theme.colors.error} />,
      title: 'Be cautious of phishing',
      description: 'We will never ask for your password via email or direct message. Be wary of suspicious links or messages.',
    },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Account security',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <Lock size={32} color={theme.colors.accent} />
          </View>
          <Text style={s.heroTitle}>Keep your account safe</Text>
          <Text style={s.heroDesc}>Follow these tips to protect your account from unauthorized access.</Text>
        </View>

        {tips.map((tip, idx) => (
          <View key={idx} style={s.tipCard}>
            <View style={s.tipIcon}>{tip.icon}</View>
            <View style={s.tipContent}>
              <Text style={s.tipTitle}>{tip.title}</Text>
              <Text style={s.tipDesc}>{tip.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 6 },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  tipCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, padding: 14, gap: 12 },
  tipIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.text, marginBottom: 4 },
  tipDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
});
