import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, RotateCcw } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi, type ArchiveItem } from '@/utils/settings-api';
import EmptyState from '@/components/EmptyState';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ArchiveStoriesScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const archiveQuery = useQuery({
    queryKey: ['archive', 'story'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getArchive('story');
        console.log('[ArchiveStories] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[ArchiveStories] Error:', e);
        return [] as ArchiveItem[];
      }
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (archiveId: string) => settingsApi.unarchiveContent(archiveId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['archive', 'story'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      console.log('[ArchiveStories] Unarchive error:', err);
      Alert.alert('Error', 'Failed to unarchive story.');
    },
  });

  const handleUnarchive = (item: ArchiveItem) => {
    Alert.alert('Unarchive', 'Restore this story?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => unarchiveMutation.mutate(item.id) },
    ]);
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['archive', 'story'] });
  }, [queryClient]);

  const stories = archiveQuery.data ?? [];

  const renderItem = ({ item }: { item: ArchiveItem }) => (
    <TouchableOpacity style={s.storyItem} activeOpacity={0.8} onLongPress={() => handleUnarchive(item)}>
      {item.image_url || item.thumbnail_url ? (
        <Image source={{ uri: item.image_url || item.thumbnail_url }} style={s.storyImage} contentFit="cover" />
      ) : (
        <View style={s.storyPlaceholder}>
          <Clock size={20} color={theme.colors.textTertiary} />
        </View>
      )}
      <Text style={s.storyDate}>{formatDate(item.created_at ?? item.archived_at ?? '')}</Text>
      <TouchableOpacity style={s.restoreIcon} onPress={() => handleUnarchive(item)}>
        <RotateCcw size={10} color="#FFF" />
      </TouchableOpacity>
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
  storyItem: { flex: 1, alignItems: 'center', position: 'relative' as const },
  storyImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surfaceElevated, borderWidth: 2, borderColor: theme.colors.accent },
  storyPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  storyDate: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 6, textAlign: 'center' },
  restoreIcon: { position: 'absolute' as const, top: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
