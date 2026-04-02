import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { Search, Star } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function FavouritesScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [search, setSearch] = useState('');

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
      </View>
      <View style={s.emptyContainer}>
        <View style={s.iconCircle}>
          <Star size={32} color={theme.colors.accent} />
        </View>
        <Text style={s.emptyTitle}>No favourites yet</Text>
        <Text style={s.emptyText}>
          Add accounts to your favourites to see their posts higher in your feed.
        </Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topHint: { fontSize: 13, color: theme.colors.textTertiary, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, lineHeight: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 12, height: 38, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
});
