import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, MessageSquare, ChevronRight, UserPlus, LogOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { Group } from '@/types';

export default function GroupDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const groupQuery = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/groups/${id}`);
      console.log('[GroupDetail] Raw response:', JSON.stringify(res).slice(0, 500));
      const parsed = res as Record<string, unknown>;
      if (parsed.data && typeof parsed.data === 'object' && (parsed.data as Record<string, unknown>).id) {
        return parsed.data as unknown as Group;
      }
      if (parsed.id) return parsed as unknown as Group;
      return null;
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/groups/${id}/join`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['group', id] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      Alert.alert('Joined!', 'You have successfully joined this group.');
    },
    onError: (error) => {
      console.log('[GroupDetail] Join error:', error.message);
      Alert.alert('Error', error.message || 'Failed to join group.');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/groups/${id}/leave`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['group', id] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      Alert.alert('Left Group', 'You have left this group.');
    },
    onError: (error) => {
      console.log('[GroupDetail] Leave error:', error.message);
      Alert.alert('Error', error.message || 'Failed to leave group.');
    },
  });

  const handleJoin = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    joinMutation.mutate();
  };

  const handleLeave = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          leaveMutation.mutate();
        },
      },
    ]);
  };

  const group = groupQuery.data;

  if (groupQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Group' }} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Group' }} />
        <Text style={styles.emptyText}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: group.name,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <View style={styles.groupIcon}>
            <Users size={28} color={theme.colors.accent} />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDesc}>{group.description}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{group.member_count}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{group.type}</Text>
              <Text style={styles.statLabel}>Type</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoin}
              activeOpacity={0.8}
              disabled={joinMutation.isPending}
            >
              <UserPlus size={16} color={theme.colors.white} />
              <Text style={styles.joinButtonText}>
                {joinMutation.isPending ? 'Joining...' : 'Join Group'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeave}
              activeOpacity={0.8}
              disabled={leaveMutation.isPending}
            >
              <LogOut size={16} color={theme.colors.error} />
              <Text style={styles.leaveButtonText}>
                {leaveMutation.isPending ? 'Leaving...' : 'Leave'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.chatLink} activeOpacity={0.7}>
          <View style={styles.chatIcon}>
            <MessageSquare size={18} color={theme.colors.info} />
          </View>
          <View style={styles.chatInfo}>
            <Text style={styles.chatLabel}>Group Chat</Text>
            <Text style={styles.chatSub}>Message your group members</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>MEMBERS</Text>
        {group.members?.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {m.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.memberName}>{m.name}</Text>
            {m.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{m.role}</Text>
              </View>
            )}
          </View>
        )) ?? (
          <Text style={styles.noMembers}>Member list not available</Text>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  groupDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  chatLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
    marginBottom: 20,
  },
  chatIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.infoMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  chatSub: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  noMembers: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
    paddingVertical: 20,
  },
  actionRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 16,
    width: '100%' as const,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  leaveButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: theme.colors.errorMuted,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.error,
  },
});

