import React, { useCallback } from 'react';
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
import { Stack } from 'expo-router';
import { Download, TrendingUp, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import StatCard from '@/components/StatCard';
import type { AnalyticsOverview, EngagementData, GrowthData, GrowthFunnel, AttendanceSummary } from '@/types';

export default function AdminAnalyticsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: async () => {
      try {
        const res = await api.get<unknown>('/reports/analytics/overview');
        console.log('[Analytics] Overview raw:', JSON.stringify(res).slice(0, 500));
        return res;
      } catch (e) {
        console.log('[Analytics] Overview failed:', e);
        return null;
      }
    },
  });

  const engagementQuery = useQuery({
    queryKey: ['admin', 'analytics', 'engagement'],
    queryFn: async () => {
      try {
        const res = await api.get<unknown>('/reports/analytics/engagement');
        console.log('[Analytics] Engagement raw:', JSON.stringify(res).slice(0, 500));
        const parsed = res as Record<string, unknown>;
        const arr = (Array.isArray(parsed.data) ? parsed.data : Array.isArray(res) ? res : []) as Record<string, unknown>[];
        return arr.map((e) => ({
          week: (e.week ?? '') as string,
          score: (e.score ?? e.attendance ?? 0) as number,
          active_users: (e.active_users ?? e.new_members ?? 0) as number,
          attendance: (e.attendance ?? 0) as number,
          new_members: (e.new_members ?? 0) as number,
          prayer_requests: (e.prayer_requests ?? 0) as number,
        })) as EngagementData[];
      } catch (e) {
        console.log('[Analytics] Engagement failed:', e);
        return [] as EngagementData[];
      }
    },
  });

  const growthQuery = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: async () => {
      try {
        const res = await api.get<unknown>('/reports/analytics/growth');
        console.log('[Analytics] Growth raw:', JSON.stringify(res).slice(0, 500));
        const parsed = res as Record<string, unknown>;
        const dataObj = (parsed.data ?? res) as Record<string, unknown>;
        const funnel = dataObj.funnel as GrowthFunnel | undefined;
        if (funnel) {
          return [
            { stage: 'Visitors', count: funnel.visitors ?? 0 },
            { stage: 'Prospects', count: funnel.prospects ?? 0 },
            { stage: 'Active', count: funnel.active_members ?? 0 },
            { stage: 'Inactive', count: funnel.inactive_members ?? 0 },
          ] as GrowthData[];
        }
        if (Array.isArray(dataObj)) return dataObj as GrowthData[];
        if (Array.isArray(parsed.data)) return parsed.data as GrowthData[];
        return [] as GrowthData[];
      } catch (e) {
        console.log('[Analytics] Growth failed:', e);
        return [] as GrowthData[];
      }
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ['admin', 'analytics', 'attendance'],
    queryFn: async () => {
      try {
        const res = await api.get<unknown>('/reports/attendance');
        console.log('[Analytics] Attendance raw:', JSON.stringify(res).slice(0, 500));
        const parsed = res as Record<string, unknown>;
        const dataObj = (parsed.data ?? res) as Record<string, unknown>;
        return {
          total_records: (dataObj.total_records ?? 0) as number,
          avg_attendance: (dataObj.avg_attendance ?? 0) as number,
          peak_attendance: (dataObj.peak_attendance ?? 0) as number,
          peak_date: (dataObj.peak_date ?? '') as string,
          first_time_guests_total: (dataObj.first_time_guests_total ?? 0) as number,
          by_service: (Array.isArray(dataObj.by_service) ? dataObj.by_service : []) as AttendanceSummary['by_service'],
        } as AttendanceSummary;
      } catch (e) {
        console.log('[Analytics] Attendance failed:', e);
        return null;
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
  }, [queryClient]);

  const overview = React.useMemo(() => {
    const raw = overviewQuery.data as unknown;
    if (!raw) return undefined;
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (obj.data && typeof obj.data === 'object') return obj.data as AnalyticsOverview;
      if ('total_members' in obj || 'engagement_score' in obj) return obj as unknown as AnalyticsOverview;
    }
    return undefined;
  }, [overviewQuery.data]);

  const engagement = engagementQuery.data ?? [];
  const growth = growthQuery.data ?? [];
  const attendanceSummary = attendanceQuery.data;
  const isLoading = overviewQuery.isLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Analytics',
          headerRight: () => (
            <TouchableOpacity onPress={() => console.log('Export')} style={{ padding: 4 }}>
              <Download size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={theme.colors.accent} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard icon={<Users size={18} color={theme.colors.accent} />} value={overview?.total_members ?? 0} label="Members" />
              <StatCard icon={<TrendingUp size={18} color={theme.colors.success} />} value={`${overview?.engagement_score ?? 0}%`} label="Engagement" />
            </View>

            {growth.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>GROWTH FUNNEL</Text>
                <View style={styles.funnelCard}>
                  {growth.map((g, i) => {
                    const maxCount = Math.max(...growth.map((x) => x.count), 1);
                    return (
                      <View key={i} style={styles.funnelRow}>
                        <Text style={styles.funnelStage}>{g.stage}</Text>
                        <View style={styles.funnelBarContainer}>
                          <View style={[styles.funnelBar, { width: `${(g.count / maxCount) * 100}%` }]} />
                        </View>
                        <Text style={styles.funnelCount}>{g.count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {engagement.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>WEEKLY ENGAGEMENT</Text>
                <View style={styles.tableCard}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Week</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 60 }]}>Score</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 70 }]}>Active</Text>
                  </View>
                  {engagement.slice(0, 10).map((e, i) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{e.week}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{e.score}%</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{e.active_users}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {attendanceSummary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ATTENDANCE SUMMARY</Text>
                <View style={styles.funnelCard}>
                  <View style={styles.funnelRow}>
                    <Text style={styles.funnelStage}>Total Records</Text>
                    <Text style={styles.funnelCount}>{attendanceSummary.total_records}</Text>
                  </View>
                  <View style={styles.funnelRow}>
                    <Text style={styles.funnelStage}>Avg Attendance</Text>
                    <Text style={styles.funnelCount}>{attendanceSummary.avg_attendance}</Text>
                  </View>
                  <View style={styles.funnelRow}>
                    <Text style={styles.funnelStage}>Peak</Text>
                    <Text style={styles.funnelCount}>{attendanceSummary.peak_attendance}</Text>
                  </View>
                  {attendanceSummary.peak_date ? (
                    <View style={styles.funnelRow}>
                      <Text style={styles.funnelStage}>Peak Date</Text>
                      <Text style={styles.funnelCount}>{new Date(attendanceSummary.peak_date).toLocaleDateString()}</Text>
                    </View>
                  ) : null}
                  <View style={styles.funnelRow}>
                    <Text style={styles.funnelStage}>First-Time Guests</Text>
                    <Text style={styles.funnelCount}>{attendanceSummary.first_time_guests_total}</Text>
                  </View>
                  {attendanceSummary.by_service.length > 0 && (
                    <>
                      <View style={[styles.funnelRow, { marginTop: 8 }]}>
                        <Text style={[styles.funnelStage, { fontWeight: '600' as const }]}>By Service</Text>
                        <Text style={styles.funnelCount} />
                      </View>
                      {attendanceSummary.by_service.map((s) => (
                        <View key={s.service_id} style={styles.funnelRow}>
                          <Text style={styles.funnelStage}>{s.service_name}</Text>
                          <Text style={styles.funnelCount}>avg {s.avg_attendance}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600' as const, color: theme.colors.textTertiary,
    letterSpacing: 0.8, marginBottom: 10,
  },
  funnelCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: 16, gap: 12, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funnelStage: { fontSize: 13, color: theme.colors.text, width: 80, fontWeight: '500' as const },
  funnelBarContainer: { flex: 1, height: 8, backgroundColor: theme.colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  funnelBar: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 4 },
  funnelCount: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.text, width: 40, textAlign: 'right' },
  tableCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden',
  },
  tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.surfaceElevated, paddingVertical: 10, paddingHorizontal: 14 },
  tableHeaderCell: { fontWeight: '600' as const, color: theme.colors.textTertiary, fontSize: 11, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  tableCell: { fontSize: 13, color: theme.colors.text },
  attendanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  attendanceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  attendanceInfo: { flex: 1 },
  attendanceName: { fontSize: 14, fontWeight: '500' as const, color: theme.colors.text },
  attendanceEvent: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  attendanceTime: { fontSize: 12, color: theme.colors.textTertiary },
});

