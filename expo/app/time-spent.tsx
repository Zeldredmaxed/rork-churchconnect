import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Clock, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOCK_MINUTES = [12, 28, 18, 35, 22, 45, 30];

export default function TimeSpentScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const maxVal = Math.max(...MOCK_MINUTES);
  const avg = Math.round(MOCK_MINUTES.reduce((a, b) => a + b, 0) / MOCK_MINUTES.length);

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
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.cardLabel}>Daily average</Text>
          <Text style={s.cardValue}>{avg} min</Text>
          <View style={s.trendRow}>
            <TrendingDown size={14} color={theme.colors.success} />
            <Text style={s.trendText}>Below average this week</Text>
          </View>
        </View>

        <View style={s.chartContainer}>
          <Text style={s.chartTitle}>This week</Text>
          <View style={s.chart}>
            {MOCK_MINUTES.map((val, idx) => (
              <View key={idx} style={s.barCol}>
                <View style={[s.bar, { height: (val / maxVal) * 120, backgroundColor: val === maxVal ? theme.colors.accent : theme.colors.surfaceElevated }]} />
                <Text style={s.barLabel}>{DAYS[idx]}</Text>
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
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40, paddingHorizontal: 16 },
  card: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 14, padding: 20, marginTop: 20, alignItems: 'center' },
  cardLabel: { fontSize: 14, color: theme.colors.textTertiary, marginBottom: 4 },
  cardValue: { fontSize: 36, fontWeight: '700', color: theme.colors.text },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  trendText: { fontSize: 13, color: theme.colors.success },
  chartContainer: { marginTop: 28 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, paddingBottom: 24 },
  barCol: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  bar: { width: 28, borderRadius: 6, minHeight: 8 },
  barLabel: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 8 },
  infoSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 28, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
});
