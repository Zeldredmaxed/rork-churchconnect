import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { DollarSign, X, Receipt, ChevronDown } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import type { Fund, Donation } from '@/types';

export default function GivingScreen() {
  const queryClient = useQueryClient();
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showFundPicker, setShowFundPicker] = useState(false);

  const fundsQuery = useQuery({
    queryKey: ['funds'],
    queryFn: () => api.get<{ data: Fund[] }>('/funds'),
  });

  const historyQuery = useQuery({
    queryKey: ['donations', 'my'],
    queryFn: () => api.get<{ data: Donation[] }>('/donations/my'),
  });

  const donateMutation = useMutation({
    mutationFn: (params: { fund_id: string; amount: number; memo?: string }) =>
      api.post('/donations', params as unknown as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['donations'] });
      void queryClient.invalidateQueries({ queryKey: ['funds'] });
      setShowGiveModal(false);
      setAmount('');
      setMemo('');
      setSelectedFund(null);
      Alert.alert('Thank You', 'Your donation has been recorded.');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const funds = fundsQuery.data?.data ?? [];
  const donations = historyQuery.data?.data ?? [];

  const handleSubmitDonation = () => {
    if (!selectedFund || !amount) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    donateMutation.mutate({
      fund_id: selectedFund.id,
      amount: amountNum,
      memo: memo.trim() || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Giving',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.giveButton}
          onPress={() => setShowGiveModal(true)}
          activeOpacity={0.8}
        >
          <DollarSign size={20} color={theme.colors.background} />
          <Text style={styles.giveButtonText}>Give Now</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>GIVING HISTORY</Text>
        {historyQuery.isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
        ) : donations.length === 0 ? (
          <EmptyState
            icon={<Receipt size={28} color={theme.colors.textTertiary} />}
            title="No donations yet"
            description="Your giving history will appear here"
          />
        ) : (
          donations.map((d) => (
            <View key={d.id} style={styles.donationRow}>
              <View style={styles.donationIcon}>
                <DollarSign size={16} color={theme.colors.success} />
              </View>
              <View style={styles.donationInfo}>
                <Text style={styles.donationFund}>{d.fund_name}</Text>
                <Text style={styles.donationDate}>
                  {new Date(d.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                {d.memo ? <Text style={styles.donationMemo}>{d.memo}</Text> : null}
              </View>
              <Text style={styles.donationAmount}>${d.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showGiveModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGiveModal(false)}>
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Give</Text>
              <TouchableOpacity
                onPress={handleSubmitDonation}
                disabled={!selectedFund || !amount || donateMutation.isPending}
              >
                {donateMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text
                    style={[
                      styles.submitText,
                      (!selectedFund || !amount) && styles.submitTextDisabled,
                    ]}
                  >
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.fundSelector}
              onPress={() => setShowFundPicker(!showFundPicker)}
            >
              <Text style={selectedFund ? styles.fundSelectedText : styles.fundPlaceholder}>
                {selectedFund ? selectedFund.name : 'Select a fund'}
              </Text>
              <ChevronDown size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>

            {showFundPicker && (
              <View style={styles.fundList}>
                {funds.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.fundItem}
                    onPress={() => {
                      setSelectedFund(f);
                      setShowFundPicker(false);
                    }}
                  >
                    <Text style={styles.fundItemText}>{f.name}</Text>
                    {f.description ? (
                      <Text style={styles.fundItemDesc}>{f.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={setMemo}
              placeholder="Add a memo (optional)"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  giveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    marginBottom: 24,
  },
  giveButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  donationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
  },
  donationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donationInfo: {
    flex: 1,
  },
  donationFund: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  donationDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  donationMemo: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
  donationAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  submitTextDisabled: {
    opacity: 0.4,
  },
  fundSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
  },
  fundSelectedText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  fundPlaceholder: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  fundList: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    overflow: 'hidden',
  },
  fundItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  fundItemText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500' as const,
  },
  fundItemDesc: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.text,
    paddingVertical: 14,
    paddingLeft: 8,
  },
  memoInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
});
