import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Heart, MessageSquare, Clock, Eye, Trash2, ChevronRight, Activity } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function YourActivityScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const items = [
    { icon: <Heart size={22} color={theme.colors.textSecondary} />, label: 'Interactions', sub: 'Likes, comments, and shares', route: '/activity-interactions' },
    { icon: <MessageSquare size={22} color={theme.colors.textSecondary} />, label: 'Comments', sub: 'Review and delete comments', route: '/activity-comments' },
    { icon: <Clock size={22} color={theme.colors.textSecondary} />, label: 'Time spent', sub: 'View daily average', route: '/time-spent' },
    { icon: <Eye size={22} color={theme.colors.textSecondary} />, label: 'Content you\'ve viewed', sub: 'Posts and shorts viewed', route: '/activity-content-viewed' },
    { icon: <Trash2 size={22} color={theme.colors.textSecondary} />, label: 'Recently deleted', sub: 'Posts, shorts, and stories', route: '/activity-recently-deleted' },
  ];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Your activity',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.iconContainer}>
          <Activity size={48} color={theme.colors.accent} />
        </View>
        <Text style={s.title}>Your activity</Text>
        <Text style={s.description}>
          Review and manage your activity, including interactions, content you've viewed, and more.
        </Text>
        <View style={s.divider} />
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
  iconContainer: { alignItems: 'center', marginTop: 32, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 8 },
  description: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24, lineHeight: 20 },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowIcon: { width: 28, alignItems: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  rowSub: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
});
