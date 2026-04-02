import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { MonitorSmartphone } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function WebsitePermissionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Website permissions',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.emptyContainer}>
          <View style={s.iconCircle}>
            <MonitorSmartphone size={32} color={theme.colors.textTertiary} />
          </View>
          <Text style={s.emptyTitle}>Website permissions</Text>
          <Text style={s.emptyText}>
            Websites you visit through the app can request permissions like camera and microphone access. Permissions you've granted will appear here.
          </Text>
          <Text style={s.emptySubText}>No website permissions granted</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptySubText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
});
