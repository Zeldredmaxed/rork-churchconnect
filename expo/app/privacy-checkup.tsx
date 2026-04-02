import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Eye, Users, MapPin, Bell, Shield, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

interface CheckItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  key: string;
  defaultValue: boolean;
}

export default function PrivacyCheckupScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  const items: CheckItem[] = [
    { icon: <Eye size={20} color={theme.colors.info} />, title: 'Private account', description: 'Only approved followers can see your posts', key: 'private', defaultValue: false },
    { icon: <Users size={20} color={theme.colors.accent} />, title: 'Activity status', description: 'Let people see when you were last active', key: 'activity', defaultValue: true },
    { icon: <MapPin size={20} color={theme.colors.warning} />, title: 'Location sharing', description: 'Include location with your posts', key: 'location', defaultValue: false },
    { icon: <Bell size={20} color={theme.colors.success} />, title: 'Read receipts', description: 'Let people know when you\'ve read their messages', key: 'readReceipts', defaultValue: true },
  ];

  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.key, i.defaultValue]))
  );

  const handleToggle = (key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allSecure = !settings.activity && settings.private && !settings.location;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Privacy checkup',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <View style={[s.iconCircle, allSecure && s.iconCircleSecure]}>
            {allSecure ? (
              <CheckCircle size={32} color={theme.colors.success} />
            ) : (
              <Shield size={32} color={theme.colors.accent} />
            )}
          </View>
          <Text style={s.heroTitle}>
            {allSecure ? 'Looking good!' : 'Review your privacy'}
          </Text>
          <Text style={s.heroDesc}>
            {allSecure
              ? 'Your privacy settings are configured for maximum protection.'
              : 'Review and adjust these settings to control who can see your information.'}
          </Text>
        </View>

        {items.map((item) => (
          <View key={item.key} style={s.settingRow}>
            <View style={s.settingIcon}>{item.icon}</View>
            <View style={s.settingContent}>
              <Text style={s.settingTitle}>{item.title}</Text>
              <Text style={s.settingDesc}>{item.description}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => handleToggle(item.key)}
              trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accent }}
              thumbColor={theme.colors.white}
            />
          </View>
        ))}

        <View style={s.tipBox}>
          <Shield size={16} color={theme.colors.textTertiary} />
          <Text style={s.tipText}>
            These settings help control who can see your activity and information. Changes take effect immediately.
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
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  iconCircleSecure: { backgroundColor: theme.colors.successMuted },
  heroTitle: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 6 },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  settingDesc: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 24, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 14 },
  tipText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
