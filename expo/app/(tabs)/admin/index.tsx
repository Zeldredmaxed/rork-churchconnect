import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import {
  Users,
  DollarSign,
  CalendarDays,
  HandHeart,
  BarChart3,
  UserPlus,
  FileText,
  Settings,
  ChevronRight,
  PlayCircle,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/StatCard';
import type { AnalyticsOverview } from '@/types';

interface AdminLinkProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}

function AdminLink({ icon, label, description, onPress }: AdminLinkProps) {
  return (
    <TouchableOpacity style={styles.adminLink} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.adminLinkIcon}>{icon}</View>
      <View style={styles.adminLinkContent}>
        <Text style={styles.adminLinkLabel}>{label}</Text>
        <Text style={styles.adminLinkDesc}>{description}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

function EngagementRing({ score }: { score: number }) {
  const percentage = Math.min(Math.max(score, 0), 100);
  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Text style={styles.ringValue}>{percentage}%</Text>
          <Text style={styles.ringLabel}>Engagement</Text>
        </View>
      </View>
      <View
        style={[
          styles.ringProgress,
          {
            backgroundColor:
              percentage > 70
                ? theme.colors.success
                : percentage > 40
                ? theme.colors.warning
                : theme.colors.error,
            width: `${percentage}%`,
          },
        ]}
      />
    </View>
  );
}

export default function AdminDashboard() {
  const { isPastor } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<AnalyticsOverview>('/reports/analytics/overview'),
  });

  const data = overviewQuery.data;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <Text style={styles.headerTitle}>Dashboard</Text>,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={overviewQuery.isRefetching}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['admin'] })}
            tintColor={theme.colors.accent}
          />
        }
      >
        {overviewQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon={<Users size={18} color={theme.colors.accent} />}
                value={data?.total_members ?? 0}
                label="Total Members"
                trend="up"
                trendValue="+12%"
              />
              <StatCard
                icon={<DollarSign size={18} color={theme.colors.success} />}
                value={`$${(data?.giving_this_month ?? 0).toLocaleString()}`}
                label="Giving This Month"
                trend="up"
                trendValue="+8%"
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                icon={<CalendarDays size={18} color={theme.colors.info} />}
                value={data?.upcoming_events ?? 0}
                label="Upcoming Events"
              />
              <StatCard
                icon={<HandHeart size={18} color={theme.colors.warning} />}
                value={data?.active_prayers ?? 0}
                label="Active Prayers"
              />
            </View>

            <View style={styles.engagementSection}>
              <Text style={styles.sectionTitle}>Engagement Score</Text>
              <EngagementRing score={data?.engagement_score ?? 0} />
            </View>

            <View style={styles.linksSection}>
              <Text style={styles.sectionTitle}>Manage</Text>
              <View style={styles.linksCard}>
                <AdminLink
                  icon={<Users size={18} color={theme.colors.accent} />}
                  label="Members"
                  description="View, add, and manage church members"
                  onPress={() => router.push('/admin-members' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<CalendarDays size={18} color={theme.colors.info} />}
                  label="Events"
                  description="Create and manage church events"
                  onPress={() => router.push('/admin-events' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<HandHeart size={18} color={theme.colors.warning} />}
                  label="Prayer Moderation"
                  description="Review and moderate prayer requests"
                  onPress={() => router.push('/admin-prayers' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<DollarSign size={18} color={theme.colors.success} />}
                  label="Giving & Finance"
                  description="Manage funds, view donation reports"
                  onPress={() => router.push('/admin-finance' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<UserPlus size={18} color={theme.colors.accent} />}
                  label="Groups"
                  description="Manage small groups and membership"
                  onPress={() => router.push('/admin-groups' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<BarChart3 size={18} color={theme.colors.info} />}
                  label="Analytics & Reports"
                  description="View engagement, growth, and attendance"
                  onPress={() => router.push('/admin-analytics' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<FileText size={18} color={theme.colors.textSecondary} />}
                  label="Announcements"
                  description="Send push notifications to members"
                  onPress={() => router.push('/admin-announcements' as never)}
                />
                <View style={styles.linkDivider} />
                <AdminLink
                  icon={<PlayCircle size={18} color={theme.colors.info} />}
                  label="Sermons & Services"
                  description="Upload sermons, set service scripture"
                  onPress={() => router.push('/admin-sermons' as never)}
                />
                {isPastor && (
                  <>
                    <View style={styles.linkDivider} />
                    <AdminLink
                      icon={<Settings size={18} color={theme.colors.textSecondary} />}
                      label="Church Settings"
                      description="Church profile, roles, features"
                      onPress={() => router.push('/admin-settings' as never)}
                    />
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 10,
  },
  engagementSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
    marginLeft: 4,
  },
  ringContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ringInner: {
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  ringLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  ringProgress: {
    height: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  linksSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  linksCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  adminLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminLinkContent: {
    flex: 1,
  },
  adminLinkLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  adminLinkDesc: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  linkDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 62,
  },
});
