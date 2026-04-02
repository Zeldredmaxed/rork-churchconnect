import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, Send, Users, ChevronRight, Copy, CheckCircle, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';

interface InviteResponse {
  data?: {
    invite_code: string;
    church_id: number;
    invite_url: string;
    generated_by: string;
    expires_in: string;
  };
  invite_code?: string;
  invite_url?: string;
}

export default function FollowInviteScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInviteMutation = useMutation({
    mutationFn: () => api.post<InviteResponse>('/auth/invites/generate'),
    onSuccess: async (data) => {
      console.log('[FollowInvite] Invite generated:', data);
      const url = data?.data?.invite_url ?? data?.invite_url ?? '';
      const code = data?.data?.invite_code ?? data?.invite_code ?? '';
      setInviteUrl(url || code);

      try {
        await Share.share({
          message: url
            ? `Join our church community! Use this link: ${url}`
            : `Join our church community! Use invite code: ${code}`,
        });
      } catch (e) {
        console.log('[FollowInvite] Share error:', e);
      }
    },
    onError: (error) => {
      console.log('[FollowInvite] Generate invite error:', error.message);
      Alert.alert('Error', error.message || 'Failed to generate invite link.');
    },
  });

  const handleInvite = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateInviteMutation.mutate();
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFallbackInvite = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: 'Join me on our church app! Download the app and connect with our church community.',
      });
    } catch (e) {
      console.log('[FollowInvite] Share error:', e);
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Follow and invite friends',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity style={s.row} onPress={() => router.push('/search' as never)} activeOpacity={0.6}>
          <View style={s.rowIcon}>
            <UserPlus size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Follow people</Text>
            <Text style={s.rowSub}>Find people to follow</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.row}
          onPress={handleInvite}
          activeOpacity={0.6}
          disabled={generateInviteMutation.isPending}
        >
          <View style={s.rowIcon}>
            {generateInviteMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Send size={22} color={theme.colors.textSecondary} />
            )}
          </View>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Generate invite link</Text>
            <Text style={s.rowSub}>Create a unique invite link and share it</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {inviteUrl ? (
          <TouchableOpacity style={s.inviteLinkRow} onPress={handleCopyLink} activeOpacity={0.6}>
            <View style={s.inviteLinkContent}>
              <Text style={s.inviteLinkLabel} numberOfLines={1}>{inviteUrl}</Text>
            </View>
            {copied ? (
              <CheckCircle size={18} color={theme.colors.success} />
            ) : (
              <Copy size={18} color={theme.colors.accent} />
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={s.row} onPress={handleFallbackInvite} activeOpacity={0.6}>
          <View style={s.rowIcon}>
            <Share2 size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Share app</Text>
            <Text style={s.rowSub}>Share a general invite to the app</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={s.row} activeOpacity={0.6}>
          <View style={s.rowIcon}>
            <Users size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Follow contacts</Text>
            <Text style={s.rowSub}>Connect your contacts to find people you know</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowIcon: { width: 28, alignItems: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' as const, color: theme.colors.text },
  rowSub: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
  inviteLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  inviteLinkContent: { flex: 1 },
  inviteLinkLabel: { fontSize: 13, color: theme.colors.accent, fontWeight: '500' as const },
});
