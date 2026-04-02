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
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/StatCard';
import type { AnalyticsOverview } from '@/types';

interface DashboardMetrics {
  members: { total: number; trend: number; label: string };
  giving: { total: number; trend: number; label: string };
  prayers: { total: number; trend: number; label: string };
}

interface AdminLinkProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}

function AdminLink({ icon, label, description, onPress }: AdminLinkProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { isPastor } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const metricsQuery = useQuery({
    queryKey: ['admin', 'dashboard-metrics'],
    queryFn: async () => {
      try {
        const res = await api.get<unknown>('/dashboard/metrics');
        console.log('[Admin] Dashboard metrics raw:', JSON.stringify(res).slice(0, 500));
        const parsed = res as Record<string, unknown>;
        const metricsData = (parsed.data ?? res) as Record<string, unknown>;
        const members = metricsData.members as DashboardMetrics['members'] | undefined;
        const giving = metricsData.giving as DashboardMetrics['giving'] | undefined;
        const prayers = metricsData.prayers as DashboardMetrics['prayers'] | undefined;
        if (members || giving || prayers) {
          return {
            members: members ?? { total: 0, trend: 0, label: '' },
            giving: giving ?? { total: 0, trend: 0, label: '' },
            prayers: prayers ?? { total: 0, trend: 0, label: '' },
          } as DashboardMetrics;
        }
        const totalMembers = (metricsData.total_members ?? metricsData.member_count ?? 0) as number;
        const totalGiving = (metricsData.giving_this_month ?? metricsData.total_giving ?? 0) as number;
        const totalPrayers = (metricsData.active_prayers ?? metricsData.prayer_count ?? 0) as number;
        return {
          members: { total: totalMembers, trend: 0, label: '' },
          giving: { total: totalGiving, trend: 0, label: '' },
          prayers: { total: totalPrayers, trend: 0, label: '' },
        } as DashboardMetrics;
      } catch (e) {
        console.log('[Admin] /dashboard/metrics failed, trying fallback:', e);
        try {
          const fallbackRaw = await api.get<unknown>('/reports/analytics/overview');
          console.log('[Admin] Overview fallback raw:', JSON.stringify(fallbackRaw).slice(0, 500));
          const fb = fallbackRaw as Record<string, unknown>;
          const fallback = (fb.data ?? fallbackRaw) as Record<string, unknown>;
          return {
            members: { total: (fallback.total_members ?? 0) as number, trend: 0, label: '' },
            giving: { total: (fallback.giving_this_month ?? 0) as number, trend: 0, label: '' },
            prayers: { total: (fallback.active_prayers ?? 0) as number, trend: 0, label: '' },
          } as DashboardMetrics;
        } catch {
          return { members: { total: 0, trend: 0, label: '' }, giving: { total: 0, trend: 0, label: '' }, prayers: { total: 0, trend: 0, label: '' } } as DashboardMetrics;
        }
      }
    },
  });

  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      try {
        const res = await api.get<unknown>('/reports/analytics/overview');
        console.log('[Admin] Overview raw:', JSON.stringify(res).slice(0, 500));
        const parsed = res as Record<string, unknown>;
        const data = (parsed.data ?? res) as AnalyticsOverview;
        return data;
      } catch (e) {
        console.log('[Admin] Overview query failed:', e);
        return {
          total_members: 0,
          giving_this_month: 0,
          upcoming_events: 0,
          active_prayers: 0,
          engagement_score: 0,
        } as AnalyticsOverview;
      }
    },
  });

  const metrics = metricsQuery.data;
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
        {(overviewQuery.isLoading && metricsQuery.isLoading) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon={<Users size={18} color={theme.colors.accent} />}
                value={metrics?.members?.total ?? data?.total_members ?? 0}
                label="Total Members"
                trend={metrics?.members?.trend && metrics.members.trend > 0 ? 'up' : undefined}
                trendValue={metrics?.members?.trend ? `${metrics.members.trend > 0 ? '+' : ''}${metrics.members.trend} ${metrics.members.label}` : '+12%'}
              />
              <StatCard
                icon={<DollarSign size={18} color={theme.colors.success} />}
                value={`${(metrics?.giving?.total ?? data?.giving_this_month ?? 0).toLocaleString()}`}
                label="Giving This Month"
                trend={metrics?.giving?.trend && metrics.giving.trend > 0 ? 'up' : undefined}
                trendValue={metrics?.giving?.trend ? `${metrics.giving.trend > 0 ? '+' : ''}${metrics.giving.trend}% ${metrics.giving.label}` : '+8%'}
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
                value={metrics?.prayers?.total ?? data?.active_prayers ?? 0}
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

