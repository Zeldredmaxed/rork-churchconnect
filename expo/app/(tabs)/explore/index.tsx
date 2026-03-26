import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import type { Event, Sermon, Prayer, FlockUser } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - TILE_GAP * 2) / 3;

interface DiscoverItem {
  id: string;
  type: 'event' | 'sermon' | 'prayer';
  title: string;
  subtitle: string;
  color: string;
  icon: string;
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  const searchMembersQuery = useQuery({
    queryKey: ['search-members', searchQuery],
    queryFn: () => api.get<{ data: FlockUser[] }>(`/seek?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.trim().length > 1,
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['events'] });
    void queryClient.invalidateQueries({ queryKey: ['sermons'] });
    void queryClient.invalidateQueries({ queryKey: ['prayers'] });
  }, [queryClient]);

  const events = (eventsQuery.data?.data ?? []) as Event[];
  const sermons = (sermonsQuery.data?.data ?? []) as Sermon[];
  const prayers = (prayersQuery.data?.data ?? []) as Prayer[];
  const searchResults = searchMembersQuery.data?.data ?? [];

  const isLoading = eventsQuery.isLoading && sermonsQuery.isLoading;
  const isRefreshing = eventsQuery.isRefetching || sermonsQuery.isRefetching;

  const discoverItems: DiscoverItem[] = [
    ...events.slice(0, 6).map((e) => ({
      id: `event-${e.id}`,
      type: 'event' as const,
      title: e.title,
      subtitle: new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: '#1E3A5F',
      icon: 'calendar',
    })),
    ...sermons.slice(0, 6).map((s) => ({
      id: `sermon-${s.id}`,
      type: 'sermon' as const,
      title: s.title,
      subtitle: s.speaker,
      color: '#3D2B1F',
      icon: 'play',
    })),
    ...prayers.slice(0, 6).map((p: Prayer) => ({
      id: `prayer-${p.id}`,
      type: 'prayer' as const,
      title: p.title,
      subtitle: p.is_urgent ? 'Urgent' : p.category,
      color: '#3D1F2B',
      icon: 'heart',
    })),
  ];

  const filteredItems = searchQuery.trim() && !isFocused
    ? discoverItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : discoverItems;

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

  const handleUserPress = (user: FlockUser) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
    setIsFocused(false);
    inputRef.current?.blur();
    router.push(`/user-profile?id=${user.id}` as never);
  };

  const renderGridItem = ({ item, index }: { item: DiscoverItem; index: number }) => {
    const isLargeLeft = index % 15 === 0;
    const isLargeRight = index % 15 === 9;
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
        <View style={styles.gridItemContent}>
          <View style={[styles.typeBadge, styles[`typeBadge${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` as keyof typeof styles] as object]}>
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

  const renderSearchResult = ({ item }: { item: FlockUser }) => {
    const initials = item.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.searchResultRow}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.6}
      >
        <View style={styles.searchResultAvatar}>
          <Text style={styles.searchResultAvatarText}>{initials}</Text>
        </View>
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultName}>{item.full_name}</Text>
          {item.username ? (
            <Text style={styles.searchResultUsername}>@{item.username}</Text>
          ) : item.church_name ? (
            <Text style={styles.searchResultUsername}>{item.church_name}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const showSearchResults = isFocused && searchQuery.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
          <Search size={18} color={theme.colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={theme.colors.textTertiary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            returnKeyType="search"
            testID="explore-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        {isFocused && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setIsFocused(false);
              inputRef.current?.blur();
            }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSearchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.searchResultsList}
          ListEmptyComponent={
            searchMembersQuery.isLoading ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : searchQuery.trim().length > 1 ? (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No results found</Text>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Search size={28} color={theme.colors.textTertiary} />}
            title="Nothing to explore yet"
            description="Content will appear here as your church grows"
          />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchBarFocused: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingLeft: 4,
  },
  cancelText: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  searchResultsList: {
    paddingBottom: 40,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchResultAvatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  searchResultUsername: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  searchLoadingContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  noResultsContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
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
