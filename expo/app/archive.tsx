import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Clock, Film, Grid3x3, ChevronRight, ImageIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi } from '@/utils/settings-api';

export default function ArchiveScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const postsQuery = useQuery({
    queryKey: ['archive', 'post'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getArchive('post');
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    },
  });

  const clipsQuery = useQuery({
    queryKey: ['archive', 'clip'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getArchive('clip');
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    },
  });

  const storiesQuery = useQuery({
    queryKey: ['archive', 'story'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getArchive('story');
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    },
  });

  const sections = [
    { icon: <Grid3x3 size={22} color={theme.colors.textSecondary} />, label: 'Posts', count: postsQuery.data?.length ?? 0, route: '/archive-posts' },
    { icon: <Film size={22} color={theme.colors.textSecondary} />, label: 'Shorts', count: clipsQuery.data?.length ?? 0, route: '/archive-shorts' },
    { icon: <ImageIcon size={22} color={theme.colors.textSecondary} />, label: 'Stories', count: storiesQuery.data?.length ?? 0, route: '/archive-stories' },
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
