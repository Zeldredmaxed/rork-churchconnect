import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Play, RotateCcw } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi, type ArchiveItem } from '@/utils/settings-api';
import EmptyState from '@/components/EmptyState';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 6) / 3;

export default function ArchiveShortsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();

  const archiveQuery = useQuery({
    queryKey: ['archive', 'clip'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getArchive('clip');
        console.log('[ArchiveShorts] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[ArchiveShorts] Error:', e);
        return [] as ArchiveItem[];
      }
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (archiveId: string) => settingsApi.unarchiveContent(archiveId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['archive', 'clip'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      console.log('[ArchiveShorts] Unarchive error:', err);
      Alert.alert('Error', 'Failed to unarchive short.');
    },
  });

  const handleUnarchive = (item: ArchiveItem) => {
    Alert.alert('Unarchive', 'Restore this short to your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => unarchiveMutation.mutate(item.id) },
    ]);
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['archive', 'clip'] });
  }, [queryClient]);

  const shorts = archiveQuery.data ?? [];

  const renderItem = ({ item }: { item: ArchiveItem }) => (
    <TouchableOpacity
      style={s.gridItem}
      activeOpacity={0.8}
      onPress={() => router.push(`/short-viewer?id=${item.content_id}` as never)}
      onLongPress={() => handleUnarchive(item)}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={s.gridImage} contentFit="cover" />
      ) : (
        <View style={s.gridPlaceholder}>
          <Film size={24} color={theme.colors.textTertiary} />
        </View>
      )}
      <View style={s.overlay}>
        <Play size={12} color="#FFF" fill="#FFF" />
        <Text style={s.viewCount}>{item.view_count ?? 0}</Text>
      </View>
      <TouchableOpacity style={s.restoreIcon} onPress={() => handleUnarchive(item)}>
        <RotateCcw size={12} color="#FFF" />
      </TouchableOpacity>
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
  restoreIcon: { position: 'absolute' as const, top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
