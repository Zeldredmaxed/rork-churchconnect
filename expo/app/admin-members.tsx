import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Plus, X, Download, Upload } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import SearchBar from '@/components/SearchBar';
import MemberRow from '@/components/MemberRow';
import EmptyState from '@/components/EmptyState';
import { Users } from 'lucide-react-native';
import type { Member, PaginatedResponse } from '@/types';

export default function AdminMembersScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'visitor' | 'prospect' | 'active'>('visitor');

  const membersQuery = useQuery({
    queryKey: ['admin', 'members', search],
    queryFn: () =>
      api.get<PaginatedResponse<Member>>(
        `/members?page=1&per_page=50${search ? `&search=${encodeURIComponent(search)}` : ''}`
      ),
  });

  const addMemberMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('/members', params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      resetForm();
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const resetForm = () => {
    setShowAddModal(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setStatus('visitor');
  };

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    addMemberMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      membership_status: status,
    });
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
  }, [queryClient]);

  const members = membersQuery.data?.data ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Members',
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => console.log('Export CSV')} style={styles.headerBtn}>
                <Download size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => console.log('Import CSV')} style={styles.headerBtn}>
                <Upload size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <SearchBar placeholder="Search members..." onSearch={setSearch} />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            onPress={(m) => router.push(`/admin-member-detail?id=${m.id}` as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={membersQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          membersQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon={<Users size={28} color={theme.colors.textTertiary} />}
              title="No members found"
              description="Add members to your church"
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={theme.colors.background} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetForm}>
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim() || !email.trim() || addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.submitText, (!firstName.trim() || !email.trim()) && styles.submitDisabled]}>
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <TextInput
                style={[styles.formInput, styles.halfInput]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TextInput
                style={[styles.formInput, styles.halfInput]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <TextInput
              style={styles.formInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.formInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
            />

            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusRow}>
              {(['visitor', 'prospect', 'active'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusChip, status === s && styles.statusChipActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { padding: 4 },
  listContent: { paddingBottom: 100 },
  separator: { height: 1, backgroundColor: theme.colors.borderLight, marginLeft: 66 },
  fab: {
    position: 'absolute' as const, bottom: 24, right: 20, width: 56, height: 56, borderRadius: 16,
    backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.text },
  submitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.accent },
  submitDisabled: { opacity: 0.4 },
  formRow: { flexDirection: 'row', gap: 10 },
  formInput: {
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text,
  },
  halfInput: { flex: 1 },
  statusLabel: {
    fontSize: 13, fontWeight: '600' as const, color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: 4,
  },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
  },
  statusChipActive: { backgroundColor: theme.colors.accentMuted },
  statusText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' as const },
  statusTextActive: { color: theme.colors.accent },
});
