import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import {
  Heart,
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  MessageSquareText,
  X,
  ChevronDown,
  DollarSign,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api, extractArray } from '@/utils/api';
import type { Fund, Donation } from '@/types';

export default function GivingScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showFundPicker, setShowFundPicker] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringFund, setRecurringFund] = useState<Fund | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const fundsQuery = useQuery({
    queryKey: ['funds'],
    queryFn: async () => extractArray<Fund>(await api.get<unknown>('/funds')),
  });

  const historyQuery = useQuery({
    queryKey: ['donations', 'my'],
    queryFn: async () => extractArray<Donation>(await api.get<unknown>('/donations')),
  });

  interface RecurringDonation {
    id: number | string;
    fund_id: number | string;
    fund_name: string;
    amount: number;
    frequency: string;
    status: string;
    start_date?: string;
    next_date?: string;
  }

  const recurringQuery = useQuery({
    queryKey: ['donations', 'recurring'],
    queryFn: async () => {
      try {
        const raw = await api.get<{ data: RecurringDonation[] } | RecurringDonation[]>('/donations/recurring');
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: RecurringDonation[] }).data;
        return [] as RecurringDonation[];
      } catch {
        return [] as RecurringDonation[];
      }
    },
  });

  const recurringDonations = recurringQuery.data ?? [];

  const createRecurringMutation = useMutation({
    mutationFn: (params: { fund_id: string; amount: number; frequency: string }) =>
      api.post('/donations/recurring', params as unknown as Record<string, unknown>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['donations', 'recurring'] });
      setShowRecurringModal(false);
      setRecurringAmount('');
      setRecurringFund(null);
      Alert.alert('Recurring Donation Set', 'Your recurring donation has been scheduled.');
    },
    onError: (error) => Alert.alert('Error', error.message),
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

  const funds = fundsQuery.data ?? [];
  const donations = historyQuery.data ?? [];
  const recentDonations = donations.slice(0, 3);

  const activeFund = funds.length > 0 ? funds[0] : null;
  const goalAmount = activeFund?.goal_amount ?? 0;
  const currentAmount = activeFund?.current_amount ?? 0;
  const progress = goalAmount > 0 ? Math.min(currentAmount / goalAmount, 1) : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.stewardshipLabel}>STEWARDSHIP</Text>
            <Text style={styles.pageTitle}>Giving</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <DollarSign size={20} color={theme.colors.textTertiary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroDecoCircle} />
          <View style={styles.heroContent}>
            <View style={styles.heartIconWrap}>
              <Heart size={24} color={theme.colors.white} fill={theme.colors.white} />
            </View>
            <Text style={styles.heroTitle}>Support the Ministry</Text>
            <Text style={styles.heroDescription}>
              Your generous giving helps us continue to serve our community and spread the message of hope.
            </Text>
            <TouchableOpacity
              style={styles.giveSecurelyButton}
              onPress={() => setShowGiveModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.giveSecurelyText}>Give Securely</Text>
              <ArrowRight size={18} color={theme.colors.white} />
            </TouchableOpacity>
            <View style={styles.sslBadge}>
              <ShieldCheck size={16} color={theme.colors.success} />
              <Text style={styles.sslText}>SSL Encrypted Payment</Text>
            </View>
          </View>
        </View>

        {activeFund && goalAmount > 0 && (
          <View style={styles.campaignSection}>
            <View style={styles.campaignHeader}>
              <Text style={styles.sectionTitle}>Active Campaign</Text>
              <Text style={styles.campaignEndLabel}>Goal: ${goalAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.campaignCard}>
              <View style={styles.campaignTop}>
                <View style={styles.campaignIconWrap}>
                  <Building2 size={18} color={theme.colors.accent} />
                </View>
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignName}>{activeFund.name}</Text>
                  {activeFund.description ? (
                    <Text style={styles.campaignDesc}>{activeFund.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.donateChip}
                  onPress={() => {
                    setSelectedFund(activeFund);
                    setShowGiveModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.donateChipText}>Donate</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.progressSection}>
                <Text style={styles.progressAmount}>${currentAmount.toLocaleString()}</Text>
                <Text style={styles.progressGoal}>Goal: ${goalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.7} onPress={() => setShowRecurringModal(true)}>
            <View style={styles.quickActionIconWrap}>
              <RefreshCw size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.quickActionTitle}>Recurring</Text>
            <Text style={styles.quickActionSub}>Automate your tithe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.7}>
            <View style={styles.quickActionIconWrap}>
              <MessageSquareText size={20} color={theme.colors.accent} />
            </View>
            <Text style={styles.quickActionTitle}>Text to Give</Text>
            <Text style={styles.quickActionSub}>Quick & simple</Text>
          </TouchableOpacity>
        </View>

        {recurringDonations.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Active Recurring</Text>
            {recurringDonations.map((rd) => (
              <View key={rd.id} style={styles.donationRow}>
                <View style={styles.donationIcon}>
                  <RefreshCw size={16} color={theme.colors.accent} />
                </View>
                <View style={styles.donationInfo}>
                  <Text style={styles.donationFund}>{rd.fund_name}</Text>
                  <Text style={styles.donationDate}>{rd.frequency} · {rd.status}</Text>
                </View>
                <Text style={styles.donationAmount}>${rd.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Your History</Text>
            {donations.length > 3 && (
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {historyQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
          ) : recentDonations.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No recent donations found.</Text>
          ) : (
            recentDonations.map((d) => (
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
                </View>
                <Text style={styles.donationAmount}>${d.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.verseSection}>
          <Text style={styles.verseText}>
            "For where your treasure is,{'\n'}there your heart will be also."
          </Text>
          <Text style={styles.verseRef}>— Matthew 6:21</Text>
        </View>
      </ScrollView>

      <Modal visible={showGiveModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGiveModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

      <Modal visible={showRecurringModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowRecurringModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Recurring Giving</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!recurringFund || !recurringAmount) return;
                  const amountNum = parseFloat(recurringAmount);
                  if (isNaN(amountNum) || amountNum <= 0) {
                    Alert.alert('Invalid Amount', 'Please enter a valid amount.');
                    return;
                  }
                  createRecurringMutation.mutate({
                    fund_id: recurringFund.id,
                    amount: amountNum,
                    frequency: recurringFrequency,
                  });
                }}
                disabled={!recurringFund || !recurringAmount || createRecurringMutation.isPending}
              >
                {createRecurringMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text
                    style={[
                      styles.submitText,
                      (!recurringFund || !recurringAmount) && styles.submitTextDisabled,
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.fundSelector}
              onPress={() => {
                if (!recurringFund && funds.length > 0) {
                  setRecurringFund(funds[0]);
                }
              }}
            >
              <Text style={recurringFund ? styles.fundSelectedText : styles.fundPlaceholder}>
                {recurringFund ? recurringFund.name : 'Select a fund'}
              </Text>
              <ChevronDown size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.fundList}>
              {funds.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.fundItem, recurringFund?.id === f.id && { backgroundColor: theme.colors.accentMuted }]}
                  onPress={() => setRecurringFund(f)}
                >
                  <Text style={styles.fundItemText}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={recurringAmount}
                onChangeText={setRecurringAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={[styles.fundPlaceholder, { marginBottom: 8, marginLeft: 4 }]}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyChip,
                    recurringFrequency === freq && styles.frequencyChipActive,
                  ]}
                  onPress={() => setRecurringFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.frequencyChipText,
                      recurringFrequency === freq && styles.frequencyChipTextActive,
                    ]}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 50,
    },
    headerSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 20,
    },
    stewardshipLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1.5,
      color: theme.colors.accent,
      marginBottom: 4,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: theme.colors.text,
    },
    headerIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      marginBottom: 24,
      position: 'relative' as const,
    },
    heroDecoCircle: {
      position: 'absolute' as const,
      top: -30,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.colors.accentMuted,
    },
    heroContent: {
      padding: 24,
      alignItems: 'center',
    },
    heartIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center' as const,
    },
    heroDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center' as const,
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    giveSecurelyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.colors.text,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 40,
      width: '100%',
      marginBottom: 12,
    },
    giveSecurelyText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: theme.colors.textInverse,
    },
    sslBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sslText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    campaignSection: {
      marginBottom: 20,
    },
    campaignHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: theme.colors.text,
    },
    campaignEndLabel: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    campaignCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    campaignTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    campaignIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    campaignInfo: {
      flex: 1,
    },
    campaignName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.colors.text,
    },
    campaignDesc: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    donateChip: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    donateChipText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: theme.colors.accent,
    },
    progressSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressAmount: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: theme.colors.text,
    },
    progressGoal: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceElevated,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.colors.text,
    },
    quickActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    quickActionIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    quickActionTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.colors.text,
      marginBottom: 2,
    },
    quickActionSub: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    historySection: {
      marginBottom: 28,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: theme.colors.accent,
    },
    emptyHistoryText: {
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center' as const,
      marginTop: 12,
      marginBottom: 8,
    },
    donationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      gap: 12,
    },
    donationIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
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
      marginTop: 2,
    },
    donationAmount: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: theme.colors.success,
    },
    verseSection: {
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 10,
    },
    verseText: {
      fontSize: 15,
      fontStyle: 'italic' as const,
      color: theme.colors.textSecondary,
      textAlign: 'center' as const,
      lineHeight: 22,
    },
    verseRef: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 12,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.borderLight,
      alignSelf: 'center',
      marginBottom: 12,
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
      borderRadius: 12,
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
      borderRadius: 12,
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
      borderRadius: 12,
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
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
    },
    frequencyRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      marginBottom: 12,
    },
    frequencyChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    frequencyChipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    frequencyChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: theme.colors.textSecondary,
    },
    frequencyChipTextActive: {
      color: theme.colors.white,
      fontWeight: '600' as const,
    },
  });
