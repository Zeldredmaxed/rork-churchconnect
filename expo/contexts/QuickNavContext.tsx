import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface QuickNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const ALL_NAV_ITEMS: QuickNavItem[] = [
  { id: 'giving', label: 'Giving', icon: 'Heart', route: '/giving' },
  { id: 'sermons', label: 'Sermons', icon: 'Play', route: '/(tabs)/sermons' },
  { id: 'bible', label: 'Bible', icon: 'BookOpen', route: '/bible' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: 'Sparkles', route: '/ai-assistant' },
  { id: 'prayers', label: 'Prayers', icon: 'HandHeart', route: '/(tabs)/prayers' },
  { id: 'events', label: 'Events', icon: 'Calendar', route: '/(tabs)/events' },
  { id: 'groups', label: 'Groups', icon: 'Users', route: '/groups' },
  { id: 'chat', label: 'Messages', icon: 'MessageCircle', route: '/chat' },
  { id: 'shorts', label: 'Glory Clips', icon: 'Clapperboard', route: '/(tabs)/shorts' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', route: '/notifications' },
  { id: 'saved', label: 'Saved', icon: 'Bookmark', route: '/saved-posts' },
  { id: 'settings', label: 'Settings', icon: 'Settings', route: '/settings' },
  { id: 'profile', label: 'Profile', icon: 'User', route: '/(tabs)/me' },
];

const DEFAULT_NAV_IDS = ['giving', 'sermons', 'bible', 'events', 'ai-assistant'];

const STORAGE_KEY = 'quick_nav_items';

export const [QuickNavProvider, useQuickNav] = createContextHook(() => {
  const [activeIds, setActiveIds] = useState<string[]>(DEFAULT_NAV_IDS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((id) => ALL_NAV_ITEMS.some((item) => item.id === id));
            if (valid.length > 0) {
              setActiveIds(valid);
            }
          }
        }
      } catch (e) {
        console.log('[QuickNav] Failed to load:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  const saveIds = useCallback(async (ids: string[]) => {
    setActiveIds(ids);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      console.log('[QuickNav] Saved:', ids);
    } catch (e) {
      console.log('[QuickNav] Failed to save:', e);
    }
  }, []);

  const activeItems = useMemo(
    () => activeIds.map((id) => ALL_NAV_ITEMS.find((item) => item.id === id)).filter(Boolean) as QuickNavItem[],
    [activeIds]
  );

  const availableItems = useMemo(() => ALL_NAV_ITEMS, []);

  const resetToDefaults = useCallback(async () => {
    await saveIds(DEFAULT_NAV_IDS);
  }, [saveIds]);

  return useMemo(() => ({
    activeItems,
    activeIds,
    availableItems,
    saveIds,
    resetToDefaults,
    isLoaded,
  }), [activeItems, activeIds, availableItems, saveIds, resetToDefaults, isLoaded]);
});
