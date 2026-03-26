import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import type { Event, Sermon, Prayer } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - TILE_GAP * 2) / 3;

interface DiscoverItem {
  id: string;
  type: 'event' | 'sermon' | 'prayer';
  title: string;
  subtitle: string;
  color: string;
}

export default function ExploreScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<{ data: Event[] }>('/events'),
  });

  const sermonsQuery = useQuery({
    queryKey: ['sermons'],
    queryFn: () => api.get<{ data: Sermon[] }>('/sermons'),
  });

  const prayersQuery = useQuery({
    queryKey: ['prayers'],
    queryFn: async () => {
      const response = await api.get<unknown>('/prayers');
      if (Array.isArray(response)) return { data: response };
      if (typeof response === 'object' && response !== null) {
        const obj = response as Record<string, unknown>;
        if (Array.isArray(obj.data)) return { data: obj.data };
      }
      return { data: [] };
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['events'] });
    void queryClient.invalidateQueries({ queryKey: ['sermons'] });
    void queryClient.invalidateQueries({ queryKey: ['prayers'] });
  }, [queryClient]);

  const events = (eventsQuery.data?.data ?? []) as Event[];
  const sermons = (sermonsQuery.data?.data ?? []) as Sermon[];
  const prayers = (prayersQuery.data?.data ?? []) as Prayer[];

  const isLoading = eventsQuery.isLoading && sermonsQuery.isLoading;
  const isRefreshing = eventsQuery.isRefetching || sermonsQuery.isRefetching;

  const tileColors = [
    '#1E3A5F', '#3D2B1F', '#3D1F2B', '#1F3D2B', '#2B1F3D',
    '#3D3A1F', '#1F2B3D', '#2B3D1F', '#3D1F3A', '#1F3D3A',
  ];

  const discoverItems: DiscoverItem[] = [
    ...events.slice(0, 6).map((e, i) => ({
      id: `event-${e.id}`,
      type: 'event' as const,
      title: e.title,
      subtitle: new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: tileColors[i % tileColors.length],
    })),
    ...sermons.slice(0, 6).map((s, i) => ({
      id: `sermon-${s.id}`,
      type: 'sermon' as const,
      title: s.title,
      subtitle: s.speaker,
      color: tileColors[(i + 3) % tileColors.length],
    })),
    ...prayers.slice(0, 6).map((p: Prayer, i) => ({
      id: `prayer-${p.id}`,
      type: 'prayer' as const,
      title: p.title,
      subtitle: p.is_urgent ? 'Urgent' : p.category,
      color: tileColors[(i + 6) % tileColors.length],
    })),
  ];

  const handleItemPress = (item: DiscoverItem) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rawId = item.id.split('-').slice(1).join('-');
    if (item.type === 'event') {
      router.push(`/event-detail?id=${rawId}` as never);
    } else if (item.type === 'sermon') {
      router.push(`/sermon-player?id=${rawId}` as never);
    } else if (item.type === 'prayer') {
      router.push(`/prayer-detail?id=${rawId}` as never);
    }
  };

  const handleSearchPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/explore/search' as never);
  }, [router]);

  const renderGridItem = ({ item, index }: { item: DiscoverItem; index: number }) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isLargeLeft = row % 5 === 0 && col === 0;
    const isLargeRight = row % 5 === 3 && col === 2;
    const isLarge = isLargeLeft || isLargeRight;
    const itemWidth = isLarge ? TILE_SIZE * 2 + TILE_GAP : TILE_SIZE;
    const itemHeight = isLarge ? TILE_SIZE * 2 + TILE_GAP : TILE_SIZE;

    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          { width: itemWidth, height: itemHeight, backgroundColor: item.color },
        ]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
        testID={`explore-item-${item.id}`}
      >
        <View style={styles.gridItemOverlay} />
        <View style={styles.gridItemContent}>
          <View style={[styles.typeBadge, item.type === 'event' && styles.typeBadgeEvent, item.type === 'sermon' && styles.typeBadgeSermon, item.type === 'prayer' && styles.typeBadgePrayer]}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          <Text style={[styles.gridItemTitle, isLarge && styles.gridItemTitleLarge]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.gridItemSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.searchBarTouchable}
        onPress={handleSearchPress}
        activeOpacity={0.7}
        testID="explore-search-trigger"
      >
        <View style={styles.searchBar}>
          <Search size={16} color={theme.colors.textTertiary} />
          <Text style={styles.searchPlaceholder}>Search</Text>
        </View>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : discoverItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Search size={28} color={theme.colors.textTertiary} />}
            title="Nothing to explore yet"
            description="Content will appear here as your church grows"
          />
        </View>
      ) : (
        <FlatList
          data={discoverItems}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBarTouchable: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 38,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: theme.colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  gridContent: {
    paddingBottom: 100,
  },
  gridRow: {
    gap: TILE_GAP,
  },
  gridItem: {
    justifyContent: 'flex-end',
    padding: 10,
    marginBottom: TILE_GAP,
    overflow: 'hidden',
  },
  gridItemOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  gridItemContent: {
    gap: 3,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  typeBadgeEvent: {
    backgroundColor: 'rgba(96,165,250,0.25)',
  },
  typeBadgeSermon: {
    backgroundColor: 'rgba(212,165,116,0.25)',
  },
  typeBadgePrayer: {
    backgroundColor: 'rgba(248,113,113,0.25)',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  gridItemTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridItemTitleLarge: {
    fontSize: 16,
  },
  gridItemSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
});
