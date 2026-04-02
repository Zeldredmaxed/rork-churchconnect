import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Grid3x3, Film } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

type ContentFilter = 'all' | 'posts' | 'shorts';

interface ViewedContent {
  id: string;
  content_type: 'post' | 'clip';
  content_id: string;
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
  viewed_at: string;
}

const FILTERS: { key: ContentFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: null },
  { key: 'posts', label: 'Posts', icon: null },
  { key: 'shorts', label: 'Shorts', icon: null },
];

function formatDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export default function ActivityContentViewedScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState<ContentFilter>('all');

  const viewedQuery = useQuery({
    queryKey: ['activity-viewed', filter],
    queryFn: async () => {
      try {
        const typeMap: Record<ContentFilter, string> = { all: '', posts: 'post', shorts: 'clip' };
        const typeParam = typeMap[filter];
        const param = typeParam ? `?type=${typeParam}` : '';
        const data = await api.get<ViewedContent[]>(`/activity/viewed${param}`);
        console.log('[ActivityViewed] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[ActivityViewed] Error:', e);
        return [] as ViewedContent[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['activity-viewed'] });
  }, [queryClient]);

  const viewed = viewedQuery.data ?? [];

  const renderItem = ({ item }: { item: ViewedContent }) => (
    <TouchableOpacity
      style={s.row}
      activeOpacity={0.6}
      onPress={() => {
        if (item.content_type === 'clip') {
          router.push(`/short-viewer?id=${item.content_id}` as never);
        }
      }}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={s.thumbnail} />
      ) : (
        <View style={s.placeholderThumb}>
          {item.content_type === 'clip' ? (
            <Film size={20} color={theme.colors.textTertiary} />
          ) : (
            <Grid3x3 size={20} color={theme.colors.textTertiary} />
          )}
        </View>
      )}
      <View style={s.rowContent}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        {item.author_name ? <Text style={s.rowAuthor}>{item.author_name}</Text> : null}
        <Text style={s.rowTime}>{formatDate(item.viewed_at)}</Text>
      </View>
      <View style={s.typeBadge}>
        <Text style={s.typeText}>{item.content_type === 'clip' ? 'Short' : 'Post'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Content you\'ve viewed',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterLabel, filter === f.key && s.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={viewed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={viewedQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          viewedQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <EmptyState
              icon={<Eye size={28} color={theme.colors.textTertiary} />}
              title="No viewed content"
              description="Posts and shorts you view will appear here."
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.surfaceElevated },
  filterChipActive: { backgroundColor: theme.colors.text },
  filterLabel: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.textSecondary },
  filterLabelActive: { color: theme.colors.background },
  listContent: { paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated },
  placeholderThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '500' as const, color: theme.colors.text },
  rowAuthor: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  rowTime: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  typeBadge: { backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' as const },
});
