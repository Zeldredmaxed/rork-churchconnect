import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  User,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  DollarSign,
  Bell,
  HelpCircle,
  BookOpen,
  CalendarDays,
  Church,
  CreditCard,
  Radio,
  Music,
  Disc,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}

function MenuItem({ icon, label, sublabel, onPress, destructive }: MenuItemProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIcon, destructive && styles.menuIconDestructive]}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      {!destructive && <ChevronRight size={18} color={theme.colors.textTertiary} />}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user, logout } = useAuth();
  const router = useRouter();



  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void logout();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <Text style={styles.headerTitle}>More</Text>,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.7}
          onPress={() => router.push('/profile' as never)}
        >
          <Avatar url={user?.avatar_url} name={user?.full_name ?? 'User'} size={48} style={{ marginRight: 16 }} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {(user?.role ?? 'member').charAt(0).toUpperCase() + (user?.role ?? 'member').slice(1)}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEATURES</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon={<BookOpen size={18} color={theme.colors.accent} />}
              label="Bible"
              sublabel="Read the King James Bible"
              onPress={() => router.push('/bible' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Radio size={18} color={theme.colors.accent} />}
              label="Gospel Radio"
              sublabel="Listen, discover & bless artists"
              onPress={() => router.push('/music' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<CalendarDays size={18} color={theme.colors.info} />}
              label="Events"
              sublabel="View upcoming church events"
              onPress={() => router.push('/(tabs)/events' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Users size={18} color={theme.colors.accent} />}
              label="Groups"
              sublabel="View and manage your groups"
              onPress={() => router.push('/groups' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<DollarSign size={18} color={theme.colors.success} />}
              label="Giving"
              sublabel="Tithes, offerings & donation history"
              onPress={() => router.push('/giving' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<MessageSquare size={18} color={theme.colors.info} />}
              label="Chat"
              sublabel="Messages with your church community"
              onPress={() => router.push('/chat' as never)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon={<User size={18} color={theme.colors.textSecondary} />}
              label="Edit Profile"
              onPress={() => router.push('/profile' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Bell size={18} color={theme.colors.textSecondary} />}
              label="Notifications"
              onPress={() => router.push('/notifications')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<CreditCard size={18} color={theme.colors.info} />}
              label="Orders & Payments"
              sublabel="Payment methods, giving activity"
              onPress={() => router.push('/orders-payments')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Radio size={18} color={theme.colors.accent} />}
              label="Gospel Radio"
              sublabel="Listen & support gospel artists"
              onPress={() => router.push('/music' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Music size={18} color={theme.colors.accent} />}
              label="Upload Music"
              sublabel="Share your songs as an artist"
              onPress={() => router.push('/upload-song' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Disc size={18} color={theme.colors.accent} />}
              label="My Music"
              sublabel="Manage your songs & earnings"
              onPress={() => router.push('/artist-dashboard' as never)}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Settings size={18} color={theme.colors.textSecondary} />}
              label="Settings"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon={<Church size={18} color={theme.colors.textSecondary} />}
              label="About This Church"
              onPress={() => console.log('About')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<HelpCircle size={18} color={theme.colors.textSecondary} />}
              label="Help & Contact"
              onPress={() => console.log('Help')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <MenuItem
              icon={<LogOut size={18} color={theme.colors.error} />}
              label="Sign Out"
              onPress={handleLogout}
              destructive
            />
          </View>
        </View>

        <View style={styles.versionRow}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fv408whgqhsmotq5f9m63' }}
            style={styles.versionLogo}
            resizeMode="contain"
          />
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDestructive: {
    backgroundColor: theme.colors.errorMuted,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  menuLabelDestructive: {
    color: theme.colors.error,
  },
  menuSublabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 60,
  },
  versionText: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  versionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 24,
    gap: 6,
  },
  versionLogo: {
    width: 80,
    height: 20,
  },
});

