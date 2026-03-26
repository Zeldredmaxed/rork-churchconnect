import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

const PRONOUN_OPTIONS = [
  'He/Him',
  'She/Her',
  'They/Them',
  'He/They',
  'She/They',
  'Prefer not to say',
];

export default function EditPronounsScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState(user?.pronouns ?? '');

  const saveMutation = useMutation({
    mutationFn: async (newPronouns: string) => {
      await api.put(`/members/${user?.id}`, { pronouns: newPronouns });
      return newPronouns;
    },
    onSuccess: async (newPronouns) => {
      await updateUser({ pronouns: newPronouns });
      console.log('[EditPronouns] Pronouns updated to:', newPronouns);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update pronouns');
    },
  });

  const handleSave = () => {
    if (selected === (user?.pronouns ?? '')) {
      router.back();
      return;
    }
    saveMutation.mutate(selected);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Pronouns',
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

      <View style={styles.content}>
        <Text style={styles.helperText}>
          This will be visible only to people who can see your profile.
        </Text>

        {PRONOUN_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.optionRow}
            onPress={() => {
              void Haptics.selectionAsync();
              setSelected(option);
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.optionText}>{option}</Text>
            <View style={[styles.radio, selected === option && styles.radioSelected]}>
              {selected === option && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  helperText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    lineHeight: 20,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#0095F6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0095F6',
  },
});
