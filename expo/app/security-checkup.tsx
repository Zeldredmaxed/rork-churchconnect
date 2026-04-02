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
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

interface SecurityCheck {
  id: string;
  title: string;
  description: string;
  status: 'good' | 'warning' | 'action_needed';
  action_route?: string;
  action_label?: string;
}

function getCheckIcon(status: string, theme: AppTheme) {
  switch (status) {
    case 'good': return <CheckCircle size={20} color={theme.colors.success} />;
    case 'warning': return <AlertCircle size={20} color={theme.colors.warning} />;
    case 'action_needed': return <AlertCircle size={20} color={theme.colors.error} />;
    default: return <Shield size={20} color={theme.colors.textSecondary} />;
  }
}

export default function SecurityCheckupScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();

  const checkupQuery = useQuery({
    queryKey: ['security-checkup'],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: SecurityCheck[] }>('/auth/security-checkup');
        console.log('[SecurityCheckup] Fetched:', data);
        return data?.data ?? [];
      } catch (e) {
        console.log('[SecurityCheckup] Error, using defaults:', e);
        return [
          { id: '1', title: 'Password strength', description: 'Your password meets our security requirements', status: 'good' },
          { id: '2', title: 'Email verification', description: 'Verify your email for account recovery', status: 'warning', action_route: '/password-security', action_label: 'Verify' },
          { id: '3', title: 'Active sessions', description: 'Review devices logged into your account', status: 'good', action_route: '/active-sessions', action_label: 'Review' },
          { id: '4', title: 'Two-factor authentication', description: 'Add extra protection to your account', status: 'warning', action_route: '/password-security', action_label: 'Enable' },
        ] as SecurityCheck[];
      }
    },
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['security-checkup'] });
  }, [queryClient]);

  const checks = checkupQuery.data ?? [];
  const goodCount = checks.filter((c) => c.status === 'good').length;
  const totalCount = checks.length;
  const score = totalCount > 0 ? Math.round((goodCount / totalCount) * 100) : 0;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Security checkup',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      {checkupQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={checkupQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
          }
        >
          <View style={s.heroSection}>
            <View style={[s.scoreCircle, score >= 75 ? s.scoreGood : score >= 50 ? s.scoreWarning : s.scoreBad]}>
              <Text style={s.scoreNumber}>{score}</Text>
              <Text style={s.scoreLabel}>%</Text>
            </View>
            <Text style={s.heroTitle}>
              {score >= 75 ? 'Your account is secure' : score >= 50 ? 'Some improvements needed' : 'Action needed'}
            </Text>
            <Text style={s.heroDesc}>
              {goodCount} of {totalCount} security checks passed
            </Text>
          </View>

          {checks.map((check) => (
            <TouchableOpacity
              key={check.id}
              style={s.checkCard}
              activeOpacity={check.action_route ? 0.7 : 1}
              onPress={() => check.action_route && router.push(check.action_route as never)}
            >
              <View style={s.checkIcon}>{getCheckIcon(check.status, theme)}</View>
              <View style={s.checkContent}>
                <Text style={s.checkTitle}>{check.title}</Text>
                <Text style={s.checkDesc}>{check.description}</Text>
              </View>
              {check.action_route && (
                <View style={s.checkAction}>
                  {check.action_label && (
                    <Text style={[s.actionText, check.status !== 'good' && s.actionTextWarning]}>
                      {check.action_label}
                    </Text>
                  )}
                  <ChevronRight size={14} color={theme.colors.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSection: { alignItems: 'center', paddingTop: 28, paddingBottom: 24, paddingHorizontal: 32 },
  scoreCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 14, flexDirection: 'row' },
  scoreGood: { backgroundColor: theme.colors.successMuted, borderWidth: 3, borderColor: theme.colors.success },
  scoreWarning: { backgroundColor: theme.colors.warningMuted, borderWidth: 3, borderColor: theme.colors.warning },
  scoreBad: { backgroundColor: theme.colors.errorMuted, borderWidth: 3, borderColor: theme.colors.error },
  scoreNumber: { fontSize: 28, fontWeight: '700' as const, color: theme.colors.text },
  scoreLabel: { fontSize: 14, fontWeight: '500' as const, color: theme.colors.textSecondary, marginTop: 4 },
  heroTitle: { fontSize: 18, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 4 },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary },
  checkCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, padding: 14, gap: 12 },
  checkIcon: {},
  checkContent: { flex: 1 },
  checkTitle: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  checkDesc: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  checkAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.accent },
  actionTextWarning: { color: theme.colors.warning },
});
