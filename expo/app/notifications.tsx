import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Calendar,
  HandHeart,
  Play,
  Bell,
  CheckCheck,
  UserPlus,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import SuggestedUserRow from '@/components/SuggestedUserRow';
import type { Notification, FlockUser } from '@/types';

function getTypeIcons(theme: AppTheme): Record<string, { icon: React.ReactNode; color: string }> {
  return {
    like: { icon: <Heart size={16} color={theme.colors.error} />, color: theme.colors.errorMuted },
    comment: { icon: <MessageCircle size={16} color={theme.colors.info} />, color: theme.colors.infoMuted },
    rsvp: { icon: <Calendar size={16} color={theme.colors.success} />, color: theme.colors.successMuted },
    prayer: { icon: <HandHeart size={16} color={theme.colors.warning} />, color: theme.colors.warningMuted },
    event: { icon: <Calendar size={16} color={theme.colors.accent} />, color: theme.colors.accentMuted },
    short: { icon: <Play size={16} color={theme.colors.info} />, color: theme.colors.infoMuted },
    follow: { icon: <UserPlus size={16} color="#0095F6" />, color: 'rgba(0, 149, 246, 0.12)' },
  };
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

function NotificationRow({
  item,
  onRead,
}: {
  item: Notification & { user_id?: string; is_following_back?: boolean };
  onRead: (id: string) => void;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const typeIcons = getTypeIcons(theme);
  const typeConfig = typeIcons[item.type] ?? {
    icon: <Bell size={16} color={theme.colors.textSecondary} />,
    color: theme.colors.surfaceElevated,
  };

  const isFollowType = item.type === 'follow';
  const [followedBack, setFollowedBack] = useState(item.is_following_back ?? false);

  const followBackMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/social/flock/${userId}`),
    onSuccess: () => {
      setFollowedBack(true);
    },
  });

  const handlePress = () => {
    onRead(item.id);
    if (isFollowType && item.user_id) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/user-profile?id=${item.user_id}` as never);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.notifRow, !item.is_read && styles.notifUnread]}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <View style={[styles.notifIcon, { backgroundColor: typeConfig.color }]}>
        {typeConfig.icon}
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifBody} numberOfLines={2}>
          <Text style={styles.notifBold}>{item.title}</Text>
          {'  '}
          {item.body}
          {'  '}
          <Text style={styles.notifTime}>{formatTimeAgo(item.created_at)}</Text>
        </Text>
      </View>
      <View style={styles.notifMeta}>
        {isFollowType && item.user_id && !followedBack ? (
          <TouchableOpacity
            style={styles.followBackBtn}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              followBackMutation.mutate(item.user_id!);
            }}
            disabled={followBackMutation.isPending}
            activeOpacity={0.7}
          >
            {followBackMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.followBackText}>Follow</Text>
            )}
          </TouchableOpacity>
        ) : isFollowType && followedBack ? (
          <View style={styles.followingBackBtn}>
            <Text style={styles.followingBackText}>Following</Text>
          </View>
        ) : !item.is_read ? (
          <View style={styles.unreadDot} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function FollowRequestsBanner({ count, onPress }: { count: number; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  if (count === 0) return null;

  return (
    <TouchableOpacity style={styles.followRequestsBanner} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.followRequestsAvatarStack}>
        <View style={styles.followRequestsAvatar}>
          <UserPlus size={14} color={theme.colors.white} />
        </View>
      </View>
      <View style={styles.followRequestsContent}>
        <Text style={styles.followRequestsTitle}>Follow requests</Text>
        <Text style={styles.followRequestsSubtitle}>{count} pending</Text>
      </View>
      <View style={styles.followRequestsBadge}>
        <View style={styles.followRequestsDot} />
      </View>
      <ChevronRight size={16} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [dismissedUsers, setDismissedUsers] = useState<string[]>([]);

  const notifsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: Notification[] }>('/notifications');
        return data;
      } catch {
        return { data: [] as Notification[] };
      }
    },
  });

  const suggestedQuery = useQuery({
    queryKey: ['suggested-users'],
    queryFn: async () => {
      console.log('[Notifications] Fetching suggested users');
      try {
        const data = await api.get<{ data: FlockUser[] }>('/social/flock/suggestions');
        return data;
      } catch {
        return { data: [] as FlockUser[] };
      }
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
  }, [queryClient]);

  const handleDismissUser = useCallback((userId: string) => {
    setDismissedUsers((prev) => [...prev, userId]);
  }, []);

  const notifications = notifsQuery.data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);
  const suggestedUsers = (suggestedQuery.data?.data ?? []).filter(
    (u) => !dismissedUsers.includes(u.id)
  );

  const followRequests = notifications.filter((n) => n.type === 'follow' && !n.is_read);
  const otherNotifications = notifications.filter((n) => n.type !== 'follow' || n.is_read);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const newNotifs = otherNotifications.filter(
    (n) => new Date(n.created_at).getTime() >= todayStart
  );
  const thisWeekNotifs = otherNotifications.filter((n) => {
    const t = new Date(n.created_at).getTime();
    return t >= weekStart && t < todayStart;
  });
  const olderNotifs = otherNotifications.filter(
    (n) => new Date(n.created_at).getTime() < weekStart
  );

  type ListItem =
    | { type: 'follow-requests'; key: string }
    | { type: 'section-header'; key: string; title: string }
    | { type: 'notification'; key: string; data: Notification }
    | { type: 'suggested-header'; key: string }
    | { type: 'suggested-user'; key: string; data: FlockUser }
    | { type: 'mark-all'; key: string };

  const listData: ListItem[] = [];

  if (hasUnread) {
    listData.push({ type: 'mark-all', key: 'mark-all' });
  }

  if (followRequests.length > 0) {
    listData.push({ type: 'follow-requests', key: 'follow-requests' });
  }

  if (newNotifs.length > 0) {
    listData.push({ type: 'section-header', key: 'header-new', title: 'New' });
    newNotifs.forEach((n) => {
      listData.push({ type: 'notification', key: `notif-${n.id}`, data: n });
    });
  }

  if (thisWeekNotifs.length > 0) {
    listData.push({ type: 'section-header', key: 'header-week', title: 'This Week' });
    thisWeekNotifs.forEach((n) => {
      listData.push({ type: 'notification', key: `notif-${n.id}`, data: n });
    });
  }

  if (olderNotifs.length > 0) {
    listData.push({ type: 'section-header', key: 'header-older', title: 'Older' });
    olderNotifs.forEach((n) => {
      listData.push({ type: 'notification', key: `notif-${n.id}`, data: n });
    });
  }

  if (suggestedUsers.length > 0) {
    listData.push({ type: 'suggested-header', key: 'suggested-header' });
    suggestedUsers.forEach((u) => {
      listData.push({ type: 'suggested-user', key: `suggested-${u.id}`, data: u });
    });
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'mark-all') {
      return (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          <CheckCheck size={16} color={theme.colors.accent} />
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
      );
    }

    if (item.type === 'follow-requests') {
      return (
        <FollowRequestsBanner
          count={followRequests.length}
          onPress={() => console.log('[Notifications] Follow requests tapped')}
        />
      );
    }

    if (item.type === 'section-header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }

    if (item.type === 'notification') {
      return (
        <NotificationRow
          item={item.data as Notification & { user_id?: string; is_following_back?: boolean }}
          onRead={(id) => markReadMutation.mutate(id)}
        />
      );
    }

    if (item.type === 'suggested-header') {
      return (
        <View style={styles.suggestedHeader}>
          <Text style={styles.suggestedHeaderText}>Suggestions for you</Text>
        </View>
      );
    }

    if (item.type === 'suggested-user') {
      return (
        <SuggestedUserRow
          user={item.data}
          onDismiss={handleDismissUser}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={notifsQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          notifsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={<Bell size={28} color={theme.colors.textTertiary} />}
              title="No notifications"
              description="You're all caught up!"
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
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  markAllText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  followRequestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  followRequestsAvatarStack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followRequestsAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0095F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followRequestsContent: {
    flex: 1,
  },
  followRequestsTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  followRequestsSubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  followRequestsBadge: {
    marginRight: 4,
  },
  followRequestsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0095F6',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  notifUnread: {
    backgroundColor: 'rgba(212, 165, 116, 0.04)',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifBold: {
    fontWeight: '600' as const,
  },
  notifBody: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 19,
  },
  notifTime: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  notifMeta: {
    alignItems: 'flex-end',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0095F6',
  },
  followBackBtn: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  followBackText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  followingBackBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 72,
    alignItems: 'center',
  },
  followingBackText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  suggestedHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  suggestedHeaderText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
});

