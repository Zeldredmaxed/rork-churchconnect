import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

interface MentionTextProps {
  children: string;
  style?: object;
  numberOfLines?: number;
  onMentionPress?: (name: string) => void;
}

interface TextPart {
  text: string;
  isMention: boolean;
}

function parseMentions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const mentionRegex = /@(\w[\w\s]*?\w|\w)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isMention: false });
    }
    parts.push({ text: match[0], isMention: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMention: false });
  }

  return parts;
}

export default function MentionText({ children, style, numberOfLines, onMentionPress }: MentionTextProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const parts = useMemo(() => parseMentions(children), [children]);

  if (parts.every((p) => !p.isMention)) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.isMention ? (
          <Text
            key={index}
            style={styles.mention}
            onPress={onMentionPress ? () => onMentionPress(part.text.slice(1)) : undefined}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        )
      )}
    </Text>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  mention: {
    color: theme.colors.accent,
    fontWeight: '600' as const,
  },
});
