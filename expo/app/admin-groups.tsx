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
import { Stack } from 'expo-router';
import { Plus, X, Users } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import EmptyState from '@/components/EmptyState';
import Badge from '@/components/Badge';
import type { Group } from '@/types';

export default function AdminGroupsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState('small_group');

  const groupsQuery = useQuery({
    queryKey: ['admin', 'groups'],
    queryFn: async () => {
      const res = await api.get<unknown>('/groups');
      console.log('[AdminGroups] Raw response:', JSON.stringify(res).slice(0, 500));
      return res;
    },
  });

  const createMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => {
      console.log('[AdminGroups] Creating group with:', JSON.stringify(params));
      return api.post('/groups', params);
    },
    onSuccess: () => {
      console.log('[AdminGroups] Group created successfully');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      resetForm();
      Alert.alert('Success', 'Group created successfully!');
    },
    onError: (error) => {
      console.log('[AdminGroups] Create error:', error.message);
      Alert.alert('Error', error.message || 'Failed to create group');
    },
  });

  const resetForm = () => {
    setShowCreateModal(false);
    setName('');
    setDescription('');
    setGroupType('small-group');
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || 'No description provided',
      group_type: groupType,
      type: groupType,
    });
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] });
  }, [queryClient]);

  const groups = React.useMemo(() => {
    const raw = groupsQuery.data as unknown;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Group[];
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as Group[];
      if (Array.isArray(obj.groups)) return obj.groups as Group[];
      if (Array.isArray(obj.items)) return obj.items as Group[];
      if (Array.isArray(obj.results)) return obj.results as Group[];
    }
    console.log('[AdminGroups] Could not parse:', JSON.stringify(raw).slice(0, 300));
    return [];
  }, [groupsQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Manage Groups' }} />

      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Users size={18} color={theme.colors.accent} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
                <Badge label={item.type} variant="accent" small />
              </View>
              <Text style={styles.groupDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.memberCount}>{item.member_count} members</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={groupsQuery.isRefetching} onRefresh={handleRefresh} tintColor={theme.colors.accent} />}
        ListEmptyComponent={
          groupsQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={<Users size={28} color={theme.colors.textTertiary} />} title="No groups" description="Create your first group" />
          )
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
        <Plus size={24} color={theme.colors.background} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetForm}><X size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={handleCreate} disabled={!name.trim() || createMutation.isPending}>
                {createMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={[styles.submitText, !name.trim() && styles.submitDisabled]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Group Name" placeholderTextColor={theme.colors.textTertiary} />
            <TextInput style={[styles.input, { minHeight: 80 }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={theme.colors.textTertiary} multiline textAlignVertical="top" />
            <TextInput style={styles.input} value={groupType} onChangeText={setGroupType} placeholder="Type (e.g. small-group, ministry)" placeholderTextColor={theme.colors.textTertiary} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingTop: 8, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, padding: 14, marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: theme.colors.borderLight, gap: 12,
  },
  cardLeft: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { fontSize: 15, fontWeight: '600' as const, color: theme.colors.text, flex: 1 },
  groupDesc: { fontSize: 13, color: theme.colors.textSecondary },
  memberCount: { fontSize: 12, color: theme.colors.textTertiary },
  fab: {
    position: 'absolute' as const, bottom: 24, right: 20, width: 56, height: 56, borderRadius: 16,
    backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '600' as const, color: theme.colors.text },
  submitText: { fontSize: 16, fontWeight: '600' as const, color: theme.colors.accent },
  submitDisabled: { opacity: 0.4 },
  input: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text },
});

