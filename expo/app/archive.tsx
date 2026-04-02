import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Clock, Image, Film, Grid3x3, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function ArchiveScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const sections = [
    { icon: <Grid3x3 size={22} color={theme.colors.textSecondary} />, label: 'Posts', count: 0, route: '/archive-posts' },
    { icon: <Film size={22} color={theme.colors.textSecondary} />, label: 'Shorts', count: 0, route: '/archive-shorts' },
    { icon: <Image size={22} color={theme.colors.textSecondary} />, label: 'Stories', count: 0, route: '/archive-stories' },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Archive',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.iconContainer}>
          <Clock size={48} color={theme.colors.textTertiary} />
        </View>
        <Text style={s.description}>
          When you archive posts, shorts, or stories, they'll appear here. Only you can see your archived content.
        </Text>
        {sections.map((item, idx) => (
          <TouchableOpacity key={idx} style={s.row} activeOpacity={0.6} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as never); }}>
            <View style={s.rowIcon}>{item.icon}</View>
            <Text style={s.rowLabel}>{item.label}</Text>
            <View style={s.rowRight}>
              <Text style={s.rowCount}>{item.count}</Text>
              <ChevronRight size={16} color={theme.colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  iconContainer: { alignItems: 'center', marginTop: 40, marginBottom: 16 },
  description: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', paddingHorizontal: 40, marginBottom: 32, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowIcon: { width: 28, alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 16, color: theme.colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowCount: { fontSize: 14, color: theme.colors.textTertiary },
});
