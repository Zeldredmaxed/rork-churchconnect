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
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import StatCard from '@/components/StatCard';
import type { AnalyticsOverview, EngagementData, GrowthData, AttendanceRecord } from '@/types';

export default function AdminAnalyticsScreen() {
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: () => api.get<{ data: AnalyticsOverview }>('/reports/analytics/overview'),
  });

  const engagementQuery = useQuery({
    queryKey: ['admin', 'analytics', 'engagement'],
    queryFn: () => api.get<{ data: EngagementData[] }>('/reports/analytics/engagement'),
  });

  const growthQuery = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: () => api.get<{ data: GrowthData[] }>('/reports/analytics/growth'),
  });

  const attendanceQuery = useQuery({
    queryKey: ['admin', 'analytics', 'attendance'],
    queryFn: () => api.get<{ data: AttendanceRecord[] }>('/reports/attendance'),
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
  }, [queryClient]);

  const overview = overviewQuery.data?.data;
  const engagement = engagementQuery.data?.data ?? [];
  const growth = growthQuery.data?.data ?? [];
  const attendance = attendanceQuery.data?.data ?? [];
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

            {attendance.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>RECENT ATTENDANCE</Text>
                {attendance.slice(0, 10).map((a) => (
                  <View key={a.id} style={styles.attendanceRow}>
                    <View style={styles.attendanceDot} />
                    <View style={styles.attendanceInfo}>
                      <Text style={styles.attendanceName}>{a.member_name}</Text>
                      <Text style={styles.attendanceEvent}>{a.event_title}</Text>
                    </View>
                    <Text style={styles.attendanceTime}>
                      {new Date(a.checked_in_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
