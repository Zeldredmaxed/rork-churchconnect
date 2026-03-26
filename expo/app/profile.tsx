import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Phone, Save } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [pushLikes, setPushLikes] = useState(true);
  const [pushComments, setPushComments] = useState(true);
  const [pushEvents, setPushEvents] = useState(true);
  const [pushPrayers, setPushPrayers] = useState(true);

  const updateMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.put(`/members/${user?.id}`, params),
    onSuccess: () => Alert.alert('Success', 'Profile updated successfully'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  };

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.roleBadge}>
            {(user?.role ?? 'member').charAt(0).toUpperCase() + (user?.role ?? 'member').slice(1)}
          </Text>
          {user?.created_at && (
            <Text style={styles.joinDate}>
              Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>PERSONAL INFO</Text>
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <User size={16} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Mail size={16} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}>
              <Phone size={16} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>NOTIFICATION PREFERENCES</Text>
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Likes</Text>
              <Switch
                value={pushLikes}
                onValueChange={setPushLikes}
                trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }}
                thumbColor={pushLikes ? theme.colors.accent : theme.colors.textTertiary}
              />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Comments</Text>
              <Switch
                value={pushComments}
                onValueChange={setPushComments}
                trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }}
                thumbColor={pushComments ? theme.colors.accent : theme.colors.textTertiary}
              />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Events</Text>
              <Switch
                value={pushEvents}
                onValueChange={setPushEvents}
                trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }}
                thumbColor={pushEvents ? theme.colors.accent : theme.colors.textTertiary}
              />
            </View>
            <View style={styles.toggleDivider} />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Prayers</Text>
              <Switch
                value={pushPrayers}
                onValueChange={setPushPrayers}
                trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }}
                thumbColor={pushPrayers ? theme.colors.accent : theme.colors.textTertiary}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={updateMutation.isPending}
          activeOpacity={0.8}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <>
              <Save size={18} color={theme.colors.background} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  roleBadge: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  joinDate: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
  formSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  toggleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  toggleLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.background,
  },
});
