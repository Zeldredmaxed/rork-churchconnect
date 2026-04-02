import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Smartphone, Monitor, Tablet, LogOut, MapPin, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';

interface Session {
  id: number;
  device_info: string;
  ip_address: string | null;
  last_active_at: string;
  expires_at: string;
  is_current: boolean;
}

function parseDeviceType(deviceInfo: string): 'mobile' | 'desktop' | 'tablet' {
  const lower = deviceInfo.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) return 'mobile';
  if (lower.includes('ipad') || lower.includes('tablet')) return 'tablet';
  return 'desktop';
}

function parseDeviceName(deviceInfo: string): string {
  if (deviceInfo.includes('iPhone')) return 'iPhone';
  if (deviceInfo.includes('iPad')) return 'iPad';
  if (deviceInfo.includes('Android')) return 'Android Device';
  if (deviceInfo.includes('Windows')) return 'Windows PC';
  if (deviceInfo.includes('Mac')) return 'Mac';
  if (deviceInfo.includes('Linux')) return 'Linux';
  if (deviceInfo.length > 30) return deviceInfo.substring(0, 30) + '...';
  return deviceInfo || 'Unknown Device';
}

function getDeviceIcon(deviceInfo: string, theme: AppTheme) {
  const type = parseDeviceType(deviceInfo);
  switch (type) {
    case 'desktop': return <Monitor size={20} color={theme.colors.info} />;
    case 'tablet': return <Tablet size={20} color={theme.colors.accent} />;
    default: return <Smartphone size={20} color={theme.colors.success} />;
  }
}

function formatLastActive(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Active now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function ActiveSessionsScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      try {
        const data = await api.get<Session[]>('/auth/sessions');
        console.log('[ActiveSessions] Fetched:', data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.log('[ActiveSessions] Error:', e);
        return [] as Session[];
      }
    },
  });

  const logoutSessionMutation = useMutation({
    mutationFn: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => api.post('/auth/sessions/logout-all'),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
  });

  const handleLogoutSession = useCallback((id: string) => {
    Alert.alert('Log Out Session', 'Are you sure you want to log out this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logoutSessionMutation.mutate(id) },
    ]);
  }, [logoutSessionMutation]);

  const handleLogoutAll = useCallback(() => {
    Alert.alert('Log Out All Other Devices', 'This will log out all sessions except the current one.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out All', style: 'destructive', onPress: () => logoutAllMutation.mutate() },
    ]);
  }, [logoutAllMutation]);

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
  }, [queryClient]);

  const sessions = sessionsQuery.data ?? [];
  const currentSession = sessions.find((sess) => sess.is_current);
  const otherSessions = sessions.filter((sess) => !sess.is_current);

  const renderSession = (session: Session) => (
    <View key={String(session.id)} style={s.sessionCard}>
      <View style={s.sessionIcon}>
        {getDeviceIcon(session.device_info, theme)}
      </View>
      <View style={s.sessionContent}>
        <View style={s.sessionHeader}>
          <Text style={s.deviceName}>{parseDeviceName(session.device_info)}</Text>
          {session.is_current && (
            <View style={s.currentBadge}>
              <Text style={s.currentBadgeText}>This device</Text>
            </View>
          )}
        </View>
        <View style={s.sessionMeta}>
          {session.ip_address && (
            <View style={s.metaRow}>
              <MapPin size={11} color={theme.colors.textTertiary} />
              <Text style={s.metaText}>{session.ip_address}</Text>
            </View>
          )}
          <View style={s.metaRow}>
            <Clock size={11} color={theme.colors.textTertiary} />
            <Text style={s.metaText}>{formatLastActive(session.last_active_at)}</Text>
          </View>
        </View>
      </View>
      {!session.is_current && (
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={() => handleLogoutSession(String(session.id))}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={theme.colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Where you\'re logged in',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      {sessionsQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.colors.accent} /></View>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<Smartphone size={28} color={theme.colors.textTertiary} />}
          title="No active sessions"
          description="Your login sessions will appear here."
        />
      ) : (
        <FlatList
          data={[{ key: 'content' }]}
          keyExtractor={(item) => item.key}
          renderItem={() => (
            <View>
              {currentSession && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Current session</Text>
                  {renderSession(currentSession)}
                </View>
              )}

              {otherSessions.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeaderRow}>
                    <Text style={s.sectionTitle}>Other sessions</Text>
                    <TouchableOpacity onPress={handleLogoutAll} activeOpacity={0.7}>
                      <Text style={s.logoutAllText}>Log out all</Text>
                    </TouchableOpacity>
                  </View>
                  {otherSessions.map(renderSession)}
                </View>
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={sessionsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
          }
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600' as const, color: theme.colors.textTertiary, paddingHorizontal: 16, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  logoutAllText: { fontSize: 14, fontWeight: '600' as const, color: theme.colors.error },
  sessionCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  sessionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  sessionContent: { flex: 1 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  currentBadge: { backgroundColor: theme.colors.successMuted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  currentBadgeText: { fontSize: 10, fontWeight: '600' as const, color: theme.colors.success },
  sessionMeta: { marginTop: 4, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textTertiary },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.errorMuted, alignItems: 'center', justifyContent: 'center' },
});
