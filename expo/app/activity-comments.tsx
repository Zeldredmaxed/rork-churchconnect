import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface UserComment {
  id: string;
  content: string;
  target_type: string;
  target_id: string;
  target_title?: string;
  target_thumbnail?: string;
  created_at: string;
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function ActivityCommentsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ['activity-comments'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: UserComment[] }>('/activity/comments');
        console.log('[ActivityComments] Fetched:', data);
        return data?.data ?? [];
      } catch (e) {
        console.log('[ActivityComments] Error:', e);
        return [] as UserComment[];
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => api.delete(`/activity/comments/${commentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activity-comments'] });
    },
  });

  const handleDelete = useCallback((commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(commentId) },
    ]);
  }, [deleteMutation]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['activity-comments'] });
  }, [queryClient]);

  const comments = commentsQuery.data ?? [];

  const renderItem = ({ item }: { item: UserComment }) => (
    <View style={s.row}>
      <View style={s.rowLeft}>
        {item.target_thumbnail ? (
          <Image source={{ uri: item.target_thumbnail }} style={s.thumbnail} />
        ) : (
          <View style={s.iconBubble}>
            <MessageSquare size={16} color={theme.colors.info} />
          </View>
        )}
      </View>
      <View style={s.rowContent}>
        <Text style={s.targetLabel} numberOfLines={1}>
          On {item.target_title || `a ${item.target_type}`}
        </Text>
        <Text style={s.commentBody} numberOfLines={3}>{item.content}</Text>
        <Text style={s.time}>{formatTimeAgo(item.created_at)}</Text>
      </View>
      <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.6}>
        <Trash2 size={16} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Your comments',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={commentsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListEmptyComponent={
          commentsQuery.isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
          ) : (
            <EmptyState
              icon={<MessageSquare size={28} color={theme.colors.textTertiary} />}
              title="No comments yet"
              description="Comments you've made on posts and shorts will appear here."
            />
          )
        }
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 40 },
  center: { paddingTop: 60, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  rowLeft: {},
  thumbnail: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.infoMuted, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  targetLabel: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 3 },
  commentBody: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  time: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 4 },
  deleteBtn: { padding: 8 },
});
