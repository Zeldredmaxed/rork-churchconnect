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
import { AlertTriangle, ChevronDown } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

const REPORT_TYPES = [
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Threats or violence',
  'Inappropriate content',
  'Spam or scam',
  'Impersonation',
  'Self-harm or suicide',
  'Other',
];

export default function ReportAbuseScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();
  const [reportType, setReportType] = useState('');
  const [showTypes, setShowTypes] = useState(false);
  const [description, setDescription] = useState('');
  const [username, setUsername] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => api.post('/support/abuse-reports', {
      reported_user_id: username ? username.replace('@', '') : null,
      reason: reportType,
      details: description,
      content_reference: null,
    }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Report Submitted', 'Thank you for reporting. Our team will review this and take appropriate action.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!reportType) {
      Alert.alert('Required', 'Please select a report type.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe what happened.');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Report something',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.heroSection}>
          <View style={s.iconCircle}>
            <AlertTriangle size={28} color={theme.colors.error} />
          </View>
          <Text style={s.heroTitle}>Report harassment or abuse</Text>
          <Text style={s.heroDesc}>
            Your safety is our priority. Reports are confidential and will be reviewed by our team.
          </Text>
        </View>

        <Text style={s.label}>Type of report</Text>
        <TouchableOpacity
          style={s.dropdown}
          onPress={() => setShowTypes(!showTypes)}
          activeOpacity={0.7}
        >
          <Text style={[s.dropdownText, !reportType && s.dropdownPlaceholder]}>
            {reportType || 'Select report type'}
          </Text>
          <ChevronDown size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {showTypes && (
          <View style={s.typesList}>
            {REPORT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.typeOption, reportType === t && s.typeOptionActive]}
                onPress={() => { setReportType(t); setShowTypes(false); }}
                activeOpacity={0.7}
              >
                <Text style={[s.typeOptionText, reportType === t && s.typeOptionTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.label}>Username of person (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="@username"
          placeholderTextColor={theme.colors.textTertiary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={s.label}>What happened?</Text>
        <TextInput
          style={s.textArea}
          placeholder="Please describe the situation in detail..."
          placeholderTextColor={theme.colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={s.charCount}>{description.length}/2000</Text>

        <TouchableOpacity
          style={[s.submitBtn, (!reportType || !description.trim()) && s.submitBtnDisabled]}
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

        <View style={s.safetyNote}>
          <Text style={s.safetyNoteText}>
            If someone is in immediate danger, please contact your local emergency services.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 32 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.errorMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '700' as const, color: theme.colors.text, marginBottom: 6, textAlign: 'center' },
  heroDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, color: theme.colors.text, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  dropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, paddingHorizontal: 14, height: 46 },
  dropdownText: { flex: 1, fontSize: 15, color: theme.colors.text },
  dropdownPlaceholder: { color: theme.colors.textTertiary },
  typesList: { marginHorizontal: 16, marginTop: 4, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden' },
  typeOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight },
  typeOptionActive: { backgroundColor: theme.colors.errorMuted },
  typeOptionText: { fontSize: 14, color: theme.colors.text },
  typeOptionTextActive: { color: theme.colors.error, fontWeight: '600' as const },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, paddingHorizontal: 14, height: 46, fontSize: 15, color: theme.colors.text },
  textArea: { backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: theme.colors.text, minHeight: 120 },
  charCount: { fontSize: 12, color: theme.colors.textTertiary, textAlign: 'right', paddingHorizontal: 16, marginTop: 4 },
  submitBtn: { backgroundColor: theme.colors.error, borderRadius: 12, marginHorizontal: 16, marginTop: 24, height: 48, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.white },
  safetyNote: { marginHorizontal: 16, marginTop: 16, backgroundColor: theme.colors.warningMuted, borderRadius: 10, padding: 12 },
  safetyNoteText: { fontSize: 13, color: theme.colors.warning, textAlign: 'center', lineHeight: 18 },
});
