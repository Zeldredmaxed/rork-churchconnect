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
import { Search, BellOff, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { settingsApi, type SocialBoundaryUser } from '@/utils/settings-api';

export default function MutedAccountsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const mutedQuery = useQuery({
    queryKey: ['settings-muted'],
    queryFn: async () => {
      try {
        const data = await settingsApi.getMuted();
        console.log('[MutedAccounts] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[MutedAccounts] Error:', e);
        return [] as SocialBoundaryUser[];
      }
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (userId: string) => settingsApi.unmuteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings-muted'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      console.log('[MutedAccounts] Unmute error:', err);
      Alert.alert('Error', 'Failed to unmute user. Please try again.');
    },
  });

  const handleUnmute = (user: SocialBoundaryUser) => {
    const userId = user.target_user_id ?? user.id;
    Alert.alert(
      'Unmute',
      `Are you sure you want to unmute ${user.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmute', onPress: () => unmuteMutation.mutate(userId) },
      ]
    );
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['settings-muted'] });
  }, [queryClient]);

  const muted = mutedQuery.data ?? [];
  const filtered = search.trim()
    ? muted.filter((u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (u.username ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : muted;

  const renderItem = ({ item }: { item: SocialBoundaryUser }) => {
    const initials = (item.full_name ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    const muteDetail = [
      item.mute_posts ? 'Posts' : null,
      item.mute_stories ? 'Stories' : null,
    ].filter(Boolean).join(', ');

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
          {muteDetail ? <Text style={s.muteDetail}>Muted: {muteDetail}</Text> : null}
        </View>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => handleUnmute(item)}
          activeOpacity={0.7}
        >
          <Text style={s.actionText}>Unmute</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Muted accounts',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
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
          <RefreshControl refreshing={mutedQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          mutedQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <View style={s.emptyContainer}>
              <View style={s.iconCircle}><BellOff size={32} color={theme.colors.textTertiary} /></View>
              <Text style={s.emptyTitle}>No muted accounts</Text>
              <Text style={s.emptyText}>
                When you mute an account, you won't see their posts in your feed but you'll still be following them.
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, marginTop: 8, marginBottom: 16, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  listContent: { flexGrow: 1, paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
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
  muteDetail: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
  actionText: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.text },
});
