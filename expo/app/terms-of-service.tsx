import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the app, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the app.',
  },
  {
    title: '2. Use of Service',
    body: 'You may use the app for lawful purposes only. You agree not to use the service to upload, post, or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.',
  },
  {
    title: '3. User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.',
  },
  {
    title: '4. Content',
    body: 'You retain ownership of any content you post. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, modify, and display your content in connection with the service.',
  },
  {
    title: '5. Privacy',
    body: 'Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using the app, you agree to our Privacy Policy.',
  },
  {
    title: '6. Termination',
    body: 'We may terminate or suspend your account at any time, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.',
  },
  {
    title: '7. Changes to Terms',
    body: 'We reserve the right to modify these terms at any time. We will notify users of any significant changes. Your continued use of the app after changes constitutes acceptance of the modified terms.',
  },
  {
    title: '8. Contact',
    body: 'If you have questions about these Terms of Service, please contact our support team through the app.',
  },
];

export default function TermsOfServiceScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <FileText size={36} color={theme.colors.accent} />
          <Text style={s.heroTitle}>Terms of Service</Text>
          <Text style={s.lastUpdated}>Last updated: March 2026</Text>
        </View>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <Text style={s.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700' as const, color: theme.colors.text },
  lastUpdated: { fontSize: 13, color: theme.colors.textTertiary },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.text, marginBottom: 6 },
  sectionBody: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
});
