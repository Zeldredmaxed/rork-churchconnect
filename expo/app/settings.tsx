import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ChevronRight,
  CreditCard,
  Bell,
  Shield,
  CircleUser,
  Download,
  Smartphone,
  HelpCircle,
  Bookmark,
  Clock,
  Activity,
  Lock,
  Star,
  BellOff,
  MessageCircle,
  AtSign,
  MessageSquare,
  Share2,
  UserX,
  AlertCircle,
  Type,
  UserPlus,
  Heart,
  Eye,
  Accessibility,
  Languages,
  BarChart3,
  MonitorSmartphone,
  Church,
  Info,
  LogOut,
  Search,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  rightValue?: string;
  destructive?: boolean;
}

function SettingsRow({ icon, label, sublabel, onPress, rightValue, destructive }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        {rightValue ? <Text style={styles.rowRightValue}>{rightValue}</Text> : null}
        {!destructive && <ChevronRight size={16} color={theme.colors.textTertiary} />}
      </View>
    </TouchableOpacity>
  );
}

function SectionDivider({ height }: { height?: number }) {
  return <View style={[styles.sectionDivider, height ? { height } : undefined]} />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleNav = (route: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  };

  const handleLeaveChurch = () => {
    Alert.alert(
      'Leave Church',
      'Are you sure you want to leave this church? You can join another church afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await (await import('@/utils/api')).api.post('/auth/leave-church');
              router.replace('/welcome');
            } catch {
              Alert.alert('Error', 'Failed to leave church.');
            }
          },
        },
      ]
    );
  };

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
          title: 'Settings and activity',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color={theme.colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor={theme.colors.textTertiary}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Your account</Text>
          <SettingsRow
            icon={<CircleUser size={20} color={theme.colors.textSecondary} />}
            label="Accounts Centre"
            sublabel="Password, security, personal details"
            onPress={() => handleNav('/password-security')}
          />
          <Text style={styles.sectionDescription}>
            Manage your account settings and church membership.
          </Text>
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>How you use </Text>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fv408whgqhsmotq5f9m63' }}
              style={styles.sectionLogoInline}
              resizeMode="contain"
            />
          </View>
          <SettingsRow
            icon={<Bookmark size={20} color={theme.colors.textSecondary} />}
            label="Saved"
            onPress={() => handleNav('/saved-posts')}
          />
          <SettingsRow
            icon={<Clock size={20} color={theme.colors.textSecondary} />}
            label="Archive"
            onPress={() => console.log('[Settings] Archive')}
          />
          <SettingsRow
            icon={<Activity size={20} color={theme.colors.textSecondary} />}
            label="Your activity"
            onPress={() => console.log('[Settings] Activity')}
          />
          <SettingsRow
            icon={<Bell size={20} color={theme.colors.textSecondary} />}
            label="Notifications"
            onPress={() => handleNav('/notifications')}
          />
          <SettingsRow
            icon={<Clock size={20} color={theme.colors.textSecondary} />}
            label="Time spent"
            onPress={() => console.log('[Settings] Time spent')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Who can see your content</Text>
          <SettingsRow
            icon={<Lock size={20} color={theme.colors.textSecondary} />}
            label="Account privacy"
            onPress={() => console.log('[Settings] Privacy')}
          />
          <SettingsRow
            icon={<Star size={20} color={theme.colors.textSecondary} />}
            label="Close friends"
            rightValue="0"
            onPress={() => console.log('[Settings] Close friends')}
          />
          <SettingsRow
            icon={<UserX size={20} color={theme.colors.textSecondary} />}
            label="Blocked"
            rightValue="0"
            onPress={() => console.log('[Settings] Blocked')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>How others can interact with you</Text>
          <SettingsRow
            icon={<MessageCircle size={20} color={theme.colors.textSecondary} />}
            label="Messages"
            onPress={() => handleNav('/chat')}
          />
          <SettingsRow
            icon={<AtSign size={20} color={theme.colors.textSecondary} />}
            label="Tags and mentions"
            onPress={() => console.log('[Settings] Tags')}
          />
          <SettingsRow
            icon={<MessageSquare size={20} color={theme.colors.textSecondary} />}
            label="Comments"
            onPress={() => console.log('[Settings] Comments')}
          />
          <SettingsRow
            icon={<Share2 size={20} color={theme.colors.textSecondary} />}
            label="Sharing"
            onPress={() => console.log('[Settings] Sharing')}
          />
          <SettingsRow
            icon={<UserX size={20} color={theme.colors.textSecondary} />}
            label="Restricted"
            rightValue="0"
            onPress={() => console.log('[Settings] Restricted')}
          />
          <SettingsRow
            icon={<AlertCircle size={20} color={theme.colors.textSecondary} />}
            label="Limit interactions"
            onPress={() => console.log('[Settings] Limit')}
          />
          <SettingsRow
            icon={<Type size={20} color={theme.colors.textSecondary} />}
            label="Hidden words"
            onPress={() => console.log('[Settings] Hidden words')}
          />
          <SettingsRow
            icon={<UserPlus size={20} color={theme.colors.textSecondary} />}
            label="Follow and invite friends"
            onPress={() => console.log('[Settings] Follow invite')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>What you see</Text>
          <SettingsRow
            icon={<Star size={20} color={theme.colors.textSecondary} />}
            label="Favourites"
            rightValue="0"
            onPress={() => console.log('[Settings] Favourites')}
          />
          <SettingsRow
            icon={<BellOff size={20} color={theme.colors.textSecondary} />}
            label="Muted accounts"
            rightValue="0"
            onPress={() => console.log('[Settings] Muted')}
          />
          <SettingsRow
            icon={<Eye size={20} color={theme.colors.textSecondary} />}
            label="Suggested content"
            onPress={() => console.log('[Settings] Suggested')}
          />
          <SettingsRow
            icon={<Heart size={20} color={theme.colors.textSecondary} />}
            label="Like and share counts"
            onPress={() => console.log('[Settings] Like counts')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Your app and media</Text>
          <SettingsRow
            icon={<Smartphone size={20} color={theme.colors.textSecondary} />}
            label="Device permissions"
            onPress={() => console.log('[Settings] Permissions')}
          />
          <SettingsRow
            icon={<Download size={20} color={theme.colors.textSecondary} />}
            label="Archiving and downloading"
            onPress={() => console.log('[Settings] Archiving')}
          />
          <SettingsRow
            icon={<Accessibility size={20} color={theme.colors.textSecondary} />}
            label="Accessibility and translations"
            onPress={() => console.log('[Settings] Accessibility')}
          />
          <SettingsRow
            icon={<Languages size={20} color={theme.colors.textSecondary} />}
            label="Language"
            rightValue="English"
            onPress={() => console.log('[Settings] Language')}
          />
          <SettingsRow
            icon={<BarChart3 size={20} color={theme.colors.textSecondary} />}
            label="Data usage and media quality"
            onPress={() => console.log('[Settings] Data usage')}
          />
          <SettingsRow
            icon={<MonitorSmartphone size={20} color={theme.colors.textSecondary} />}
            label="Website permissions"
            onPress={() => console.log('[Settings] Website permissions')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Your orders and giving</Text>
          <SettingsRow
            icon={<CreditCard size={20} color={theme.colors.textSecondary} />}
            label="Orders and payments"
            onPress={() => handleNav('/orders-payments')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>More info and support</Text>
          <SettingsRow
            icon={<HelpCircle size={20} color={theme.colors.textSecondary} />}
            label="Help"
            onPress={() => console.log('[Settings] Help')}
          />
          <SettingsRow
            icon={<Shield size={20} color={theme.colors.textSecondary} />}
            label="Privacy and security help"
            onPress={() => console.log('[Settings] Privacy help')}
          />
          <SettingsRow
            icon={<CircleUser size={20} color={theme.colors.textSecondary} />}
            label="Account Status"
            onPress={() => console.log('[Settings] Account status')}
          />
          <SettingsRow
            icon={<Info size={20} color={theme.colors.textSecondary} />}
            label="About"
            onPress={() => console.log('[Settings] About')}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Church</Text>
          <SettingsRow
            icon={<Church size={20} color={theme.colors.textSecondary} />}
            label="About This Church"
            onPress={() => console.log('[Settings] About church')}
          />
          <SettingsRow
            icon={<LogOut size={20} color={theme.colors.warning} />}
            label="Leave Church"
            sublabel="Leave current church and join another"
            onPress={handleLeaveChurch}
          />
        </View>

        <SectionDivider />

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.6}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  section: {
    paddingTop: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textTertiary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 18,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: theme.colors.surfaceElevated,
    opacity: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: theme.colors.text,
  },
  rowLabelDestructive: {
    color: theme.colors.error,
  },
  rowSublabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowRightValue: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  logoutRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: theme.colors.error,
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
    marginTop: 20,
    marginBottom: 20,
    gap: 6,
  },
  versionLogo: {
    width: 80,
    height: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  sectionLogoInline: {
    width: 80,
    height: 20,
  },
});
