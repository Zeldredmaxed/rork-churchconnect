import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HelpCircle, BookOpen, MessageCircle, Flag, ChevronRight, FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function HelpScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const items = [
    { icon: <BookOpen size={22} color={theme.colors.textSecondary} />, label: 'Help Centre', sub: 'Get answers to common questions', route: '/help-centre' },
    { icon: <MessageCircle size={22} color={theme.colors.textSecondary} />, label: 'Support requests', sub: 'View your open support cases', route: '/support-requests' },
    { icon: <Flag size={22} color={theme.colors.textSecondary} />, label: 'Report a problem', sub: 'Let us know about bugs or issues', route: '/report-problem' },
    { icon: <FileText size={22} color={theme.colors.textSecondary} />, label: 'Terms of Service', sub: 'Review our terms and policies', route: '/terms-of-service' },
    { icon: <FileText size={22} color={theme.colors.textSecondary} />, label: 'Privacy Policy', sub: 'How we handle your data', route: '/privacy-policy' },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Help',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <HelpCircle size={48} color={theme.colors.accent} />
          <Text style={s.heroTitle}>How can we help?</Text>
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
  heroSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 12 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowIcon: { width: 28, alignItems: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  rowSub: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
});
