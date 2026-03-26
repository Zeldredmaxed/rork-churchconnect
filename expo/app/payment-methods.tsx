import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Trash2,
  Star,
  Landmark,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { PaymentMethod } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PaymentMethodsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const methodsQuery = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api.get<{ data: PaymentMethod[] }>('/payment-methods'),
  });

  const methods = methodsQuery.data?.data ?? [];

  const openSheet = useCallback(() => {
    setShowSheet(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSheet(false));
  }, [slideAnim, overlayAnim]);

  const handleSelectCard = useCallback(() => {
    closeSheet();
    setTimeout(() => {
      router.push('/add-card');
    }, 300);
  }, [closeSheet, router]);

  const handleSelectPayPal = useCallback(() => {
    closeSheet();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    console.log('PayPal flow not yet implemented');
  }, [closeSheet]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payment-methods/${id}`),
    onSuccess: () => {
      console.log('[PaymentMethods] Deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error) => {
      console.log('[PaymentMethods] Delete error:', error.message);
      Alert.alert('Error', 'Failed to delete payment method.');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.put(`/payment-methods/${id}/default`),
    onSuccess: () => {
      console.log('[PaymentMethods] Set default successfully');
      void queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error) => {
      console.log('[PaymentMethods] Set default error:', error.message);
      Alert.alert('Error', 'Failed to set default payment method.');
    },
  });

  const handleDeleteMethod = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Card', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }, [deleteMutation]);

  const handleSetDefault = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDefaultMutation.mutate(id);
  }, [setDefaultMutation]);

  const getCardIcon = (_brand?: string) => {
    return <CreditCard size={20} color={theme.colors.textSecondary} />;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Payment methods',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={methodsQuery.isRefetching}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['payment-methods'] })}
            tintColor={theme.colors.accent}
          />
        }
      >
        <Text style={styles.sectionTitle}>Payment methods</Text>

        {methodsQuery.isLoading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : methods.length > 0 ? (
          <View style={styles.methodsList}>
            {methods.map((method) => (
              <View key={method.id} style={styles.methodCard}>
                <View style={styles.methodLeft}>
                  <View style={styles.methodIconWrap}>
                    {getCardIcon(method.card_brand)}
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodLabel}>
                      {method.card_brand ?? 'Card'} ending in {method.last_four}
                    </Text>
                    <Text style={styles.methodExpiry}>
                      Expires {String(method.exp_month).padStart(2, '0')}/{method.exp_year}
                    </Text>
                    {method.is_default ? (
                      <View style={styles.defaultBadge}>
                        <Star size={10} color={theme.colors.accent} />
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.methodActions}>
                  {!method.is_default ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleSetDefault(method.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Star size={16} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteMethod(method.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity onPress={openSheet} activeOpacity={0.6}>
          <Text style={styles.addLink}>Add payment method</Text>
        </TouchableOpacity>
      </ScrollView>

      {showSheet ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[styles.overlay, { opacity: overlayAnim }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add payment method</Text>
            <View style={styles.sheetDivider} />

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleSelectCard}
              activeOpacity={0.6}
            >
              <View style={styles.sheetOptionIcon}>
                <CreditCard size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.sheetOptionLabel}>Credit or debit card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleSelectPayPal}
              activeOpacity={0.6}
            >
              <View style={styles.sheetOptionIcon}>
                <Landmark size={20} color={theme.colors.info} />
              </View>
              <Text style={styles.sheetOptionLabel}>Bank account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 12,
  },
  methodsList: {
    gap: 10,
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: 14,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  methodIconWrap: {
    width: 40,
    height: 28,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  methodExpiry: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  addLink: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.info,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textTertiary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  sheetOptionIcon: {
    width: 40,
    height: 28,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionLabel: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: theme.colors.text,
  },
});
