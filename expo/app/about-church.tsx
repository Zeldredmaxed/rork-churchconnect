import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Church, MapPin, Globe, Phone, Mail, Users } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

interface ChurchInfo {
  id: string | number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  member_count?: number;
  logo_url?: string;
}

export default function AboutChurchScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const { user } = useAuth();

  const churchQuery = useQuery({
    queryKey: ['church', user?.church_id],
    queryFn: async () => {
      if (!user?.church_id) return null;
      return api.get<ChurchInfo>(`/churches/${user.church_id}`);
    },
    enabled: !!user?.church_id,
  });

  const church = churchQuery.data;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'About This Church',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        {churchQuery.isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : church ? (
          <>
            <View style={s.heroSection}>
              <View style={s.iconCircle}>
                <Church size={36} color={theme.colors.accent} />
              </View>
              <Text style={s.churchName}>{church.name}</Text>
              {church.description && <Text style={s.churchDesc}>{church.description}</Text>}
            </View>

            <View style={s.card}>
              {church.address && (
                <>
                  <View style={s.infoRow}>
                    <MapPin size={18} color={theme.colors.textSecondary} />
                    <Text style={s.infoText}>{church.address}</Text>
                  </View>
                  <View style={s.cardDivider} />
                </>
              )}
              {church.phone && (
                <>
                  <View style={s.infoRow}>
                    <Phone size={18} color={theme.colors.textSecondary} />
                    <Text style={s.infoText}>{church.phone}</Text>
                  </View>
                  <View style={s.cardDivider} />
                </>
              )}
              {church.email && (
                <>
                  <View style={s.infoRow}>
                    <Mail size={18} color={theme.colors.textSecondary} />
                    <Text style={s.infoText}>{church.email}</Text>
                  </View>
                  <View style={s.cardDivider} />
                </>
              )}
              {church.website && (
                <>
                  <View style={s.infoRow}>
                    <Globe size={18} color={theme.colors.textSecondary} />
                    <Text style={s.infoText}>{church.website}</Text>
                  </View>
                  <View style={s.cardDivider} />
                </>
              )}
              <View style={s.infoRow}>
                <Users size={18} color={theme.colors.textSecondary} />
                <Text style={s.infoText}>{church.member_count ?? 0} members</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={s.emptyContainer}>
            <Church size={48} color={theme.colors.textTertiary} />
            <Text style={s.emptyText}>Church information unavailable</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  loadingContainer: { paddingTop: 80, alignItems: 'center' },
  heroSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accentMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  churchName: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginBottom: 8, textAlign: 'center' },
  churchDesc: { fontSize: 14, color: theme.colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  card: { marginHorizontal: 16, backgroundColor: theme.colors.surfaceElevated, borderRadius: 14, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  infoText: { flex: 1, fontSize: 15, color: theme.colors.text },
  cardDivider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginLeft: 46 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: theme.colors.textTertiary },
});
