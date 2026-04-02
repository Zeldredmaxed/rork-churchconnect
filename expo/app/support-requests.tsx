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
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface SupportRequest {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  last_message?: string;
}

function getStatusConfig(status: string, theme: AppTheme) {
  switch (status) {
    case 'open': return { label: 'Open', color: theme.colors.info, bg: theme.colors.infoMuted };
    case 'in_progress': return { label: 'In Progress', color: theme.colors.warning, bg: theme.colors.warningMuted };
    case 'resolved': return { label: 'Resolved', color: theme.colors.success, bg: theme.colors.successMuted };
    case 'closed': return { label: 'Closed', color: theme.colors.textTertiary, bg: theme.colors.surfaceElevated };
    default: return { label: status, color: theme.colors.textSecondary, bg: theme.colors.surfaceElevated };
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SupportRequestsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['support-requests'],
    queryFn: async () => {
      try {
        const data = await api.get<SupportRequest[]>('/support/requests');
        console.log('[SupportRequests] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[SupportRequests] Error:', e);
        return [] as SupportRequest[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['support-requests'] });
  }, [queryClient]);

  const requests = requestsQuery.data ?? [];

  const renderItem = ({ item }: { item: SupportRequest }) => {
    const statusConfig = getStatusConfig(item.status, theme);
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <Text style={s.subject} numberOfLines={1}>{item.subject}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[s.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
        {item.last_message ? (
          <Text style={s.lastMessage} numberOfLines={2}>{item.last_message}</Text>
        ) : null}
        <View style={s.cardFooter}>
          <Clock size={12} color={theme.colors.textTertiary} />
          <Text style={s.dateText}>Opened {formatDate(item.created_at)}</Text>
          {item.updated_at !== item.created_at && (
            <Text style={s.dateText}> · Updated {formatDate(item.updated_at)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Support requests',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={requestsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          requestsQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <EmptyState
              icon={<MessageCircle size={28} color={theme.colors.textTertiary} />}
              title="No support requests"
              description="Any support cases you open will appear here."
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 40, paddingTop: 8 },
  center: { paddingTop: 60, alignItems: 'center' },
  card: { marginHorizontal: 16, marginBottom: 10, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subject: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: theme.colors.text, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  lastMessage: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: theme.colors.textTertiary },
});
