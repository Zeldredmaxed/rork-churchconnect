import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { api } from '@/utils/api';

const SAVED_STORAGE_KEY = 'shepherd_saved_items';

export interface SavedItemData {
  id: string;
  item_id: string;
  item_type: 'post' | 'short';
  title: string;
  preview: string;
  author_name: string;
  author_id: string;
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
          console.log('[Saved] Loaded', parsed.length, 'saved items');
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
    mutationFn: async (params: { itemId: string; itemType: 'post' | 'short'; title: string; preview: string; authorName: string; authorId: string }) => {
      try {
        await api.post('/saved', {
          item_id: params.itemId,
          item_type: params.itemType,
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
      };
      const updated = [newItem, ...savedItems.filter((i) => !(i.item_id === params.itemId && i.item_type === params.itemType))];
      setSavedItems(updated);
      void persist(updated);
      console.log('[Saved] Item saved:', params.itemType, params.itemId);
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async (params: { itemId: string; itemType: 'post' | 'short' }) => {
      try {
        await api.delete(`/saved/${params.itemId}?type=${params.itemType}`);
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
    (itemId: string, itemType: 'post' | 'short') => {
      return savedItems.some((i) => i.item_id === itemId && i.item_type === itemType);
    },
    [savedItems]
  );

  const toggleSave = useCallback(
    (params: { itemId: string; itemType: 'post' | 'short'; title: string; preview: string; authorName: string; authorId: string }) => {
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
