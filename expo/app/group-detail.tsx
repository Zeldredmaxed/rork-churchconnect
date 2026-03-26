import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { Group } from '@/types';

export default function GroupDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { id } = useLocalSearchParams<{ id: string }>();

  const groupQuery = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.get<{ data: Group }>(`/groups/${id}`),
    enabled: !!id,
  });

  const group = groupQuery.data?.data;

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
    textAlign: 'center',
    paddingVertical: 20,
  },
});
