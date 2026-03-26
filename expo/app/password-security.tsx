import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight, KeyRound, Shield, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
interface SecurityRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function SecurityRow({ icon, label, onPress }: SecurityRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={16} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function PasswordSecurityScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Password and security',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login & recovery</Text>
          <Text style={styles.sectionDescription}>
            Manage your passwords, login preferences and recovery methods.
          </Text>
          <View style={styles.sectionCard}>
            <SecurityRow
              icon={<KeyRound size={20} color={theme.colors.textSecondary} />}
              label="Change password"
              onPress={() => router.push('/change-password')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security checks</Text>
          <Text style={styles.sectionDescription}>
            Review security issues by running checks across devices and sessions.
          </Text>
          <View style={styles.sectionCard}>
            <SecurityRow
              icon={<Smartphone size={20} color={theme.colors.textSecondary} />}
              label="Where you're logged in"
              onPress={() => console.log('Active sessions')}
            />
            <View style={styles.divider} />
            <SecurityRow
              icon={<Shield size={20} color={theme.colors.textSecondary} />}
              label="Security checkup"
              onPress={() => console.log('Security checkup')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 54,
  },
});
