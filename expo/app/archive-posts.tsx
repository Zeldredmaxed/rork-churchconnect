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
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grid3x3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface ArchivedPost {
  id: string;
  content?: string;
  image_url?: string;
  thumbnail_url?: string;
  created_at: string;
  archived_at: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 6) / 3;

export default function ArchivePostsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const archiveQuery = useQuery({
    queryKey: ['archive-posts'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: ArchivedPost[] }>('/activity/archive/posts');
        console.log('[ArchivePosts] Fetched:', data);
        return data?.data ?? [];
      } catch (e) {
        console.log('[ArchivePosts] Error:', e);
        return [] as ArchivedPost[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['archive-posts'] });
  }, [queryClient]);

  const posts = archiveQuery.data ?? [];

  const renderItem = ({ item }: { item: ArchivedPost }) => (
    <TouchableOpacity style={s.gridItem} activeOpacity={0.8}>
      {item.image_url || item.thumbnail_url ? (
        <Image source={{ uri: item.image_url || item.thumbnail_url }} style={s.gridImage} />
      ) : (
        <View style={s.gridPlaceholder}>
          <Text style={s.placeholderText} numberOfLines={3}>{item.content || 'Post'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Archived posts',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={posts}
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
              icon={<Grid3x3 size={28} color={theme.colors.textTertiary} />}
              title="No archived posts"
              description="Posts you archive will appear here. Only you can see them."
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
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, marginBottom: 2 },
  gridImage: { width: '100%', height: '100%', backgroundColor: theme.colors.surfaceElevated },
  gridPlaceholder: { width: '100%', height: '100%', backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', padding: 8 },
  placeholderText: { fontSize: 11, color: theme.colors.textTertiary, textAlign: 'center' },
});
