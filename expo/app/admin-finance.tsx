import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { DollarSign, Download, Plus, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { GivingTrend, Fund } from '@/types';

interface FinancialSummaryResponse {
  period: string;
  start_date: string;
  end_date: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
}

function BarChart({ data }: { data: GivingTrend[] }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  if (data.length === 0) return null;
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <View style={styles.chartContainer}>
      {data.map((item) => (
        <View key={item.month} style={styles.barItem}>
          <View style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                { height: `${Math.max((item.amount / maxAmount) * 100, 5)}%` },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{item.month}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminFinanceScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [fundName, setFundName] = useState('');
  const [fundDescription, setFundDescription] = useState('');
  const [fundType, setFundType] = useState<'general' | 'designated'>('general');
  const [isTaxDeductible, setIsTaxDeductible] = useState(true);
  const [goalAmount, setGoalAmount] = useState('');

  const trendsQuery = useQuery({
    queryKey: ['admin', 'giving-trends'],
    queryFn: async () => {
      const res = await api.get<unknown>('/reports/analytics/giving-trends');
      console.log('[AdminFinance] Giving trends raw:', JSON.stringify(res).slice(0, 500));
      const parsed = res as Record<string, unknown>;
      const dataObj = (parsed.data ?? res) as Record<string, unknown>;
      const monthlyTrends = dataObj.monthly_trends as Record<string, unknown>[] | undefined;
      if (Array.isArray(monthlyTrends)) {
        return monthlyTrends.map((t) => ({
          month: ((t.month as string) ?? '').slice(0, 3),
          amount: (t.total ?? t.amount ?? 0) as number,
          total: (t.total ?? 0) as number,
          tithes: (t.tithes ?? 0) as number,
          offerings: (t.offerings ?? 0) as number,
        })) as GivingTrend[];
      }
      if (Array.isArray(dataObj)) return dataObj as GivingTrend[];
      if (Array.isArray(parsed.data)) return parsed.data as GivingTrend[];
      return [] as GivingTrend[];
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['admin', 'financial-summary'],
    queryFn: () => api.get<{ data: FinancialSummaryResponse }>('/reports/financial-summary?period=month'),
  });

  const fundsQuery = useQuery({
    queryKey: ['admin', 'funds'],
    queryFn: () => api.get<{ data: Fund[] }>('/funds'),
  });

  const createFundMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('/funds', params),
    onSuccess: () => {
      console.log('[AdminFinance] Fund created successfully');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'funds'] });
      void queryClient.invalidateQueries({ queryKey: ['funds'] });
      resetFundForm();
      Alert.alert('Success', 'Fund created successfully.');
    },
    onError: (error) => {
      console.log('[AdminFinance] Create fund error:', error.message);
      Alert.alert('Error', error.message || 'Failed to create fund.');
    },
  });

  const resetFundForm = useCallback(() => {
    setShowCreateFund(false);
    setFundName('');
    setFundDescription('');
    setFundType('general');
    setIsTaxDeductible(true);
    setGoalAmount('');
  }, []);

  const handleCreateFund = useCallback(() => {
    if (!fundName.trim()) {
      Alert.alert('Required', 'Please enter a fund name.');
      return;
    }
    const goalNum = goalAmount ? parseFloat(goalAmount) : undefined;
    if (goalAmount && (isNaN(goalNum!) || goalNum! <= 0)) {
      Alert.alert('Invalid Amount', 'Please enter a valid goal amount.');
      return;
    }
    createFundMutation.mutate({
      name: fundName.trim(),
      description: fundDescription.trim() || undefined,
      fund_type: fundType,
      is_tax_deductible: isTaxDeductible,
      goal_amount: goalNum ?? undefined,
    });
  }, [fundName, fundDescription, fundType, isTaxDeductible, goalAmount, createFundMutation]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  }, [queryClient]);

  const trends = trendsQuery.data ?? [];
  const summary = summaryQuery.data?.data;
  const funds = fundsQuery.data?.data ?? [];
  const isLoading = trendsQuery.isLoading || summaryQuery.isLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Giving & Finance',
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
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Income</Text>
                <Text style={styles.summaryValue}>${(summary?.total_income ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Net Balance</Text>
                <Text style={styles.summaryValue}>${(summary?.net_balance ?? 0).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GIVING TRENDS</Text>
              <View style={styles.chartCard}>
                <BarChart data={trends.slice(-12)} />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.fundsSectionHeader}>
                <Text style={styles.sectionTitle}>FUNDS</Text>
                <TouchableOpacity
                  style={styles.addFundBtn}
                  onPress={() => setShowCreateFund(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={14} color={theme.colors.accent} />
                  <Text style={styles.addFundBtnText}>Create Fund</Text>
                </TouchableOpacity>
              </View>
              {funds.length === 0 && (
                <View style={styles.emptyFunds}>
                  <DollarSign size={24} color={theme.colors.textTertiary} />
                  <Text style={styles.emptyFundsText}>No funds created yet</Text>
                  <TouchableOpacity
                    style={styles.emptyFundsBtn}
                    onPress={() => setShowCreateFund(true)}
                  >
                    <Text style={styles.emptyFundsBtnText}>Create your first fund</Text>
                  </TouchableOpacity>
                </View>
              )}
              {funds.map((f) => (
                <View key={f.id} style={styles.fundRow}>
                  <View style={styles.fundIcon}>
                    <DollarSign size={16} color={theme.colors.success} />
                  </View>
                  <View style={styles.fundInfo}>
                    <Text style={styles.fundName}>{f.name}</Text>
                    {f.description && <Text style={styles.fundDesc}>{f.description}</Text>}
                  </View>
                  <View style={styles.fundAmounts}>
                    <Text style={styles.fundCurrent}>${(f.current_amount ?? 0).toLocaleString()}</Text>
                    {f.goal_amount && (
                      <Text style={styles.fundGoal}>of ${f.goal_amount.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EXPENSE SUMMARY</Text>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetFund}>Total Expenses</Text>
                  <View style={styles.budgetBar}>
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: summary.total_income > 0
                            ? `${Math.min((summary.total_expenses / summary.total_income) * 100, 100)}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.budgetText}>
                    ${summary.total_expenses.toLocaleString()} / ${summary.total_income.toLocaleString()} income
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showCreateFund} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetFundForm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Fund</Text>
              <TouchableOpacity
                onPress={handleCreateFund}
                disabled={!fundName.trim() || createFundMutation.isPending}
              >
                {createFundMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.modalSubmitText, !fundName.trim() && styles.modalSubmitDisabled]}>
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={fundName}
              onChangeText={setFundName}
              placeholder="Fund Name (e.g. Building Fund)"
              placeholderTextColor={theme.colors.textTertiary}
              autoFocus
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={fundDescription}
              onChangeText={setFundDescription}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalFieldLabel}>Fund Type</Text>
            <View style={styles.typeRow}>
              {(['general', 'designated'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, fundType === t && styles.typeChipActive]}
                  onPress={() => setFundType(t)}
                >
                  <Text style={[styles.typeChipText, fundType === t && styles.typeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.goalRow}>
              <Text style={styles.goalCurrency}>$</Text>
              <TextInput
                style={styles.goalInput}
                value={goalAmount}
                onChangeText={setGoalAmount}
                placeholder="Goal amount (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Tax Deductible</Text>
              <Switch
                value={isTaxDeductible}
                onValueChange={setIsTaxDeductible}
                trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }}
                thumbColor={isTaxDeductible ? theme.colors.accent : theme.colors.textTertiary}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: 16, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  summaryLabel: { fontSize: 12, color: theme.colors.textTertiary, fontWeight: '600' as const },
  summaryValue: { fontSize: 24, fontWeight: '700' as const, color: theme.colors.text, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600' as const, color: theme.colors.textTertiary,
    letterSpacing: 0.8, marginBottom: 10,
  },
  chartCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: 16, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 },
  barItem: { flex: 1, alignItems: 'center' },
  barWrapper: { height: 100, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', backgroundColor: theme.colors.accent, borderRadius: 3, minHeight: 4 },
  barLabel: { fontSize: 9, color: theme.colors.textTertiary, marginTop: 4 },
  fundRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md, padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  fundIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.successMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  fundInfo: { flex: 1 },
  fundName: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.text },
  fundDesc: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 1 },
  fundAmounts: { alignItems: 'flex-end' },
  fundCurrent: { fontSize: 15, fontWeight: '700' as const, color: theme.colors.success },
  fundGoal: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
  budgetRow: { marginBottom: 12 },
  budgetFund: { fontSize: 14, fontWeight: '500' as const, color: theme.colors.text, marginBottom: 6 },
  budgetBar: {
    height: 8, backgroundColor: theme.colors.surfaceElevated, borderRadius: 4, overflow: 'hidden',
    marginBottom: 4,
  },
  budgetFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: 4 },
  budgetText: { fontSize: 12, color: theme.colors.textTertiary },
  fundsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  addFundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  addFundBtnText: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.accent },
  emptyFunds: {
    alignItems: 'center', paddingVertical: 30, gap: 8,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  emptyFundsText: { fontSize: 14, color: theme.colors.textTertiary },
  emptyFundsBtn: {
    backgroundColor: theme.colors.accentMuted, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 4,
  },
  emptyFundsBtnText: { fontSize: 13, fontWeight: '600' as const, color: theme.colors.accent },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 12, gap: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderLight,
    alignSelf: 'center', marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.text },
  modalSubmitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.accent },
  modalSubmitDisabled: { opacity: 0.4 },
  modalInput: {
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text,
  },
  modalTextArea: { minHeight: 70, textAlignVertical: 'top' as const },
  modalFieldLabel: {
    fontSize: 13, fontWeight: '600' as const, color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 4,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
  },
  typeChipActive: { backgroundColor: theme.colors.accentMuted },
  typeChipText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' as const },
  typeChipTextActive: { color: theme.colors.accent, fontWeight: '600' as const },
  goalRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md, paddingHorizontal: 14,
  },
  goalCurrency: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.accent },
  goalInput: {
    flex: 1, fontSize: 18, fontWeight: '600' as const, color: theme.colors.text,
    paddingVertical: 12, paddingLeft: 8,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  switchLabel: { fontSize: 15, color: theme.colors.text, fontWeight: '500' as const },
});

