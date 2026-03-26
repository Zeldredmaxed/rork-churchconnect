import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Building2, User, Mail, Lock, Globe, KeyRound } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardScreen() {
  const router = useRouter();
  const { onboard, isOnboarding } = useAuth();
  const [churchName, setChurchName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationKey, setRegistrationKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sanitizeSubdomain = (text: string) => {
    return text.toLowerCase().replace(/[^a-z-]/g, '');
  };

  const handleOnboard = async () => {
    if (!churchName.trim() || !subdomain.trim() || !adminName.trim() || !email.trim() || !password.trim() || !registrationKey.trim()) {
      setError('Please fill in all fields');
      return;
    }
    const cleanSubdomain = sanitizeSubdomain(subdomain.trim());
    if (!cleanSubdomain) {
      setError('Church App ID must contain lowercase letters or dashes only');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    try {
      await onboard({
        church_name: churchName.trim(),
        church_subdomain: cleanSubdomain,
        admin_name: adminName.trim(),
        admin_email: email.trim(),
        admin_password: password,
        registration_key: registrationKey.trim(),
      });
      router.replace('/(tabs)/(home)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      Alert.alert('Registration Failed', msg);
    }
  };

  const allFilled = churchName && subdomain && adminName && email && password && registrationKey;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Register Your Church</Text>
            <Text style={styles.subtitle}>Set up your congregation in minutes</Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Church Name</Text>
              <View style={styles.inputWrapper}>
                <Building2 size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={churchName}
                  onChangeText={setChurchName}
                  placeholder="Grace Community Church"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Church App ID</Text>
              <View style={styles.inputWrapper}>
                <Globe size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={subdomain}
                  onChangeText={(text) => setSubdomain(text.toLowerCase().replace(/[^a-z-]/g, ''))}
                  placeholder="grace-church"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.hint}>Lowercase letters and dashes only (e.g. grace-church)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={adminName}
                  onChangeText={setAdminName}
                  placeholder="Pastor John Smith"
                  placeholderTextColor={theme.colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="pastor@gracechurch.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a strong password"
                  placeholderTextColor={theme.colors.textTertiary}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registration Key</Text>
              <View style={styles.inputWrapper}>
                <KeyRound size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={registrationKey}
                  onChangeText={setRegistrationKey}
                  placeholder="NG-ABC1-DEF2"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.hint}>Invite code provided by your SaaS platform owner</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !allFilled && styles.submitButtonDisabled]}
              onPress={handleOnboard}
              disabled={isOnboarding || !allFilled}
              activeOpacity={0.8}
            >
              {isOnboarding ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>Create Church Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  form: {
    gap: 18,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  footerText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: '600' as const,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
});
