import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { UserPlus, Send, Users, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

export default function FollowInviteScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const router = useRouter();

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on Shepherd! Download the app and connect with our church community.',
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

        <TouchableOpacity style={s.row} onPress={handleInvite} activeOpacity={0.6}>
          <View style={s.rowIcon}>
            <Send size={22} color={theme.colors.textSecondary} />
          </View>
          <View style={s.rowContent}>
            <Text style={s.rowLabel}>Invite friends</Text>
            <Text style={s.rowSub}>Share a link to invite friends to join</Text>
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
  rowLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  rowSub: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 2 },
});
