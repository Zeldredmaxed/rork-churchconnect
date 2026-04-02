import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { UserX, KeyRound, Mail, Shield, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; route: string };
}

export default function HackedAccountScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const steps: Step[] = [
    {
      icon: <KeyRound size={20} color={theme.colors.error} />,
      title: 'Step 1: Change your password',
      description: 'If you can still log in, change your password immediately. Use a strong, unique password that you don\'t use anywhere else.',
      action: { label: 'Change password', route: '/change-password' },
    },
    {
      icon: <Mail size={20} color={theme.colors.warning} />,
      title: 'Step 2: Check your email',
      description: 'Verify that the email address linked to your account hasn\'t been changed. If it has, change it back to your own email.',
    },
    {
      icon: <Shield size={20} color={theme.colors.info} />,
      title: 'Step 3: Review active sessions',
      description: 'Check where your account is currently logged in and log out of any sessions you don\'t recognize.',
      action: { label: 'View sessions', route: '/active-sessions' },
    },
    {
      icon: <AlertTriangle size={20} color={theme.colors.accent} />,
      title: 'Step 4: Report to support',
      description: 'If you\'re still having trouble accessing your account, contact our support team for additional help recovering your account.',
      action: { label: 'Report problem', route: '/report-problem' },
    },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Hacked account',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <UserX size={32} color={theme.colors.error} />
          </View>
          <Text style={s.heroTitle}>Think your account was hacked?</Text>
          <Text style={s.heroDesc}>
            Follow these steps to secure your account and regain control.
          </Text>
        </View>

        {steps.map((step, idx) => (
          <View key={idx} style={s.stepCard}>
            <View style={s.stepIcon}>{step.icon}</View>
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.description}</Text>
              {step.action && (
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => router.push(step.action!.route as never)}
                  activeOpacity={0.7}
                >
                  <Text style={s.actionText}>{step.action.label}</Text>
                  <ChevronRight size={14} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={s.warningBox}>
          <AlertTriangle size={16} color={theme.colors.warning} />
          <Text style={s.warningText}>
            If you suspect unauthorized activity, act quickly. The sooner you secure your account, the less damage can be done.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.errorMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 6, textAlign: 'center' },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  stepCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, padding: 14, gap: 12 },
  stepIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.text, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  actionText: { fontSize: 14, fontWeight: '600' as const, color: theme.colors.accent },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: theme.colors.warningMuted, borderRadius: 12, padding: 14 },
  warningText: { flex: 1, fontSize: 13, color: theme.colors.warning, lineHeight: 18 },
});
