import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  CreditCard,
  CalendarRange,
  CircleUser,
  Shield,
  HelpCircle,
  ShoppingBag,
  Heart,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { Donation } from '@/types';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function SettingsRow({ icon, label, onPress }: SettingsRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={16} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function OrdersPaymentsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  const historyQuery = useQuery({
    queryKey: ['donations', 'my'],
    queryFn: () => api.get<{ data: Donation[] }>('/donations'),
  });

  const donations = historyQuery.data?.data ?? [];
  const hasActivity = donations.length > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Orders and payments',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {hasActivity ? (
            <View style={styles.activityList}>
              {donations.slice(0, 3).map((d) => (
                <View key={d.id} style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Heart size={14} color={theme.colors.accent} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityFund}>{d.fund_name}</Text>
                    <Text style={styles.activityDate}>
                      {new Date(d.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.activityAmount}>${d.amount.toFixed(2)}</Text>
                </View>
              ))}
              {donations.length > 3 ? (
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => router.push('/giving')}
                >
                  <Text style={styles.viewAllText}>View all activity</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIconRow}>
                <ShoppingBag size={22} color={theme.colors.textTertiary} />
                <Heart size={22} color={theme.colors.textTertiary} />
                <Users size={22} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.emptyText}>
                You don't have any pending or completed activity.{'\n'}
                When you give or donate, that activity will appear here.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon={<CreditCard size={20} color={theme.colors.textSecondary} />}
              label="Payment methods"
              onPress={() => router.push('/payment-methods')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={<CalendarRange size={20} color={theme.colors.textSecondary} />}
              label="Giving history"
              onPress={() => router.push('/giving')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={<CircleUser size={20} color={theme.colors.textSecondary} />}
              label="Contact info"
              onPress={() => router.push('/profile')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={<Shield size={20} color={theme.colors.textSecondary} />}
              label="Security"
              onPress={() => console.log('Security')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={<HelpCircle size={20} color={theme.colors.textSecondary} />}
              label="Help and support"
              onPress={() => console.log('Help')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 12,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  emptyIconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  activityList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityFund: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  activityDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.success,
  },
  viewAllBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 54,
  },
});

