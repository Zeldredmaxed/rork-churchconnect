import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  small?: boolean;
}

export default function Badge({ label, variant = 'default', small = false }: BadgeProps) {
  const { theme } = useTheme();

  const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: theme.colors.surfaceElevated, text: theme.colors.textSecondary },
    success: { bg: theme.colors.successMuted, text: theme.colors.success },
    error: { bg: theme.colors.errorMuted, text: theme.colors.error },
    warning: { bg: theme.colors.warningMuted, text: theme.colors.warning },
    info: { bg: theme.colors.infoMuted, text: theme.colors.info },
    accent: { bg: theme.colors.accentMuted, text: theme.colors.accent },
  };

  const colors = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, small && styles.badgeSmall]}>
      <Text style={[styles.text, { color: colors.text }, small && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  textSmall: {
    fontSize: 10,
  },
});
