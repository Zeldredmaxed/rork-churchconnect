import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Search, PlusSquare, Clapperboard, LayoutDashboard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import CreateShortSheet from '@/components/CreateShortSheet';

function CreateSheet({ visible, onClose, onCreateShort }: { visible: boolean; onClose: () => void; onCreateShort: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  const handleOption = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as never);
    }, 200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Create</Text>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => handleOption('/create-post')}
            activeOpacity={0.6}
          >
            <View style={styles.sheetOptionIcon}>
              <PlusSquare size={22} color={theme.colors.text} />
            </View>
            <Text style={styles.sheetOptionLabel}>Post</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => {
              onClose();
              setTimeout(() => onCreateShort(), 200);
            }}
            activeOpacity={0.6}
          >
            <View style={styles.sheetOptionIcon}>
              <Clapperboard size={22} color={theme.colors.text} />
            </View>
            <Text style={styles.sheetOptionLabel}>Glory Clip</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateShort, setShowCreateShort] = useState(false);

  const handleCreatePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreate(true);
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.text,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopColor: theme.colors.tabBarBorder,
            borderTopWidth: 0.5,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            tabBarIcon: ({ size }) => (
              <View style={styles.createIconWrap}>
                <PlusSquare size={size + 2} color={theme.colors.text} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleCreatePress();
            },
          }}
        />
        <Tabs.Screen
          name="shorts"
          options={{
            tabBarIcon: ({ color, size }) => <Clapperboard size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={[styles.profileTabIcon, focused && styles.profileTabIconActive]}>
                <View style={styles.profileTabAvatar}>
                  <Text style={styles.profileTabAvatarText}>U</Text>
                </View>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
            href: isAdmin ? undefined : null,
            tabBarShowLabel: false,
          }}
        />
        <Tabs.Screen name="events" options={{ href: null }} />
        <Tabs.Screen name="sermons" options={{ href: null }} />
        <Tabs.Screen name="prayers" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </Tabs>
      <CreateSheet visible={showCreate} onClose={() => setShowCreate(false)} onCreateShort={() => setShowCreateShort(true)} />
      <CreateShortSheet visible={showCreateShort} onClose={() => setShowCreateShort(false)} />
    </>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  createIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabIconActive: {
    borderWidth: 1.5,
    borderColor: theme.colors.text,
  },
  profileTabAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabAvatarText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
});

