import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { HandHeart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import PrayerCard from '@/components/PrayerCard';
import EmptyState from '@/components/EmptyState';
import type { Prayer } from '@/types';

export default function AdminPrayersScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();

  const prayersQuery = useQuery({
    queryKey: ['admin', 'prayers'],
    queryFn: () => api.get<Prayer[] | { data: Prayer[] }>('/prayers'),
  });

  const markAnsweredMutation = useMutation({
    mutationFn: (id: string) => api.put(`/prayers/${id}/answered`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/prayers/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'prayers'] });
  }, [queryClient]);

  const prayers = React.useMemo(() => {
    const raw = prayersQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Prayer[];
    if (typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: Prayer[] }).data)) return (raw as { data: Prayer[] }).data;
    return [];
  }, [prayersQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Prayer Moderation' }} />

      <FlatList
        data={prayers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View>
            <PrayerCard
              prayer={item}
              onPray={() => {}}
              onPress={() => {
                Alert.alert(item.title, 'Moderate this prayer request', [
                  { text: 'Close', style: 'cancel' },
                  ...(!item.is_answered
                    ? [{ text: 'Mark Answered', onPress: () => markAnsweredMutation.mutate(String(item.id)) }]
                    : []),
                  {
                    text: 'Delete',
                    style: 'destructive' as const,
                    onPress: () => deleteMutation.mutate(String(item.id)),
                  },
                ]);
              }}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={prayersQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          prayersQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={<HandHeart size={28} color={theme.colors.textTertiary} />} title="No prayers" description="No prayer requests to moderate" />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingTop: 8, paddingBottom: 40 },
});

