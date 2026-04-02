import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Church,
  Check,
  X,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

const { width } = Dimensions.get('window');

const STEP_CHURCH = 0;
const STEP_EMAIL = 1;
const STEP_NAME = 2;
const STEP_PASSWORD = 3;
const STEP_TERMS = 4;
const TOTAL_STEPS = 5;

interface ChurchSearchResult {
  id: number | string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  is_active: boolean;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isRegistering } = useAuth();

  const [step, setStep] = useState(STEP_CHURCH);
  const [selectedChurch, setSelectedChurch] = useState<ChurchSearchResult | null>(null);
  const [churchQuery, setChurchQuery] = useState('');
  const [churches, setChurches] = useState<ChurchSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const emailRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const animateTransition = useCallback((direction: 'forward' | 'back', callback: () => void) => {
    const toValue = direction === 'forward' ? -width : width;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'forward' ? width * 0.3 : -width * 0.3);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [slideAnim, fadeAnim]);

  const goNext = useCallback(() => {
    setError(null);
    if (step < TOTAL_STEPS - 1) {
      animateTransition('forward', () => setStep(s => s + 1));
    }
  }, [step, animateTransition]);

  const goBack = useCallback(() => {
    setError(null);
    if (step > 0) {
      animateTransition('back', () => setStep(s => s - 1));
    } else {
      router.back();
    }
  }, [step, animateTransition, router]);

  const searchChurches = useCallback(async (query: string) => {
    if (query.length < 2) {
      setChurches([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.get<ChurchSearchResult[]>(`/churches/?search=${encodeURIComponent(query)}`, { noAuth: true });
      console.log('[Register] Church search results:', results?.length ?? 0);
      const activeChurches = (Array.isArray(results) ? results : []).filter(c => c.is_active !== false);
      setChurches(activeChurches);
      setShowDropdown(activeChurches.length > 0);
    } catch (e) {
      console.log('[Register] Church search error:', e);
      setChurches([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChurchQueryChange = useCallback((text: string) => {
    setChurchQuery(text);
    setSelectedChurch(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchChurches(text);
    }, 300);
  }, [searchChurches]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectChurch = useCallback((church: ChurchSearchResult) => {
    setSelectedChurch(church);
    setChurchQuery(church.name);
    setShowDropdown(false);
    setChurches([]);
    console.log('[Register] Selected church:', church.name, 'id:', church.id);
  }, []);

  const clearChurch = useCallback(() => {
    setSelectedChurch(null);
    setChurchQuery('');
    setChurches([]);
    setShowDropdown(false);
  }, []);

  const validateStep = useCallback((): boolean => {
    switch (step) {
      case STEP_CHURCH:
        if (!selectedChurch) {
          setError('Please search and select your church');
          return false;
        }
        return true;
      case STEP_EMAIL:
        if (!email.trim()) {
          setError('Please enter your email address');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;
      case STEP_NAME:
        if (!fullName.trim()) {
          setError('Please enter your full name');
          return false;
        }
        return true;
      case STEP_PASSWORD:
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        return true;
      default:
        return true;
    }
  }, [step, selectedChurch, email, fullName, password]);

  const handleNext = useCallback(() => {
    if (validateStep()) {
      goNext();
    }
  }, [validateStep, goNext]);

  const handleRegister = async () => {
    if (!selectedChurch) return;
    setError(null);
    try {
      await register({
        church_id: selectedChurch.id,
        email: email.trim(),
        password,
        full_name: fullName.trim(),
      });
      router.replace('/(tabs)/(home)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      Alert.alert('Registration Failed', msg);
    }
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case STEP_CHURCH: return !!selectedChurch;
      case STEP_EMAIL: return email.trim().length > 0;
      case STEP_NAME: return fullName.trim().length > 0;
      case STEP_PASSWORD: return password.length >= 6;
      case STEP_TERMS: return true;
      default: return false;
    }
  }, [step, selectedChurch, email, fullName, password]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderChurchItem = useCallback(({ item }: { item: ChurchSearchResult }) => (
    <TouchableOpacity
      style={styles.churchItem}
      onPress={() => selectChurch(item)}
      activeOpacity={0.7}
    >
      <View style={styles.churchItemIcon}>
        <Church size={16} color="#3B82F6" />
      </View>
      <View style={styles.churchItemInfo}>
        <Text style={styles.churchItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.churchItemSubdomain}>{item.subdomain}</Text>
      </View>
    </TouchableOpacity>
  ), [selectChurch]);

  const renderStepContent = () => {
    switch (step) {
      case STEP_CHURCH:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Find your church</Text>
            <Text style={styles.stepSubtitle}>
              Search for your church to join your congregation's community.
            </Text>

            <View style={[
              styles.inputContainer,
              selectedChurch && styles.inputContainerSuccess,
            ]}>
              <Text style={[
                styles.inputLabel,
                (churchQuery.length > 0 || selectedChurch) && styles.inputLabelActive,
              ]}>
                Church name
              </Text>
              {selectedChurch ? (
                <View style={styles.selectedRow}>
                  <Check size={18} color="#22C55E" style={styles.inputIconRight} />
                  <Text style={styles.selectedText} numberOfLines={1}>{selectedChurch.name}</Text>
                  <TouchableOpacity onPress={clearChurch} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <X size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    value={churchQuery}
                    onChangeText={handleChurchQueryChange}
                    placeholder=""
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    autoCorrect={false}
                    testID="register-church-search"
                  />
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : churchQuery.length >= 2 ? (
                    <TouchableOpacity onPress={() => { setChurchQuery(''); setChurches([]); setShowDropdown(false); }}>
                      <X size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>

            {showDropdown && churches.length > 0 && (
              <View style={styles.dropdown}>
                <FlatList
                  data={churches}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderChurchItem}
                  scrollEnabled={churches.length > 3}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  style={styles.dropdownList}
                />
              </View>
            )}

            {!selectedChurch && churchQuery.length >= 2 && !isSearching && churches.length === 0 && !showDropdown && (
              <Text style={styles.noResults}>No churches found. Try a different name.</Text>
            )}

            {selectedChurch && (
              <View style={styles.selectedBadge}>
                <Church size={14} color="#3B82F6" />
                <Text style={styles.selectedBadgeText}>{selectedChurch.name}</Text>
              </View>
            )}
          </View>
        );

      case STEP_EMAIL:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's your email address?</Text>
            <Text style={styles.stepSubtitle}>
              Enter the email address at which you can be contacted. No one will see this on your profile.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                email.length > 0 && styles.inputLabelActive,
              ]}>
                Email address
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={emailRef}
                  style={styles.textInput}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoFocus
                  testID="register-email"
                />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <X size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );

      case STEP_NAME:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's your name?</Text>
            <Text style={styles.stepSubtitle}>
              Add your name so church members can recognize you.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                fullName.length > 0 && styles.inputLabelActive,
              ]}>
                Full name
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={nameRef}
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); setError(null); }}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  autoComplete="name"
                  autoFocus
                  testID="register-name"
                />
                {fullName.length > 0 && (
                  <TouchableOpacity onPress={() => setFullName('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <X size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );

      case STEP_PASSWORD:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Create a password</Text>
            <Text style={styles.stepSubtitle}>
              Create a password with at least 6 letters or numbers. It should be something that others can't guess.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[
                styles.inputLabel,
                password.length > 0 && styles.inputLabelActive,
              ]}>
                Password
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  autoFocus
                  testID="register-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {showPassword ? (
                    <Eye size={20} color="#6B7280" />
                  ) : (
                    <EyeOff size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {password.length > 0 && password.length < 6 && (
              <Text style={styles.hint}>
                {6 - password.length} more character{6 - password.length !== 1 ? 's' : ''} needed
              </Text>
            )}
            {password.length >= 6 && (
              <View style={styles.successHint}>
                <Check size={14} color="#22C55E" />
                <Text style={styles.successHintText}>Password strength: Good</Text>
              </View>
            )}
          </View>
        );

      case STEP_TERMS:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Agree to terms and policies</Text>
            <Text style={styles.stepDescription}>
              By tapping <Text style={styles.boldText}>I agree</Text>, you agree to create an account and to the app's Terms of Service and Privacy Policy.
            </Text>
            <Text style={styles.stepDescription}>
              The Privacy Policy describes the ways we can use the information we collect when you create an account. We use this information to provide, personalize, and improve our service.
            </Text>

            <View style={styles.termsIconRow}>
              <Shield size={48} color="#3B82F6" strokeWidth={1.2} />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={['#E8F0FE', '#F0E6F6', '#E8F4F0', '#F0F6E8']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="register-back"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomActions}>
          {step < STEP_TERMS ? (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!canProceed}
              activeOpacity={0.8}
              testID="register-next"
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, isRegistering && styles.nextButtonDisabled]}
              onPress={handleRegister}
              disabled={isRegistering}
              activeOpacity={0.8}
              testID="register-agree"
            >
              {isRegistering ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>I agree</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    flex: 1,
    paddingRight: 40,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#111827',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  stepDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700' as const,
    color: '#111827',
  },
  termsIconRow: {
    alignItems: 'center',
    marginTop: 24,
    opacity: 0.7,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    marginTop: 8,
  },
  inputContainerSuccess: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  inputLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400' as const,
    marginBottom: 0,
  },
  inputLabelActive: {
    color: '#6B7280',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  selectedText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500' as const,
  },
  inputIconRight: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontWeight: '400' as const,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownList: {
    maxHeight: 220,
  },
  churchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  churchItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  churchItemInfo: {
    flex: 1,
  },
  churchItemName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#111827',
  },
  churchItemSubdomain: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  noResults: {
    fontSize: 14,
    color: '#F59E0B',
    paddingVertical: 4,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedBadgeText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500' as const,
  },
  hint: {
    fontSize: 13,
    color: '#F59E0B',
  },
  successHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successHintText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '500' as const,
  },
  bottomActions: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    gap: 16,
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600' as const,
  },
});

