import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface ArchivedStory {
  id: string;
  image_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ArchiveStoriesScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const archiveQuery = useQuery({
    queryKey: ['archive-stories'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: ArchivedStory[] }>('/activity/archive/stories');
        console.log('[ArchiveStories] Fetched:', data);
        return data?.data ?? [];
      } catch (e) {
        console.log('[ArchiveStories] Error:', e);
        return [] as ArchivedStory[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['archive-stories'] });
  }, [queryClient]);

  const stories = archiveQuery.data ?? [];

  const renderItem = ({ item }: { item: ArchivedStory }) => (
    <TouchableOpacity style={s.storyItem} activeOpacity={0.8}>
      {item.image_url || item.thumbnail_url ? (
        <Image source={{ uri: item.image_url || item.thumbnail_url }} style={s.storyImage} />
      ) : (
        <View style={s.storyPlaceholder}>
          <Clock size={20} color={theme.colors.textTertiary} />
        </View>
      )}
      <Text style={s.storyDate}>{formatDate(item.created_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Archived stories',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={4}
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
              icon={<Clock size={28} color={theme.colors.textTertiary} />}
              title="No archived stories"
              description="Stories you archive will appear here."
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 40, paddingTop: 16 },
  columnWrapper: { paddingHorizontal: 12, gap: 12, marginBottom: 16 },
  center: { paddingTop: 60, alignItems: 'center' },
  storyItem: { flex: 1, alignItems: 'center' },
  storyImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surfaceElevated, borderWidth: 2, borderColor: theme.colors.accent },
  storyPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  storyDate: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 6, textAlign: 'center' },
});
