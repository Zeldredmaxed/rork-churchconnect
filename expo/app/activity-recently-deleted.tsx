import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, Grid3x3, Film, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface DeletedItem {
  id: string;
  content_type: 'post' | 'clip' | 'story';
  title?: string;
  thumbnail_url?: string;
  deleted_at: string;
  expires_at: string;
}

function daysUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const exp = new Date(expiresAt);
  return Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getTypeIcon(type: string, theme: AppTheme) {
  switch (type) {
    case 'clip': return <Film size={20} color={theme.colors.textTertiary} />;
    case 'story': return <Clock size={20} color={theme.colors.textTertiary} />;
    default: return <Grid3x3 size={20} color={theme.colors.textTertiary} />;
  }
}

export default function ActivityRecentlyDeletedScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const deletedQuery = useQuery({
    queryKey: ['activity-recently-deleted'],
    queryFn: async () => {
      try {
        const data = await api.get<DeletedItem[]>('/activity/recently-deleted');
        console.log('[RecentlyDeleted] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[RecentlyDeleted] Error:', e);
        return [] as DeletedItem[];
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (itemId: string) => api.post(`/activity/recently-deleted/${itemId}/restore`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activity-recently-deleted'] });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/activity/recently-deleted/${itemId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activity-recently-deleted'] });
    },
  });

  const handleRestore = useCallback((id: string) => {
    Alert.alert('Restore', 'Restore this content?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => restoreMutation.mutate(id) },
    ]);
  }, [restoreMutation]);

  const handlePermanentDelete = useCallback((id: string) => {
    Alert.alert('Delete Permanently', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => permanentDeleteMutation.mutate(id) },
    ]);
  }, [permanentDeleteMutation]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['activity-recently-deleted'] });
  }, [queryClient]);

  const items = deletedQuery.data ?? [];

  const renderItem = ({ item }: { item: DeletedItem }) => {
    const daysLeft = daysUntilExpiry(item.expires_at);
    return (
      <View style={s.row}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={s.thumbnail} />
        ) : (
          <View style={s.placeholderThumb}>{getTypeIcon(item.content_type, theme)}</View>
        )}
        <View style={s.rowContent}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.title || `Deleted ${item.content_type}`}</Text>
          <Text style={s.rowMeta}>{item.content_type} · {daysLeft} days left</Text>
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={s.restoreBtn} onPress={() => handleRestore(item.id)} activeOpacity={0.7}>
            <RotateCcw size={14} color={theme.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.permanentDeleteBtn} onPress={() => handlePermanentDelete(item.id)} activeOpacity={0.7}>
            <Trash2 size={14} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Recently deleted',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={s.infoBanner}>
        <Text style={s.infoText}>
          Content you delete will remain here for 30 days before being permanently removed.
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={deletedQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          deletedQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <EmptyState
              icon={<Trash2 size={28} color={theme.colors.textTertiary} />}
              title="Nothing here"
              description="Deleted posts, shorts, and stories will appear here for 30 days."
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  infoBanner: { backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 10 },
  infoText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, textAlign: 'center' },
  listContent: { paddingBottom: 40, paddingTop: 8 },
  center: { paddingTop: 60, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated },
  placeholderThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '500' as const, color: theme.colors.text },
  rowMeta: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 3, textTransform: 'capitalize' as const },
  actions: { flexDirection: 'row', gap: 8 },
  restoreBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  permanentDeleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.errorMuted, alignItems: 'center', justifyContent: 'center' },
});
