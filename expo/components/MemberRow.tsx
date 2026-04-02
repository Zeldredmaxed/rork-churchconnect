import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import Badge from './Badge';
import Avatar from '@/components/Avatar';
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
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(member)} activeOpacity={0.6}>
      <Avatar url={member.photo_url} name={`${member.first_name} ${member.last_name}`} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{`${member.first_name} ${member.last_name}`}</Text>
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
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
