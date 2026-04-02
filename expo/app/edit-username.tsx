import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

export default function EditUsernameScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState(user?.username ?? '');

  const saveMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      await api.put('/members/me', { username: newUsername });
      return newUsername;
    },
    onSuccess: async (newUsername) => {
      await updateUser({ username: newUsername });
      console.log('[EditUsername] Username updated to:', newUsername);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update username');
    },
  });

  const handleSave = () => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    if (trimmed === user?.username) {
      router.back();
      return;
    }
    saveMutation.mutate(trimmed);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Username',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.headerBtn}
              disabled={saveMutation.isPending}
            >
              <Check size={24} color="#0095F6" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoFocus
            placeholder="Username"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            testID="username-input"
          />
          <View style={styles.inputDivider} />
        </View>

        <Text style={styles.helperText}>
          In most cases, you'll be able to change your username back for another 14 days.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#0095F6',
    marginTop: 2,
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 20,
  },
});

