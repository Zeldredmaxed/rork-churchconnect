import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Heart,
  Play,
  BookOpen,
  Sparkles,
  HandHeart,
  Calendar,
  Users,
  MessageCircle,
  Clapperboard,
  Bell,
  Bookmark,
  Settings,
  User,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useQuickNav, type QuickNavItem } from '@/contexts/QuickNavContext';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Heart,
  Play,
  BookOpen,
  Sparkles,
  HandHeart,
  Calendar,
  Users,
  MessageCircle,
  Clapperboard,
  Bell,
  Bookmark,
  Settings,
  User,
};

const ACCENT_COLORS = [
  '#E8956D',
  '#6DB5E8',
  '#A78BFA',
  '#F59E0B',
  '#34D399',
  '#F472B6',
  '#60A5FA',
  '#FB923C',
  '#8B5CF6',
  '#10B981',
  '#EC4899',
  '#3B82F6',
  '#14B8A6',
];

export default function CustomizeTabsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { activeIds, availableItems, saveIds, resetToDefaults } = useQuickNav();
  const [editIds, setEditIds] = useState<string[]>(activeIds);

  useEffect(() => {
    setEditIds(activeIds);
  }, [activeIds]);

  const activeEditItems = editIds
    .map((id) => availableItems.find((item) => item.id === id))
    .filter(Boolean) as QuickNavItem[];

  const inactiveItems = availableItems.filter((item) => !editIds.includes(item.id));

  const handleAdd = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditIds((prev) => [...prev, id]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditIds((prev) => prev.filter((i) => i !== id));
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (editIds.length === 0) {
      Alert.alert('Oops', 'You need at least one quick access tab.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveIds(editIds);
    router.back();
  }, [editIds, saveIds, router]);

  const handleReset = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Reset to Defaults?', 'This will restore the original quick access tabs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await resetToDefaults();
          router.back();
        },
      },
    ]);
  }, [resetToDefaults, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Customize Quick Access',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.headerSaveBtn}>
              <Check size={20} color={theme.colors.accent} />
              <Text style={styles.headerSaveText}>Save</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>YOUR QUICK ACCESS</Text>
        <Text style={styles.sectionDesc}>
          Drag to reorder or remove tabs you don't need.
        </Text>

        {activeEditItems.length === 0 ? (
          <View style={styles.emptyActive}>
            <Text style={styles.emptyActiveText}>No tabs selected. Add some below!</Text>
          </View>
        ) : (
          activeEditItems.map((item, index) => {
            const IconComponent = ICON_MAP[item.icon];
            const color = ACCENT_COLORS[index % ACCENT_COLORS.length];
            return (
              <View key={item.id} style={styles.activeRow}>
                <View style={[styles.activeIconBox, { backgroundColor: `${color}18` }]}>
                  {IconComponent && <IconComponent size={20} color={color} />}
                </View>
                <Text style={styles.activeLabel}>{item.label}</Text>
                <View style={styles.activeActions}>
                  <TouchableOpacity
                    onPress={() => handleMoveUp(index)}
                    style={styles.moveBtn}
                    disabled={index === 0}
                  >
                    <ChevronUp size={18} color={index === 0 ? theme.colors.borderLight : theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveDown(index)}
                    style={styles.moveBtn}
                    disabled={index === activeEditItems.length - 1}
                  >
                    <ChevronDown
                      size={18}
                      color={index === activeEditItems.length - 1 ? theme.colors.borderLight : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemove(item.id)}
                    style={styles.removeBtn}
                  >
                    <Minus size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>ALL AVAILABLE TABS</Text>
        <Text style={styles.sectionDesc}>
          Tap + to add any page to your quick access bar.
        </Text>

        {inactiveItems.map((item) => {
          const IconComponent = ICON_MAP[item.icon];
          return (
            <View key={item.id} style={styles.inactiveRow}>
              <View style={styles.inactiveIconBox}>
                {IconComponent && <IconComponent size={20} color={theme.colors.textSecondary} />}
              </View>
              <Text style={styles.inactiveLabel}>{item.label}</Text>
              <TouchableOpacity
                onPress={() => handleAdd(item.id)}
                style={styles.addBtn}
              >
                <Plus size={16} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
          );
        })}

        {inactiveItems.length === 0 && (
          <View style={styles.allAdded}>
            <Text style={styles.allAddedText}>All tabs are in your quick access!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <RotateCcw size={16} color={theme.colors.textTertiary} />
          <Text style={styles.resetText}>Reset to Defaults</Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 60,
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyActive: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyActiveText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
  },
  activeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  activeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moveBtn: {
    padding: 6,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 20,
  },
  inactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 12,
  },
  inactiveIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allAdded: {
    padding: 20,
    alignItems: 'center',
  },
  allAddedText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
  },
  resetText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontWeight: '500' as const,
  },
});
