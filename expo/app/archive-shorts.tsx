import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, Play } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface ArchivedShort {
  id: string;
  title?: string;
  caption?: string;
  thumbnail_url?: string;
  video_url?: string;
  view_count?: number;
  created_at: string;
  archived_at: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 6) / 3;

export default function ArchiveShortsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();

  const archiveQuery = useQuery({
    queryKey: ['archive-shorts'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: ArchivedShort[] }>('/activity/archive/clips');
        console.log('[ArchiveShorts] Fetched:', data);
        return data?.data ?? [];
      } catch (e) {
        console.log('[ArchiveShorts] Error:', e);
        return [] as ArchivedShort[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['archive-shorts'] });
  }, [queryClient]);

  const shorts = archiveQuery.data ?? [];

  const renderItem = ({ item }: { item: ArchivedShort }) => (
    <TouchableOpacity
      style={s.gridItem}
      activeOpacity={0.8}
      onPress={() => router.push(`/short-viewer?id=${item.id}` as never)}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={s.gridImage} />
      ) : (
        <View style={s.gridPlaceholder}>
          <Film size={24} color={theme.colors.textTertiary} />
        </View>
      )}
      <View style={s.overlay}>
        <Play size={12} color="#FFF" fill="#FFF" />
        <Text style={s.viewCount}>{item.view_count ?? 0}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Archived shorts',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={s.listContent}
        columnWrapperStyle={s.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={archiveQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          archiveQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <EmptyState
              icon={<Film size={28} color={theme.colors.textTertiary} />}
              title="No archived shorts"
              description="Shorts you archive will appear here. Only you can see them."
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 40 },
  columnWrapper: { gap: 2, paddingHorizontal: 1 },
  center: { paddingTop: 60, alignItems: 'center' },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE * 1.4, marginBottom: 2, position: 'relative' as const },
  gridImage: { width: '100%', height: '100%', backgroundColor: theme.colors.surfaceElevated, borderRadius: 2 },
  gridPlaceholder: { width: '100%', height: '100%', backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute' as const, bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewCount: { fontSize: 11, color: '#FFF', fontWeight: '600' as const },
});
