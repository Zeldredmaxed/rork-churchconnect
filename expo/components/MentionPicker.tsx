import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { Member } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

interface MentionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (members: Member[]) => void;
  selectedIds?: string[];
  multiSelect?: boolean;
}

interface MemberSearchResult {
  data?: Member[];
}

export default function MentionPicker({ visible, onClose, onSelect, selectedIds = [], multiSelect = true }: MentionPickerProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const searchInputRef = useRef<TextInput>(null);

  const membersQuery = useQuery({
    queryKey: ['members', 'mention-picker', search],
    queryFn: () =>
      api.get<MemberSearchResult | Member[]>(
        `/members?search=${encodeURIComponent(search)}&per_page=20`
      ),
    enabled: visible,
    staleTime: 30000,
  });

  const members: Member[] = (() => {
    const raw = membersQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if ((raw as MemberSearchResult).data) return (raw as MemberSearchResult).data ?? [];
    return [];
  })();

  useEffect(() => {
    if (visible) {
      setSelected(new Set(selectedIds));
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 65,
      }).start(() => {
        searchInputRef.current?.focus();
      });
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      setSearch('');
    }
  }, [visible, slideAnim, selectedIds]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_evt, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 9 }).start();
        }
      },
    })
  ).current;

  const toggleMember = useCallback((member: Member) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(member.id)) {
        next.delete(member.id);
      } else {
        if (!multiSelect) next.clear();
        next.add(member.id);
      }
      return next;
    });
  }, [multiSelect]);

  const handleAdd = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const selectedMembers = members.filter((m) => selected.has(m.id));
    onSelect(selectedMembers);
    handleClose();
  }, [members, selected, onSelect, handleClose]);

  const renderMember = useCallback(({ item }: { item: Member }) => {
    const isSelected = selected.has(item.id);
    const initials = item.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={pickerStyles.memberRow}
        onPress={() => toggleMember(item)}
        activeOpacity={0.6}
      >
        <View style={pickerStyles.memberAvatar}>
          <Text style={pickerStyles.memberAvatarText}>{initials}</Text>
        </View>
        <View style={pickerStyles.memberInfo}>
          <Text style={pickerStyles.memberName} numberOfLines={1}>{item.full_name}</Text>
          <Text style={pickerStyles.memberEmail} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[pickerStyles.checkbox, isSelected && pickerStyles.checkboxActive]}>
          {isSelected && <Check size={14} color={theme.colors.white} strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    );
  }, [selected, toggleMember]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={pickerStyles.backdrop}>
        <TouchableOpacity style={pickerStyles.backdropTouch} activeOpacity={1} onPress={handleClose} />
        <Animated.View
          style={[
            pickerStyles.sheet,
            { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={pickerStyles.handleBar}>
            <View style={pickerStyles.handle} />
          </View>

          <View style={pickerStyles.searchContainer}>
            <View style={pickerStyles.searchRow}>
              <Search size={18} color={theme.colors.textTertiary} />
              <TextInput
                ref={searchInputRef}
                style={pickerStyles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {membersQuery.isLoading ? (
            <View style={pickerStyles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          ) : members.length === 0 ? (
            <View style={pickerStyles.emptyContainer}>
              <Text style={pickerStyles.emptyText}>
                {search ? 'No members found' : 'Type to search members'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={renderMember}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={pickerStyles.listContent}
            />
          )}

          <View style={pickerStyles.footer}>
            <TouchableOpacity
              style={[pickerStyles.addBtn, selected.size === 0 && pickerStyles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={selected.size === 0}
              activeOpacity={0.7}
            >
              <Text style={[pickerStyles.addBtnText, selected.size === 0 && pickerStyles.addBtnTextDisabled]}>
                Add{selected.size > 0 ? ` (${selected.size})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SHEET_HEIGHT,
    minHeight: 320,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  listContent: {
    paddingHorizontal: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  memberEmail: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
  },
  addBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  addBtnTextDisabled: {
    color: theme.colors.textTertiary,
  },
});
