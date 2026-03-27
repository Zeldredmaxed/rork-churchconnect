import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
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
  SlidersHorizontal,
} from 'lucide-react-native';
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

function getColorForId(id: string, index: number): string {
  return ACCENT_COLORS[index % ACCENT_COLORS.length];
}

function QuickNavButton({ item, index, theme, onPress }: {
  item: QuickNavItem;
  index: number;
  theme: AppTheme;
  onPress: (route: string) => void;
}) {
  const styles = createStyles(theme);
  const IconComponent = ICON_MAP[item.icon];
  const accentColor = getColorForId(item.id, index);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onPress(item.route)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        testID={`quick-nav-${item.id}`}
      >
        <View style={[styles.navIconBox, { backgroundColor: `${accentColor}18` }]}>
          {IconComponent ? (
            <IconComponent size={22} color={accentColor} />
          ) : (
            <Sparkles size={22} color={accentColor} />
          )}
        </View>
        <Text style={styles.navLabel} numberOfLines={1}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function QuickNavTabs() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { activeItems } = useQuickNav();

  const handlePress = useCallback((route: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  }, [router]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeItems.map((item, index) => (
          <QuickNavButton
            key={item.id}
            item={item}
            index={index}
            theme={theme}
            onPress={handlePress}
          />
        ))}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/customize-tabs' as never);
          }}
          activeOpacity={0.7}
          testID="quick-nav-customize"
        >
          <View style={[styles.navIconBox, styles.customizeBox]}>
            <SlidersHorizontal size={20} color={theme.colors.textTertiary} />
          </View>
          <Text style={[styles.navLabel, styles.customizeLabel]}>Edit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    alignItems: 'center',
    width: 72,
  },
  navIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  customizeBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
  },
  customizeLabel: {
    color: theme.colors.textTertiary,
  },
});
