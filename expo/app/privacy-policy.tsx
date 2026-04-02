import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide directly, such as your name, email address, profile photo, and content you post. We also collect usage data, device information, and log data to improve our services.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to provide and improve the app, personalize your experience, communicate with you, and ensure the safety and security of our community.',
  },
  {
    title: '3. Sharing Your Information',
    body: 'We do not sell your personal information. We may share information with service providers who assist in operating the app, when required by law, or to protect our rights and safety.',
  },
  {
    title: '4. Data Storage & Security',
    body: 'Your data is stored securely using industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information.',
  },
  {
    title: '5. Your Rights',
    body: 'You have the right to access, correct, or delete your personal information. You can download your data or request account deletion through the app settings.',
  },
  {
    title: '6. Cookies & Tracking',
    body: 'We use minimal tracking necessary for app functionality. We do not use third-party advertising trackers. Analytics data is anonymized and used solely to improve the app experience.',
  },
  {
    title: '7. Children\'s Privacy',
    body: 'The app is not intended for children under 13. We do not knowingly collect personal information from children. If we discover such data has been collected, we will delete it promptly.',
  },
  {
    title: '8. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of any material changes through the app or via email.',
  },
  {
    title: '9. Contact Us',
    body: 'If you have questions about this Privacy Policy, please contact our support team through the Help section in the app.',
  },
];

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <Shield size={36} color={theme.colors.accent} />
          <Text style={s.heroTitle}>Privacy Policy</Text>
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
