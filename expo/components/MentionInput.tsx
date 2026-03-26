import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  TextInputProps,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { Member } from '@/types';

interface MentionInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (text: string) => void;
  inputRef?: React.RefObject<TextInput>;
  containerStyle?: object;
  inputStyle?: object;
  suggestionsPosition?: 'above' | 'below';
  darkMode?: boolean;
}

interface MemberSearchResult {
  data?: Member[];
}

export default function MentionInput({
  value, onChangeText, inputRef: externalRef, containerStyle, inputStyle,
  suggestionsPosition = 'above', darkMode = false, ...textInputProps
}: MentionInputProps) {
  const { theme } = useTheme();
  const mentionStyles = createMentionStyles(theme);
  const suggestionStyles = createSuggestionStyles(theme);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const internalRef = useRef<TextInput>(null);
  const ref = externalRef || internalRef;

  const membersQuery = useQuery({
    queryKey: ['members', 'mention-search', mentionQuery],
    queryFn: () => api.get<MemberSearchResult | Member[]>(`/members?search=${encodeURIComponent(mentionQuery ?? '')}&per_page=8`),
    enabled: mentionQuery !== null && mentionQuery.length > 0,
    staleTime: 30000,
  });

  const members: Member[] = (() => {
    const raw = membersQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if ((raw as MemberSearchResult).data) return (raw as MemberSearchResult).data ?? [];
    return [];
  })();

  const showSuggestions = mentionQuery !== null && mentionQuery.length > 0;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: showSuggestions ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [showSuggestions, fadeAnim]);

  const handleTextChange = useCallback((text: string) => {
    onChangeText(text);
    const textBeforeCursor = text.slice(0, cursorPosition + (text.length - value.length));
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes('\n');
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValidTrigger = charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0;
      if (!hasSpace && isValidTrigger && textAfterAt.length <= 30) {
        setMentionQuery(textAfterAt); setMentionStartIndex(lastAtIndex); return;
      }
    }
    setMentionQuery(null); setMentionStartIndex(-1);
  }, [onChangeText, cursorPosition, value]);

  const handleSelectMember = useCallback((member: Member) => {
    if (mentionStartIndex < 0) return;
    const before = value.slice(0, mentionStartIndex);
    const mentionText = `@${member.full_name} `;
    const currentQueryEnd = mentionStartIndex + 1 + (mentionQuery?.length ?? 0);
    const after = value.slice(currentQueryEnd);
    onChangeText(before + mentionText + after);
    setMentionQuery(null); setMentionStartIndex(-1);
    console.log('[Mention] Selected:', member.full_name);
  }, [value, mentionStartIndex, mentionQuery, onChangeText]);

  const handleSelectionChange = useCallback((e: { nativeEvent: { selection: { start: number; end: number } } }) => {
    setCursorPosition(e.nativeEvent.selection.start);
  }, []);

  const renderMemberItem = useCallback(({ item }: { item: Member }) => {
    const initials = item.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return (
      <TouchableOpacity style={[suggestionStyles.memberRow, darkMode && suggestionStyles.memberRowDark]} onPress={() => handleSelectMember(item)} activeOpacity={0.6}>
        <View style={[suggestionStyles.memberAvatar, darkMode && suggestionStyles.memberAvatarDark]}>
          <Text style={[suggestionStyles.memberAvatarText, darkMode && suggestionStyles.memberAvatarTextDark]}>{initials}</Text>
        </View>
        <View style={suggestionStyles.memberInfo}>
          <Text style={[suggestionStyles.memberName, darkMode && suggestionStyles.memberNameDark]} numberOfLines={1}>{item.full_name}</Text>
          <Text style={suggestionStyles.memberEmail} numberOfLines={1}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleSelectMember, darkMode, suggestionStyles]);

  const suggestionsView = showSuggestions ? (
    <Animated.View style={[suggestionStyles.container, darkMode && suggestionStyles.containerDark, suggestionsPosition === 'above' ? suggestionStyles.above : suggestionStyles.below, { opacity: fadeAnim }]}>
      <View style={[suggestionStyles.header, darkMode && suggestionStyles.headerDark]}>
        <Search size={14} color={darkMode ? 'rgba(255,255,255,0.4)' : theme.colors.textTertiary} />
        <Text style={[suggestionStyles.headerText, darkMode && suggestionStyles.headerTextDark]}>Mention a member</Text>
        <TouchableOpacity onPress={() => { setMentionQuery(null); setMentionStartIndex(-1); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={14} color={darkMode ? 'rgba(255,255,255,0.4)' : theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>
      {membersQuery.isLoading ? (
        <View style={suggestionStyles.loadingContainer}><ActivityIndicator size="small" color={theme.colors.accent} /></View>
      ) : members.length === 0 ? (
        <View style={suggestionStyles.emptyContainer}><Text style={[suggestionStyles.emptyText, darkMode && suggestionStyles.emptyTextDark]}>No members found</Text></View>
      ) : (
        <FlatList data={members} keyExtractor={(item) => item.id} renderItem={renderMemberItem} keyboardShouldPersistTaps="always" style={suggestionStyles.list} showsVerticalScrollIndicator={false} />
      )}
    </Animated.View>
  ) : null;

  return (
    <View style={[mentionStyles.wrapper, containerStyle]}>
      {suggestionsPosition === 'above' && suggestionsView}
      <TextInput ref={ref as React.RefObject<TextInput>} style={[mentionStyles.input, inputStyle]} value={value} onChangeText={handleTextChange} onSelectionChange={handleSelectionChange} {...textInputProps} />
      {suggestionsPosition === 'below' && suggestionsView}
    </View>
  );
}

const createMentionStyles = (theme: AppTheme) => StyleSheet.create({
  wrapper: { position: 'relative' as const },
  input: { fontSize: 14, color: theme.colors.text },
});

const createSuggestionStyles = (theme: AppTheme) => StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, maxHeight: 220, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  containerDark: { backgroundColor: '#1E1E1E', borderColor: 'rgba(255,255,255,0.12)' },
  above: { marginBottom: 6 },
  below: { marginTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.borderLight, gap: 6 },
  headerDark: { borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerText: { flex: 1, fontSize: 12, color: theme.colors.textTertiary, fontWeight: '500' as const },
  headerTextDark: { color: 'rgba(255,255,255,0.4)' },
  loadingContainer: { paddingVertical: 20, alignItems: 'center' },
  emptyContainer: { paddingVertical: 16, alignItems: 'center' },
  emptyText: { fontSize: 13, color: theme.colors.textTertiary },
  emptyTextDark: { color: 'rgba(255,255,255,0.35)' },
  list: { maxHeight: 180 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  memberRowDark: { borderBottomColor: 'rgba(255,255,255,0.05)' },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  memberAvatarDark: { backgroundColor: 'rgba(212, 165, 116, 0.2)' },
  memberAvatarText: { fontSize: 12, fontWeight: '700' as const, color: theme.colors.accent },
  memberAvatarTextDark: { color: theme.colors.accentLight },
  memberInfo: { flex: 1, gap: 1 },
  memberName: { fontSize: 14, fontWeight: '600' as const, color: theme.colors.text },
  memberNameDark: { color: '#F0F0F0' },
  memberEmail: { fontSize: 12, color: theme.colors.textTertiary },
});
