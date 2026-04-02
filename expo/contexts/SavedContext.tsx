import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { api } from '@/utils/api';

const SAVED_STORAGE_KEY = 'shepherd_saved_items';

export type SavedItemType = 'post' | 'short' | 'clip' | 'song' | 'event' | 'sermon' | 'prayer';

export interface SavedItemData {
  id: string;
  item_id: string;
  item_type: SavedItemType;
  title: string;
  preview: string;
  author_name: string;
  author_id: string;
  saved_at: string;
  media_url?: string;
  thumbnail_url?: string;
}

interface BackendSavedItem {
  id: number | string;
  content_type: string;
  content_id: string;
  title?: string;
  thumbnail_url?: string;
  subtitle?: string;
  saved_at: string;
}

export const [SavedProvider, useSaved] = createContextHook(() => {
  return useSavedValue();
});

function useSavedValue() {
  const [savedItems, setSavedItems] = useState<SavedItemData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(SAVED_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SavedItemData[];
          setSavedItems(parsed);
          console.log('[Saved] Loaded', parsed.length, 'local saved items');
        }

        try {
          const backendItems = await api.get<BackendSavedItem[] | { data: BackendSavedItem[] }>('/saved');
          const arr = Array.isArray(backendItems) ? backendItems : (backendItems as { data: BackendSavedItem[] })?.data ?? [];
          if (arr.length > 0) {
            const mapped: SavedItemData[] = arr.map((item) => ({
              id: String(item.id),
              item_id: String(item.content_id),
              item_type: (item.content_type || 'post') as SavedItemType,
              title: item.title || '',
              preview: item.subtitle || '',
              author_name: item.subtitle || '',
              author_id: '',
              saved_at: item.saved_at,
              thumbnail_url: item.thumbnail_url ?? undefined,
            }));
            setSavedItems(mapped);
            await AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(mapped));
            console.log('[Saved] Synced', mapped.length, 'items from backend');
          }
        } catch (e) {
          console.log('[Saved] Backend sync failed, using local:', e);
        }
      } catch (e) {
        console.log('[Saved] Failed to load saved items:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  const persist = useCallback(async (items: SavedItemData[]) => {
    try {
      await AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.log('[Saved] Failed to persist saved items:', e);
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (params: { itemId: string; itemType: SavedItemType; title: string; preview: string; authorName: string; authorId: string; mediaUrl?: string; thumbnailUrl?: string }) => {
      try {
        await api.post('/saved', {
          content_type: params.itemType,
          content_id: params.itemId,
          title: params.title,
          thumbnail_url: params.thumbnailUrl,
          subtitle: params.authorName,
        });
      } catch {
        console.log('[Saved] API save failed, saving locally only');
      }
      return params;
    },
    onSuccess: (params) => {
      const newItem: SavedItemData = {
        id: `local_${Date.now()}`,
        item_id: params.itemId,
        item_type: params.itemType,
        title: params.title,
        preview: params.preview,
        author_name: params.authorName,
        author_id: params.authorId,
        saved_at: new Date().toISOString(),
        media_url: params.mediaUrl,
        thumbnail_url: params.thumbnailUrl,
      };
      const updated = [newItem, ...savedItems.filter((i) => !(i.item_id === params.itemId && i.item_type === params.itemType))];
      setSavedItems(updated);
      void persist(updated);
      console.log('[Saved] Item saved:', params.itemType, params.itemId);
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async (params: { itemId: string; itemType: SavedItemType }) => {
      const matchingItem = savedItems.find((i) => i.item_id === params.itemId && i.item_type === params.itemType);
      const backendId = matchingItem?.id;
      try {
        if (backendId && !backendId.startsWith('local_')) {
          await api.delete(`/saved/${backendId}`);
        }
      } catch {
        console.log('[Saved] API unsave failed, removing locally only');
      }
      return params;
    },
    onSuccess: (params) => {
      const updated = savedItems.filter((i) => !(i.item_id === params.itemId && i.item_type === params.itemType));
      setSavedItems(updated);
      void persist(updated);
      console.log('[Saved] Item unsaved:', params.itemType, params.itemId);
    },
  });

  const isItemSaved = useCallback(
    (itemId: string, itemType: SavedItemType) => {
      return savedItems.some((i) => i.item_id === itemId && i.item_type === itemType);
    },
    [savedItems]
  );

  const toggleSave = useCallback(
    (params: { itemId: string; itemType: SavedItemType; title: string; preview: string; authorName: string; authorId: string; mediaUrl?: string; thumbnailUrl?: string }) => {
      if (isItemSaved(params.itemId, params.itemType)) {
        unsaveMutation.mutate({ itemId: params.itemId, itemType: params.itemType });
        return false;
      } else {
        saveMutation.mutate(params);
        return true;
      }
    },
    [isItemSaved, saveMutation, unsaveMutation]
  );

  const savedPosts = useMemo(() => savedItems.filter((i) => i.item_type === 'post'), [savedItems]);
  const savedShorts = useMemo(() => savedItems.filter((i) => i.item_type === 'short'), [savedItems]);

  return useMemo(() => ({
    savedItems,
    savedPosts,
    savedShorts,
    isLoaded,
    isItemSaved,
    toggleSave,
    isSaving: saveMutation.isPending,
  }), [savedItems, savedPosts, savedShorts, isLoaded, isItemSaved, toggleSave, saveMutation.isPending]);
}
