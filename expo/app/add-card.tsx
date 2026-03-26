import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Lock, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Nigeria',
  'Ghana',
  'South Africa',
  'Kenya',
  'Australia',
  'India',
  'Jamaica',
];

export default function AddCardScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const formatCardNumber = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  }, []);

  const handleCardNumberChange = useCallback(
    (text: string) => {
      setCardNumber(formatCardNumber(text));
    },
    [formatCardNumber]
  );

  const formatExpiry = useCallback((text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  }, []);

  const handleExpiryChange = useCallback(
    (text: string) => {
      setExpiry(formatExpiry(text));
    },
    [formatExpiry]
  );

  const isFormValid =
    cardNumber.replace(/\s/g, '').length >= 13 &&
    expiry.length >= 4 &&
    cvv.length >= 3 &&
    fullName.trim().length > 0 &&
    country.length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!isFormValid) return;
    setIsSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      console.log('[AddCard] Saving card:', {
        last_four: cardNumber.replace(/\s/g, '').slice(-4),
        expiry,
        name: fullName,
        country,
        city,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Card Added', 'Your payment method has been saved securely.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save payment method. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [isFormValid, cardNumber, expiry, fullName, country, city, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerLeft: undefined,
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Lock size={14} color={theme.colors.textSecondary} />
              <Text style={styles.headerTitleText}>Add card</Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={!isFormValid || isSaving}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text
                  style={[
                    styles.saveBtn,
                    (!isFormValid || isSaving) && styles.saveBtnDisabled,
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardFields}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="Card number"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="number-pad"
                maxLength={19}
                testID="card-number-input"
              />
            </View>
            <View style={styles.cardDivider} />

            <View style={styles.splitRow}>
              <View style={styles.splitLeft}>
                <TextInput
                  style={styles.inputFull}
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  placeholder="MM/YY"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={5}
                  testID="expiry-input"
                />
              </View>
              <View style={styles.splitDividerV} />
              <View style={styles.splitRight}>
                <TextInput
                  style={styles.inputFull}
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CVV"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  testID="cvv-input"
                />
              </View>
            </View>
          </View>

          <Text style={styles.securityNote}>
            Your payment method is securely saved for your next donation.
          </Text>

          <Text style={styles.billingTitle}>Billing address</Text>

          <View style={styles.billingFields}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                testID="name-input"
              />
            </View>
            <View style={styles.cardDivider} />

            <TouchableOpacity
              style={styles.countryRow}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
              activeOpacity={0.6}
            >
              <Text
                style={country ? styles.countryText : styles.countryPlaceholder}
              >
                {country || 'Country'}
              </Text>
              <ChevronRight size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>

            {showCountryPicker ? (
              <View style={styles.countryList}>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.countryOption,
                      country === c && styles.countryOptionSelected,
                    ]}
                    onPress={() => {
                      setCountry(c);
                      setShowCountryPicker(false);
                      void Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={[
                        styles.countryOptionText,
                        country === c && styles.countryOptionTextSelected,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.cardDivider} />
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={theme.colors.textTertiary}
                testID="address-input"
              />
            </View>
            <View style={styles.cardDivider} />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={address2}
                onChangeText={setAddress2}
                placeholder="Address line 2 (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                testID="address2-input"
              />
            </View>
            <View style={styles.cardDivider} />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={city}
                onChangeText={setCity}
                placeholder="Town/city"
                placeholderTextColor={theme.colors.textTertiary}
                testID="city-input"
              />
            </View>
            <View style={styles.cardDivider} />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={region}
                onChangeText={setRegion}
                placeholder="County/region"
                placeholderTextColor={theme.colors.textTertiary}
                testID="region-input"
              />
            </View>
            <View style={styles.cardDivider} />

            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFull}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Postal code"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="default"
                testID="postal-input"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  cardFields: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  inputRow: {
    paddingHorizontal: 16,
  },
  inputFull: {
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  splitRow: {
    flexDirection: 'row',
  },
  splitLeft: {
    flex: 1,
    paddingHorizontal: 16,
  },
  splitDividerV: {
    width: 1,
    backgroundColor: theme.colors.borderLight,
  },
  splitRight: {
    flex: 1,
    paddingHorizontal: 16,
  },
  securityNote: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 10,
    marginBottom: 28,
    lineHeight: 17,
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 12,
  },
  billingFields: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  countryText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  countryPlaceholder: {
    fontSize: 15,
    color: theme.colors.textTertiary,
  },
  countryList: {
    backgroundColor: theme.colors.surfaceElevated,
    marginHorizontal: 8,
    borderRadius: theme.radius.md,
    marginBottom: 4,
    overflow: 'hidden',
  },
  countryOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  countryOptionSelected: {
    backgroundColor: theme.colors.accentMuted,
  },
  countryOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  countryOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: '600' as const,
  },
});
