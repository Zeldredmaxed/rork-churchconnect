import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bookmark, Clapperboard, FileText, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useSaved, SavedItemData } from '@/contexts/SavedContext';
import EmptyState from '@/components/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

type FilterTab = 'all' | 'posts' | 'shorts';

export default function SavedPostsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { savedItems, savedPosts, savedShorts, toggleSave } = useSaved();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filteredItems = activeFilter === 'all'
    ? savedItems
    : activeFilter === 'posts'
      ? savedPosts
      : savedShorts;

  const handleUnsave = useCallback((item: SavedItemData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove from Saved?',
      `This ${item.item_type} will be removed from your saved items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            toggleSave({
              itemId: item.item_id,
              itemType: item.item_type,
              title: item.title,
              preview: item.preview,
              authorName: item.author_name,
              authorId: item.author_id,
              mediaUrl: item.media_url,
              thumbnailUrl: item.thumbnail_url,
            });
          },
        },
      ]
    );
  }, [toggleSave]);

  const handleTapItem = useCallback((item: SavedItemData) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[SavedPosts] Tapped item:', item.item_type, item.item_id);
    if (item.item_type === 'short') {
      router.push(`/short-viewer?id=${item.item_id}` as never);
    } else {
      router.push('/(tabs)/(home)' as never);
    }
  }, [router]);

  const renderGridItem = ({ item }: { item: SavedItemData }) => {
    const isShort = item.item_type === 'short';
    const hasMedia = !!(item.thumbnail_url || item.media_url);

    return (
      <TouchableOpacity
        style={styles.gridItem}
        activeOpacity={0.8}
        onPress={() => handleTapItem(item)}
        onLongPress={() => handleUnsave(item)}
      >
        {hasMedia ? (
          <View style={styles.gridItemImageContainer}>
            <Image
              source={{ uri: item.thumbnail_url ?? item.media_url }}
              style={styles.gridItemImage}
              resizeMode="cover"
            />
            {isShort && (
              <View style={styles.playBadge}>
                <Play size={14} color="#fff" fill="#fff" />
              </View>
            )}
            <View style={styles.gridItemImageOverlay}>
              <Text style={styles.gridItemImageAuthor} numberOfLines={1}>
                {item.author_name}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.gridItemInner, isShort && styles.gridItemShort]}>
            {isShort ? (
              <Play size={20} color="rgba(255,255,255,0.5)" fill="rgba(255,255,255,0.5)" />
            ) : (
              <FileText size={20} color={theme.colors.textTertiary} />
            )}
            <Text style={[styles.gridItemText, isShort && styles.gridItemTextShort]} numberOfLines={3}>
              {item.title || item.preview}
            </Text>
            <Text style={[styles.gridItemAuthor, isShort && styles.gridItemAuthorShort]} numberOfLines={1}>
              {item.author_name}
            </Text>
          </View>
        )}
        {isShort && !hasMedia && (
          <View style={styles.shortBadge}>
            <Clapperboard size={10} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Saved',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
          onPress={() => setActiveFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
            All posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'posts' && styles.filterChipActive]}
          onPress={() => setActiveFilter('posts')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeFilter === 'posts' && styles.filterChipTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'shorts' && styles.filterChipActive]}
          onPress={() => setActiveFilter('shorts')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterChipText, activeFilter === 'shorts' && styles.filterChipTextActive]}>
            Shorts
          </Text>
        </TouchableOpacity>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<Bookmark size={32} color={theme.colors.textTertiary} />}
            title="No saved items"
            description={
              activeFilter === 'all'
                ? "When you save posts or shorts, they'll appear here"
                : `No saved ${activeFilter} yet`
            }
          />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.item_type}-${item.item_id}`}
          renderItem={renderGridItem}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  gridContent: {
    paddingBottom: 40,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  gridItem: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: GRID_GAP,
    position: 'relative' as const,
  },
  gridItemImageContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute' as const,
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemImageOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gridItemImageAuthor: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  gridItemInner: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  gridItemShort: {
    backgroundColor: '#1A1520',
  },
  gridItemText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  gridItemTextShort: {
    color: 'rgba(255,255,255,0.7)',
  },
  gridItemAuthor: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  gridItemAuthorShort: {
    color: 'rgba(255,255,255,0.4)',
  },
  shortBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
