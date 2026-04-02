import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Users, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import Badge from '@/components/Badge';
import type { Group } from '@/types';

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Users size={20} color={theme.colors.accent} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
          <Badge label={group.type} variant="accent" small />
        </View>
        <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
        <Text style={styles.memberCount}>{group.member_count} members</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function GroupsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get<Group[] | { data: Group[] }>('/groups'),
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['groups'] });
  }, [queryClient]);

  const groups = React.useMemo(() => {
    const raw = groupsQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: Group[] }).data)) return (raw as { data: Group[] }).data;
    return [];
  }, [groupsQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Groups',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push(`/group-detail?id=${item.id}` as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={groupsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          groupsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={<Users size={28} color={theme.colors.textTertiary} />}
              title="No groups"
              description="You haven't joined any groups yet"
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
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
    flex: 1,
  },
  groupDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});

