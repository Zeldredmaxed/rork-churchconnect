import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Camera, Mic, MapPin, Bell, Image, ChevronRight, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function DevicePermissionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  const permissions = [
    { icon: <Camera size={22} color={theme.colors.textSecondary} />, label: 'Camera', status: 'Allowed' },
    { icon: <Mic size={22} color={theme.colors.textSecondary} />, label: 'Microphone', status: 'Allowed' },
    { icon: <Image size={22} color={theme.colors.textSecondary} />, label: 'Photos', status: 'Allowed' },
    { icon: <MapPin size={22} color={theme.colors.textSecondary} />, label: 'Location', status: 'Not set' },
    { icon: <Bell size={22} color={theme.colors.textSecondary} />, label: 'Notifications', status: 'Allowed' },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Device permissions',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroSection}>
          <Smartphone size={36} color={theme.colors.accent} />
          <Text style={s.heroText}>
            Manage what this app can access on your device. You can change these in your device settings at any time.
          </Text>
        </View>
        {permissions.map((perm, idx) => (
          <TouchableOpacity key={idx} style={s.row} activeOpacity={0.6}>
            <View style={s.rowIcon}>{perm.icon}</View>
            <Text style={s.rowLabel}>{perm.label}</Text>
            <Text style={[s.rowStatus, perm.status === 'Allowed' ? s.statusAllowed : s.statusNotSet]}>{perm.status}</Text>
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
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 32, gap: 12 },
  heroText: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowIcon: { width: 28, alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 15, color: theme.colors.text },
  rowStatus: { fontSize: 13, marginRight: 4 },
  statusAllowed: { color: theme.colors.success },
  statusNotSet: { color: theme.colors.textTertiary },
});
