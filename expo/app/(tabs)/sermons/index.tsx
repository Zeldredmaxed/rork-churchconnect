import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { PlayCircle, Radio } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import SermonCard from '@/components/SermonCard';
import EmptyState from '@/components/EmptyState';
import type { Sermon } from '@/types';

export default function SermonsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();

  const sermonsQuery = useQuery({
    queryKey: ['sermons'],
    queryFn: () => api.get<{ data: Sermon[] }>('/sermons'),
  });

  const liveQuery = useQuery({
    queryKey: ['sermons', 'live'],
    queryFn: () => api.get<{ data: Sermon | null }>('/sermons/live'),
    refetchInterval: 30000,
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sermons'] });
  }, [queryClient]);

  const sermons = sermonsQuery.data?.data ?? [];
  const liveSermon = liveQuery.data?.data;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <Text style={styles.headerTitle}>Sermons</Text>,
        }}
      />

      <FlatList
        data={sermons}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          liveSermon ? (
            <TouchableOpacity
              style={styles.liveBanner}
              onPress={() => router.push(`/sermon-player?id=${liveSermon.id}` as never)}
              activeOpacity={0.8}
            >
              <View style={styles.liveIndicator}>
                <Radio size={14} color={theme.colors.white} />
                <Text style={styles.liveLabel}>LIVE NOW</Text>
              </View>
              <Text style={styles.liveTitle} numberOfLines={1}>{liveSermon.title}</Text>
              <Text style={styles.liveSpeaker}>{liveSermon.speaker}</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <SermonCard
            sermon={item}
            onPress={(s) => router.push(`/sermon-player?id=${s.id}` as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={sermonsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          sermonsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={<PlayCircle size={28} color={theme.colors.textTertiary} />}
              title="No sermons yet"
              description="Check back for sermon recordings and live streams"
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  liveBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: theme.colors.white,
    letterSpacing: 1.5,
  },
  liveTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.white,
  },
  liveSpeaker: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});

