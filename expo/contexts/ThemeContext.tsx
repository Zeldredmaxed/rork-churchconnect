import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { darkTheme, lightTheme } from '@/constants/theme';
import type { AppTheme } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'shepherd_theme_mode';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  return useThemeValue();
});

function useThemeValue() {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setMode(saved);
          console.log('[Theme] Loaded saved mode:', saved);
        }
      } catch (e) {
        console.log('[Theme] Failed to load theme mode:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, []);

  const isDark = mode === 'system'
    ? (systemScheme !== 'light')
    : mode === 'dark';

  const theme: AppTheme = isDark ? darkTheme : lightTheme;

  const setThemeMode = useCallback(async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
      console.log('[Theme] Saved mode:', newMode);
    } catch (e) {
      console.log('[Theme] Failed to save theme mode:', e);
    }
  }, []);

  return useMemo(() => ({
    theme,
    isDark,
    mode,
    isLoaded,
    setThemeMode,
  }), [theme, isDark, mode, isLoaded, setThemeMode]);
}
