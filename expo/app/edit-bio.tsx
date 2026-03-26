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

const MAX_BIO_LENGTH = 150;

export default function EditBioScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState(user?.bio ?? '');

  const remaining = MAX_BIO_LENGTH - bio.length;

  const saveMutation = useMutation({
    mutationFn: async (newBio: string) => {
      await api.put(`/members/${user?.id}`, { bio: newBio });
      return newBio;
    },
    onSuccess: async (newBio) => {
      await updateUser({ bio: newBio });
      console.log('[EditBio] Bio updated');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update bio');
    },
  });

  const handleSave = () => {
    const trimmed = bio.trim();
    if (trimmed === (user?.bio ?? '')) {
      router.back();
      return;
    }
    saveMutation.mutate(trimmed);
  };

  const handleTextChange = (text: string) => {
    if (text.length <= MAX_BIO_LENGTH) {
      setBio(text);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Bio',
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
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={styles.input}
            value={bio}
            onChangeText={handleTextChange}
            autoFocus
            placeholder="Bio"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={MAX_BIO_LENGTH}
            testID="bio-input"
          />
          <View style={styles.inputDivider} />
        </View>

        <View style={styles.counterRow}>
          <View style={styles.spacer} />
          <Text style={[styles.counterText, remaining < 20 && styles.counterWarning]}>
            {remaining}
          </Text>
        </View>
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
    marginBottom: 8,
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
    minHeight: 80,
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#0095F6',
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  counterText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  counterWarning: {
    color: theme.colors.warning,
  },
});
