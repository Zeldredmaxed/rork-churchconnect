import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const newPasswordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;

  const changeMutation = useMutation({
    mutationFn: async () => {
      return api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    },
    onSuccess: () => {
      console.log('[ChangePassword] Password changed successfully');
      setSuccess(true);
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        router.back();
      }, 2000);
    },
    onError: (error) => {
      console.log('[ChangePassword] Error:', error.message);
      Alert.alert('Error', error.message || 'Failed to change password. Please check your current password and try again.');
    },
  });

  const isValid =
    currentPassword.length >= 6 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    changeMutation.mutate();
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Change password',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerShadowVisible: false,
          }}
        />
        <Animated.View style={[styles.successContainer, { opacity: successOpacity }]}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={56} color={theme.colors.success} />
          </View>
          <Text style={styles.successTitle}>Password changed</Text>
          <Text style={styles.successDescription}>
            Your password for {user?.email ?? 'your account'} has been updated successfully.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Change password',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.accountLabel}>
            {user?.full_name ?? 'Your Account'}
          </Text>
          <Text style={styles.headerTitle}>Change password</Text>
          <Text style={styles.headerDescription}>
            You'll be logged out of all sessions except this one to protect your
            account if anyone is trying to gain access.
          </Text>
          <Text style={styles.headerDescription}>
            Your password must be at least 6 characters and should include a
            combination of numbers, letters and special characters (!$@%).
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
                testID="current-password-input"
              />
              <TouchableOpacity
                onPress={() => setShowCurrent(!showCurrent)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showCurrent ? (
                  <Eye size={20} color={theme.colors.textTertiary} />
                ) : (
                  <EyeOff size={20} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={newPasswordRef}
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                testID="new-password-input"
              />
              <TouchableOpacity
                onPress={() => setShowNew(!showNew)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showNew ? (
                  <Eye size={20} color={theme.colors.textTertiary} />
                ) : (
                  <EyeOff size={20} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Retype new password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={isValid ? handleSubmit : undefined}
                testID="confirm-password-input"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirm ? (
                  <Eye size={20} color={theme.colors.textTertiary} />
                ) : (
                  <EyeOff size={20} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => Alert.alert('Forgot Password', 'A password reset link will be sent to your email address.')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotLink}>Forgotten your password?</Text>
          </TouchableOpacity>
        </View>

        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <Text style={styles.mismatchWarning}>Passwords do not match</Text>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.changeButton, !isValid && styles.changeButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || changeMutation.isPending}
          activeOpacity={0.8}
          testID="change-password-button"
        >
          {changeMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={[styles.changeButtonText, !isValid && styles.changeButtonTextDisabled]}>
              Change Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  accountLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 12,
  },
  headerDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  form: {
    paddingHorizontal: 20,
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  eyeButton: {
    padding: 4,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    marginTop: 4,
  },
  mismatchWarning: {
    fontSize: 13,
    color: theme.colors.error,
    marginTop: 8,
    marginLeft: 22,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  changeButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  changeButtonDisabled: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
  changeButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 40,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.successMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 10,
  },
  successDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});

