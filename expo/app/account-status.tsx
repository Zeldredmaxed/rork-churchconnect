import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function AccountStatusScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const { user } = useAuth();

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
        <View style={s.heroSection}>
          <View style={s.statusBadge}>
            <CheckCircle size={48} color={theme.colors.success} />
          </View>
          <Text style={s.heroTitle}>Your account is in good standing</Text>
          <Text style={s.heroDesc}>
            There are no issues with your account.
          </Text>
        </View>

        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Account</Text>
            <Text style={s.cardValue}>{user?.full_name || 'User'}</Text>
          </View>
          <View style={s.cardDivider} />
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Status</Text>
            <View style={s.statusTag}>
              <Text style={s.statusTagText}>Active</Text>
            </View>
          </View>
          <View style={s.cardDivider} />
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Role</Text>
            <Text style={s.cardValue}>{user?.role || 'Member'}</Text>
          </View>
          <View style={s.cardDivider} />
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Membership</Text>
            <Text style={s.cardValue}>{user?.membership_status || 'Active'}</Text>
          </View>
          <View style={s.cardDivider} />
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Joined</Text>
            <Text style={s.cardValue}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</Text>
          </View>
        </View>
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
