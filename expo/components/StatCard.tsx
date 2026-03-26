import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export default function StatCard({ icon, value, label, trend, trendValue }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend && trendValue && (
        <View style={styles.trendRow}>
          {trend === 'up' ? (
            <TrendingUp size={12} color={theme.colors.success} />
          ) : (
            <TrendingDown size={12} color={theme.colors.error} />
          )}
          <Text style={[styles.trendText, trend === 'up' ? styles.trendUp : styles.trendDown]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  trendUp: {
    color: theme.colors.success,
  },
  trendDown: {
    color: theme.colors.error,
  },
});
