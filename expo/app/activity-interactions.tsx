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
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Share2, ThumbsUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

type InteractionType = 'all' | 'like' | 'comment' | 'share';

interface Interaction {
  id: string;
  type: 'like' | 'comment' | 'share';
  target_type: string;
  target_id: string;
  target_title?: string;
  target_thumbnail?: string;
  created_at: string;
  content?: string;
}

const FILTERS: { key: InteractionType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'like', label: 'Likes' },
  { key: 'comment', label: 'Comments' },
  { key: 'share', label: 'Shares' },
];

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function getInteractionIcon(type: string, theme: AppTheme) {
  switch (type) {
    case 'like':
      return <Heart size={16} color={theme.colors.error} fill={theme.colors.error} />;
    case 'comment':
      return <MessageCircle size={16} color={theme.colors.info} />;
    case 'share':
      return <Share2 size={16} color={theme.colors.accent} />;
    default:
      return <ThumbsUp size={16} color={theme.colors.textSecondary} />;
  }
}

export default function ActivityInteractionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<InteractionType>('all');

  const interactionsQuery = useQuery({
    queryKey: ['activity-interactions', filter],
    queryFn: async () => {
      try {
        const param = filter === 'all' ? '' : `?type=${filter}`;
        const data = await api.get<Interaction[]>(`/activity/interactions${param}`);
        console.log('[ActivityInteractions] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[ActivityInteractions] Error:', e);
        return [] as Interaction[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['activity-interactions'] });
  }, [queryClient]);

  const interactions = interactionsQuery.data ?? [];

  const renderItem = ({ item }: { item: Interaction }) => (
    <View style={s.row}>
      <View style={[s.iconBubble, { backgroundColor: item.type === 'like' ? theme.colors.errorMuted : item.type === 'comment' ? theme.colors.infoMuted : theme.colors.accentMuted }]}>
        {getInteractionIcon(item.type, theme)}
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {item.type === 'like' ? 'Liked' : item.type === 'comment' ? 'Commented on' : 'Shared'}{' '}
          <Text style={s.rowTarget}>{item.target_title || `a ${item.target_type}`}</Text>
        </Text>
        {item.content ? <Text style={s.rowBody} numberOfLines={2}>{item.content}</Text> : null}
        <Text style={s.rowTime}>{formatTimeAgo(item.created_at)}</Text>
      </View>
      {item.target_thumbnail ? (
        <Image source={{ uri: item.target_thumbnail }} style={s.thumbnail} />
      ) : null}
    </View>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Interactions',
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
        data={interactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={interactionsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          interactionsQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <EmptyState
              icon={<Heart size={28} color={theme.colors.textTertiary} />}
              title="No interactions yet"
              description="Your likes, comments, and shares will appear here."
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  iconBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, color: theme.colors.text },
  rowTarget: { fontWeight: '600' as const },
  rowBody: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  rowTime: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 3 },
  thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated },
});
