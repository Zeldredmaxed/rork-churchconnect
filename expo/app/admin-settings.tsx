import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Settings } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

interface ChurchAbout {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_url?: string;
  service_times?: string;
  social_links?: Record<string, string>;
}

export default function AdminSettingsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [churchName, setChurchName] = useState('');
  const [churchAddress, setChurchAddress] = useState('');
  const [churchPhone, setChurchPhone] = useState('');
  const [churchEmail, setChurchEmail] = useState('');
  const [churchWebsite, setChurchWebsite] = useState('');
  const [churchDescription, setChurchDescription] = useState('');
  const [shortsEnabled, setShortsEnabled] = useState(true);
  const [prayerWallEnabled, setPrayerWallEnabled] = useState(true);
  const [givingEnabled, setGivingEnabled] = useState(true);

  const aboutQuery = useQuery({
    queryKey: ['church-about'],
    queryFn: () => api.get<{ data: ChurchAbout }>('/churches/about'),
  });

  useEffect(() => {
    if (aboutQuery.data?.data) {
      const church = aboutQuery.data.data;
      setChurchName(church.name ?? '');
      setChurchAddress(church.address ?? '');
      setChurchPhone(church.phone ?? '');
      setChurchEmail(church.email ?? '');
      setChurchWebsite(church.website ?? '');
      setChurchDescription(church.description ?? '');
      console.log('[AdminSettings] Loaded church data:', church.name);
    }
  }, [aboutQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.put('/churches/settings', params),
    onSuccess: () => Alert.alert('Success', 'Settings saved.'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: churchName.trim() || undefined,
      description: churchDescription.trim() || undefined,
      address: churchAddress.trim() || undefined,
      phone: churchPhone.trim() || undefined,
      email: churchEmail.trim() || undefined,
      website: churchWebsite.trim() || undefined,
      features_enabled: {
        shorts: shortsEnabled,
        prayer_wall: prayerWallEnabled,
        giving: givingEnabled,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Church Settings' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <Settings size={28} color={theme.colors.accent} />
        </View>

        {aboutQuery.isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHURCH PROFILE</Text>
            <TextInput style={styles.input} value={churchName} onChangeText={setChurchName} placeholder="Church Name" placeholderTextColor={theme.colors.textTertiary} />
            <TextInput style={styles.input} value={churchDescription} onChangeText={setChurchDescription} placeholder="Description" placeholderTextColor={theme.colors.textTertiary} multiline />
            <TextInput style={styles.input} value={churchAddress} onChangeText={setChurchAddress} placeholder="Address" placeholderTextColor={theme.colors.textTertiary} />
            <TextInput style={styles.input} value={churchPhone} onChangeText={setChurchPhone} placeholder="Phone" placeholderTextColor={theme.colors.textTertiary} keyboardType="phone-pad" />
            <TextInput style={styles.input} value={churchEmail} onChangeText={setChurchEmail} placeholder="Email" placeholderTextColor={theme.colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} value={churchWebsite} onChangeText={setChurchWebsite} placeholder="Website" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEATURE TOGGLES</Text>
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Shorts</Text>
              <Switch value={shortsEnabled} onValueChange={setShortsEnabled} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }} thumbColor={shortsEnabled ? theme.colors.accent : theme.colors.textTertiary} />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Prayer Wall</Text>
              <Switch value={prayerWallEnabled} onValueChange={setPrayerWallEnabled} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }} thumbColor={prayerWallEnabled ? theme.colors.accent : theme.colors.textTertiary} />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Giving</Text>
              <Switch value={givingEnabled} onValueChange={setGivingEnabled} trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }} thumbColor={givingEnabled ? theme.colors.accent : theme.colors.textTertiary} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saveMutation.isPending} activeOpacity={0.8}>
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <>
              <Save size={18} color={theme.colors.background} />
              <Text style={styles.saveText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  iconContainer: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: theme.colors.accentMuted,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 16,
  },
  section: { marginBottom: 24, gap: 10 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600' as const, color: theme.colors.textTertiary,
    letterSpacing: 0.8, marginBottom: 2,
  },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1,
    borderColor: theme.colors.borderLight, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: theme.colors.text,
  },
  toggleCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  toggleLabel: { fontSize: 15, color: theme.colors.text },
  toggleDivider: { height: 1, backgroundColor: theme.colors.borderLight },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingVertical: 16,
  },
  saveText: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.background },
});
