import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, Star, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi, type SocialBoundaryUser } from '@/utils/settings-api';

export default function FavouritesScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const favouritesQuery = useQuery({
    queryKey: ['settings-favourites'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getFavourites();
        console.log('[Favourites] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[Favourites] Error:', e);
        return [] as SocialBoundaryUser[];
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => settingsApi.removeFavourite(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-favourites'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      console.log('[Favourites] Remove error:', err);
      Alert.alert('Error', 'Failed to remove favourite. Please try again.');
    },
  });

  const handleRemove = (user: SocialBoundaryUser) => {
    const userId = user.target_user_id ?? user.id;
    Alert.alert(
      'Remove',
      `Remove ${user.full_name} from favourites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(userId) },
      ]
    );
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['settings-favourites'] });
  }, [queryClient]);

  const favourites = favouritesQuery.data ?? [];
  const filtered = search.trim()
    ? favourites.filter((u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (u.username ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : favourites;

  const renderItem = ({ item }: { item: SocialBoundaryUser }) => {
    const initials = (item.full_name ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return (
      <View style={s.userRow}>
        <View style={s.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={s.avatarPlaceholder}><Text style={s.avatarText}>{initials}</Text></View>
          )}
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName}>{item.full_name}</Text>
          {item.username ? <Text style={s.userHandle}>@{item.username}</Text> : null}
        </View>
        <TouchableOpacity
          style={s.removeBtn}
          onPress={() => handleRemove(item)}
          activeOpacity={0.7}
        >
          <Text style={s.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Favourites',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <Text style={s.topHint}>
        Posts from your favourites are shown higher in your feed. Only you can see who you add.
      </Text>
      <View style={s.searchContainer}>
        <Search size={16} color={theme.colors.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search"
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={favouritesQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          favouritesQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <View style={s.emptyContainer}>
              <View style={s.iconCircle}><Star size={32} color={theme.colors.accent} /></View>
              <Text style={s.emptyTitle}>No favourites yet</Text>
              <Text style={s.emptyText}>
                Add accounts to your favourites to see their posts higher in your feed.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topHint: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, lineHeight: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  listContent: { flexGrow: 1, paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 12 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.accent },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  userHandle: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 1 },
  removeBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
  removeText: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.text },
});
