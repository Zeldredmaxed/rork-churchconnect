import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import type { ActiveScripture } from '@/types';

interface ScriptureCardProps {
  scripture: ActiveScripture;
}

export default function ScriptureCard({ scripture }: ScriptureCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <BookOpen size={14} color={theme.colors.accent} />
        </View>
        <Text style={styles.headerText}>Today's Scripture</Text>
      </View>
      <Text style={styles.reference}>
        {scripture.book} {scripture.chapter}:{scripture.verses}
      </Text>
      <Text style={styles.text}>{scripture.text}</Text>
      {scripture.pastor_notes ? (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Pastor's Notes</Text>
          <Text style={styles.notesText}>{scripture.pastor_notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.accentMuted,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 165, 116, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  reference: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 24,
    fontStyle: 'italic' as const,
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 165, 116, 0.2)',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
