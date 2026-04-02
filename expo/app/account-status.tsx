import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api, extractObject } from '@/utils/api';

interface AccountStatusData {
  account_type: string;
  is_active: boolean;
  is_verified: boolean;
  is_2fa_enabled: boolean;
  email: string;
  username: string;
  full_name: string;
  church_id: number;
  church_name: string;
  joined_at: string;
  last_login_at: string;
}

export default function AccountStatusScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const { user } = useAuth();

  const statusQuery = useQuery({
    queryKey: ['account-status'],
    queryFn: async () => {
      try {
        const raw = await api.get<unknown>('/auth/account-status');
        console.log('[AccountStatus] Response:', JSON.stringify(raw).slice(0, 500));
        return extractObject<AccountStatusData>(raw);
      } catch (e) {
        console.log('[AccountStatus] Failed to fetch:', e);
        return null;
      }
    },
  });

  const status = statusQuery.data;
  const isActive = status?.is_active ?? true;
  const displayName = status?.full_name ?? user?.full_name ?? 'User';
  const displayRole = status?.account_type ?? user?.role ?? 'member';
  const churchName = status?.church_name ?? '';
  const joinedAt = status?.joined_at ?? user?.created_at;
  const lastLogin = status?.last_login_at;
  const isVerified = status?.is_verified ?? false;
  const is2fa = status?.is_2fa_enabled ?? false;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Account status',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        {statusQuery.isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <>
            <View style={s.heroSection}>
              <View style={s.statusBadge}>
                {isActive ? (
                  <CheckCircle size={48} color={theme.colors.success} />
                ) : (
                  <AlertTriangle size={48} color={theme.colors.warning} />
                )}
              </View>
              <Text style={s.heroTitle}>
                {isActive ? 'Your account is in good standing' : 'Account requires attention'}
              </Text>
              <Text style={s.heroDesc}>
                {isActive ? 'There are no issues with your account.' : 'Please contact administration for details.'}
              </Text>
            </View>

            <View style={s.card}>
              <View style={s.cardRow}>
                <Text style={s.cardLabel}>Account</Text>
                <Text style={s.cardValue}>{displayName}</Text>
              </View>
              <View style={s.cardDivider} />
              <View style={s.cardRow}>
                <Text style={s.cardLabel}>Status</Text>
                <View style={[s.statusTag, !isActive && s.statusTagWarning]}>
                  <Text style={[s.statusTagText, !isActive && s.statusTagTextWarning]}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <View style={s.cardDivider} />
              <View style={s.cardRow}>
                <Text style={s.cardLabel}>Role</Text>
                <Text style={s.cardValue}>{displayRole}</Text>
              </View>
              {churchName ? (
                <>
                  <View style={s.cardDivider} />
                  <View style={s.cardRow}>
                    <Text style={s.cardLabel}>Church</Text>
                    <Text style={s.cardValue}>{churchName}</Text>
                  </View>
                </>
              ) : null}
              <View style={s.cardDivider} />
              <View style={s.cardRow}>
                <Text style={s.cardLabel}>Verified</Text>
                <Text style={s.cardValue}>{isVerified ? 'Yes' : 'No'}</Text>
              </View>
              <View style={s.cardDivider} />
              <View style={s.cardRow}>
                <Text style={s.cardLabel}>2FA Enabled</Text>
                <Text style={s.cardValue}>{is2fa ? 'Yes' : 'No'}</Text>
              </View>
              <View style={s.cardDivider} />
              <View style={s.cardRow}>
                <Text style={s.cardLabel}>Joined</Text>
                <Text style={s.cardValue}>{joinedAt ? new Date(joinedAt).toLocaleDateString() : 'N/A'}</Text>
              </View>
              {lastLogin ? (
                <>
                  <View style={s.cardDivider} />
                  <View style={s.cardRow}>
                    <Text style={s.cardLabel}>Last Login</Text>
                    <Text style={s.cardValue}>{new Date(lastLogin).toLocaleDateString()}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 32 },
  statusBadge: { marginBottom: 16 },
  heroTitle: { fontSize: 18, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 8, textAlign: 'center' as const },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center' as const },
  card: { marginHorizontal: 16, backgroundColor: theme.colors.surfaceElevated, borderRadius: 14, overflow: 'hidden' },
  cardRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 14, paddingHorizontal: 16 },
  cardLabel: { fontSize: 15, color: theme.colors.textSecondary },
  cardValue: { fontSize: 15, color: theme.colors.text, fontWeight: '500' as const, textTransform: 'capitalize' as const },
  cardDivider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginLeft: 16 },
  statusTag: { backgroundColor: theme.colors.successMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTagText: { fontSize: 13, color: theme.colors.success, fontWeight: '600' as const },
  statusTagWarning: { backgroundColor: theme.colors.warningMuted },
  statusTagTextWarning: { color: theme.colors.warning },
});
