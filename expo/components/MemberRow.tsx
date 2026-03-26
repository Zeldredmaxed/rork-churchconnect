import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import Badge from './Badge';
import type { Member } from '@/types';

interface MemberRowProps {
  member: Member;
  onPress: (member: Member) => void;
}

const statusVariant: Record<string, 'success' | 'warning' | 'info'> = {
  active: 'success',
  prospect: 'warning',
  visitor: 'info',
};

export default function MemberRow({ member, onPress }: MemberRowProps) {
  const initials = member.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(member)} activeOpacity={0.6}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{member.full_name}</Text>
        <Text style={styles.email} numberOfLines={1}>{member.email}</Text>
      </View>
      <Badge
        label={member.membership_status.charAt(0).toUpperCase() + member.membership_status.slice(1)}
        variant={statusVariant[member.membership_status] ?? 'info'}
        small
      />
      <ChevronRight size={16} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  email: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
});
