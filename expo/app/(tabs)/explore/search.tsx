import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { FlockUser } from '@/types';

const RECENT_SEARCHES_KEY = 'shepherd_recent_searches';
const MAX_RECENT = 15;

interface RecentSearch {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    void loadRecentSearches();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.log('[Search] Failed to load recent searches:', e);
    }
  };

  const removeRecentSearch = async (id: string) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = recentSearches.filter((r) => r.id !== id);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.log('[Search] Failed to remove recent search:', e);
    }
  };

  const clearAllRecent = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      console.log('[Search] Failed to clear recent searches:', e);
    }
  };

  const searchQuery = useQuery({
    queryKey: ['search-members', query],
    queryFn: () => api.get<{ data: FlockUser[] }>(`/seek?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 1,
  });

  const searchResults = searchQuery.data?.data ?? [];
  const isSearching = query.trim().length > 0;

  const handleUserPress = useCallback((user: FlockUser | RecentSearch) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const recent: RecentSearch = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      avatar_url: user.avatar_url,
    };
    setRecentSearches((prev) => {
      const updated = [recent, ...prev.filter((r) => r.id !== recent.id)].slice(0, MAX_RECENT);
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
    router.push(`/user-profile?id=${user.id}` as never);
  }, [router]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    router.back();
  }, [router]);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderRecentItem = ({ item }: { item: RecentSearch }) => (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => handleUserPress(item as FlockUser)}
      activeOpacity={0.6}
      testID={`recent-${item.id}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultUsername}>{item.username ?? item.full_name}</Text>
        <Text style={styles.resultName}>{item.full_name}</Text>
      </View>
      <TouchableOpacity
        onPress={() => void removeRecentSearch(item.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.removeBtn}
      >
        <X size={16} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: FlockUser }) => (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.6}
      testID={`search-result-${item.id}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultUsername}>{item.username ?? item.full_name}</Text>
        <Text style={styles.resultName}>{item.full_name}</Text>
        {item.followers_count !== undefined && item.followers_count > 0 && (
          <Text style={styles.resultMeta}>
            {item.followers_count.toLocaleString()} followers
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSearchSuggestion = () => {
    if (!isSearching) return null;
    return (
      <TouchableOpacity
        style={styles.suggestionRow}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        activeOpacity={0.6}
      >
        <View style={styles.suggestionIcon}>
          <Search size={20} color={theme.colors.textSecondary} />
        </View>
        <Text style={styles.suggestionText}>{query}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
          testID="search-back"
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBarWrap}>
          <Search size={16} color={theme.colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            testID="search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          ListHeaderComponent={renderSearchSuggestion}
          ListEmptyComponent={
            searchQuery.isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : query.trim().length > 1 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : recentSearches.length > 0 ? (
        <FlatList
          data={recentSearches}
          keyExtractor={(item) => item.id}
          renderItem={renderRecentItem}
          ListHeaderComponent={
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent</Text>
              <TouchableOpacity onPress={() => void clearAllRecent()}>
                <Text style={styles.seeAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  resultInfo: {
    flex: 1,
  },
  resultUsername: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  resultName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  resultMeta: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  removeBtn: {
    padding: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  suggestionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  centered: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  listContent: {
    paddingBottom: 40,
  },
});
