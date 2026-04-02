import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Flag, ChevronDown } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

const CATEGORIES = [
  'Bug / Something isn\'t working',
  'Content issue',
  'Spam or scam',
  'Harassment or bullying',
  'Account issue',
  'Feature request',
  'Other',
];

export default function ReportProblemScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [description, setDescription] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => api.post('/support/reports', { category, description }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Report Submitted', 'Thank you for your feedback. We\'ll review it shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!category) {
      Alert.alert('Select a category', 'Please choose a category for your report.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add details', 'Please describe the problem you\'re experiencing.');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Report a problem',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <Flag size={28} color={theme.colors.accent} />
          </View>
          <Text style={s.heroTitle}>Report a problem</Text>
          <Text style={s.heroDesc}>
            Let us know about bugs, issues, or anything that doesn't seem right.
          </Text>
        </View>

        <Text style={s.label}>Category</Text>
        <TouchableOpacity
          style={s.dropdown}
          onPress={() => setShowCategories(!showCategories)}
          activeOpacity={0.7}
        >
          <Text style={[s.dropdownText, !category && s.dropdownPlaceholder]}>
            {category || 'Select a category'}
          </Text>
          <ChevronDown size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {showCategories && (
          <View style={s.categoriesList}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.categoryOption, category === cat && s.categoryOptionActive]}
                onPress={() => {
                  setCategory(cat);
                  setShowCategories(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.categoryOptionText, category === cat && s.categoryOptionTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.label}>Description</Text>
        <TextInput
          style={s.textArea}
          placeholder="Describe the problem in detail..."
          placeholderTextColor={theme.colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={s.charCount}>{description.length}/1000</Text>

        <TouchableOpacity
          style={[s.submitBtn, (!category || !description.trim()) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          activeOpacity={0.7}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={s.submitText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 32 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 6 },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, color: theme.colors.text, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  dropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, paddingHorizontal: 14, height: 46 },
  dropdownText: { flex: 1, fontSize: 15, color: theme.colors.text },
  dropdownPlaceholder: { color: theme.colors.textTertiary },
  categoriesList: { marginHorizontal: 16, marginTop: 4, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden' },
  categoryOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  categoryOptionActive: { backgroundColor: theme.colors.accentMuted },
  categoryOptionText: { fontSize: 14, color: theme.colors.text },
  categoryOptionTextActive: { color: theme.colors.accent, fontWeight: '600' as const },
  textArea: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: theme.colors.text, minHeight: 120 },
  charCount: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'right', paddingHorizontal: 16, marginTop: 4 },
  submitBtn: { backgroundColor: theme.colors.accent, borderRadius: 12, marginHorizontal: 16, marginTop: 24, height: 48, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.white },
});
