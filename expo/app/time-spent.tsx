import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

interface TimeSpentDay {
  date: string;
  minutes: number;
}

interface TimeSpentResponse {
  data: {
    daily: TimeSpentDay[];
    total_minutes: number;
    weekly_avg: number;
    days: number;
  };
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const dayIdx = d.getDay();
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return labels[dayIdx] ?? 'N/A';
}

export default function TimeSpentScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const timeQuery = useQuery({
    queryKey: ['time-spent'],
    queryFn: async () => {
      try {
        const raw = await api.get<TimeSpentResponse | { daily: TimeSpentDay[]; total_minutes: number; weekly_avg: number; days: number }>('/activity/time-spent?days=7');
        console.log('[TimeSpent] Fetched:', JSON.stringify(raw).slice(0, 300));
        if (raw && typeof raw === 'object' && 'data' in raw && (raw as TimeSpentResponse).data) {
          return (raw as TimeSpentResponse).data;
        }
        return raw as { daily: TimeSpentDay[]; total_minutes: number; weekly_avg: number; days: number };
      } catch (e) {
        console.log('[TimeSpent] Error:', e);
        return null;
      }
    },
  });

  const data = timeQuery.data;
  const daily = data?.daily ?? [];
  const totalMinutes = data?.total_minutes ?? 0;
  const _weeklyAvg = data?.weekly_avg ?? 0;

  const minuteValues = daily.map((d) => d.minutes);
  const maxVal = minuteValues.length > 0 ? Math.max(...minuteValues, 1) : 1;
  const avg = daily.length > 0
    ? Math.round(minuteValues.reduce((a, b) => a + b, 0) / daily.length)
    : 0;

  const isBelowAvg = avg < 30;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Time spent',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      {timeQuery.isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={timeQuery.isRefetching}
              onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['time-spent'] })}
              tintColor={theme.colors.accent}
            />
          }
        >
          <View style={s.card}>
            <Text style={s.cardLabel}>Daily average</Text>
            <Text style={s.cardValue}>{avg} min</Text>
            <View style={s.trendRow}>
              {isBelowAvg ? (
                <TrendingDown size={14} color={theme.colors.success} />
              ) : (
                <TrendingUp size={14} color={theme.colors.warning} />
              )}
              <Text style={[s.trendText, !isBelowAvg && { color: theme.colors.warning }]}>
                {isBelowAvg ? 'Below average this week' : 'Above average this week'}
              </Text>
            </View>
          </View>

          <View style={s.totalCard}>
            <Text style={s.totalLabel}>Total this week</Text>
            <Text style={s.totalValue}>{Math.round(totalMinutes)} min</Text>
          </View>

          <View style={s.chartContainer}>
            <Text style={s.chartTitle}>This week</Text>
            <View style={s.chart}>
              {daily.length > 0 ? daily.map((day, idx) => (
                <View key={idx} style={s.barCol}>
                  <View
                    style={[
                      s.bar,
                      {
                        height: (day.minutes / maxVal) * 120,
                        backgroundColor: day.minutes === maxVal ? theme.colors.accent : theme.colors.surfaceElevated,
                      },
                    ]}
                  />
                  <Text style={s.barLabel}>{getDayLabel(day.date)}</Text>
                </View>
              )) : DAY_LABELS.map((label, idx) => (
                <View key={idx} style={s.barCol}>
                  <View style={[s.bar, { height: 8, backgroundColor: theme.colors.surfaceElevated }]} />
                  <Text style={s.barLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.infoSection}>
            <Clock size={20} color={theme.colors.textTertiary} />
            <Text style={s.infoText}>
              Set daily reminders to help manage the time you spend on the app. You can find this in your notification settings.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40, paddingHorizontal: 16 },
  card: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 14, padding: 20, marginTop: 20, alignItems: 'center' },
  cardLabel: { fontSize: 14, color: theme.colors.textTertiary, marginBottom: 4 },
  cardValue: { fontSize: 36, fontWeight: '700' as const, color: theme.colors.text },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  trendText: { fontSize: 13, color: theme.colors.success },
  totalCard: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 14, padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, color: theme.colors.textSecondary },
  totalValue: { fontSize: 18, fontWeight: '700' as const, color: theme.colors.text },
  chartContainer: { marginTop: 28 },
  chartTitle: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.text, marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, paddingBottom: 24 },
  barCol: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  bar: { width: 28, borderRadius: 6, minHeight: 8 },
  barLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 8 },
  infoSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 28, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
});
