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

export default function EditNameScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.full_name ?? '');

  const saveMutation = useMutation({
    mutationFn: async (newName: string) => {
      await api.put(`/members/${user?.id}`, { full_name: newName });
      return newName;
    },
    onSuccess: async (newName) => {
      await updateUser({ full_name: newName });
      console.log('[EditName] Name updated to:', newName);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update name');
    },
  });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (trimmed === user?.full_name) {
      router.back();
      return;
    }
    Alert.alert(
      `Are you sure that you want to change your name to ${trimmed}?`,
      'You can only change your name twice within 14 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change name',
          onPress: () => saveMutation.mutate(trimmed),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Name',
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
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="Name"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
            testID="name-input"
          />
          <View style={styles.inputDivider} />
        </View>

        <Text style={styles.helperText}>
          Help people discover your account by using the name that you're known by: either your full name, nickname or business name.
        </Text>
        <Text style={styles.helperText}>
          You can only change your name twice within 14 days.
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
    marginBottom: 12,
  },
});

