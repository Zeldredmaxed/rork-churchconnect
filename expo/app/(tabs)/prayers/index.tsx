import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Plus, X, HandHeart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import PrayerCard from '@/components/PrayerCard';
import EmptyState from '@/components/EmptyState';
import type { Prayer } from '@/types';

const CATEGORIES = ['general', 'health', 'family', 'financial', 'spiritual'] as const;

export default function PrayerWallScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showNewPrayer, setShowNewPrayer] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  const prayersQuery = useQuery({
    queryKey: ['prayers'],
    queryFn: async () => {
      console.log('[Prayers] Fetching prayers...');
      const response = await api.get<unknown>('/prayers');
      console.log('[Prayers] Raw response type:', typeof response);
      console.log('[Prayers] Raw response:', JSON.stringify(response).slice(0, 500));
      return response;
    },
  });

  const prayMutation = useMutation({
    mutationFn: (id: string) => api.post(`/prayers/${id}/pray`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const createPrayerMutation = useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('/prayers', params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      resetForm();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const resetForm = () => {
    setShowNewPrayer(false);
    setTitle('');
    setDescription('');
    setCategory('general');
    setIsAnonymous(false);
    setIsUrgent(false);
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    createPrayerMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      is_anonymous: isAnonymous,
      is_urgent: isUrgent,
    });
  };

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['prayers'] });
  }, [queryClient]);

  const rawData = prayersQuery.data as unknown;
  const prayers: Prayer[] = React.useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData as Prayer[];
    if (typeof rawData === 'object' && rawData !== null) {
      const obj = rawData as Record<string, unknown>;
      if (Array.isArray(obj.data)) return obj.data as Prayer[];
      if (Array.isArray(obj.prayers)) return obj.prayers as Prayer[];
      if (Array.isArray(obj.results)) return obj.results as Prayer[];
      if (Array.isArray(obj.items)) return obj.items as Prayer[];
    }
    console.log('[Prayers] Could not parse response:', JSON.stringify(rawData).slice(0, 300));
    return [];
  }, [rawData]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <Text style={styles.headerTitle}>Prayer Wall</Text>,
        }}
      />

      <FlatList
        data={prayers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PrayerCard
            prayer={item}
            onPray={(id) => prayMutation.mutate(id)}
            onPress={(prayer) => router.push(`/prayer-detail?id=${prayer.id}` as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={prayersQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          prayersQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
          ) : (
            <EmptyState
              icon={<HandHeart size={28} color={theme.colors.textTertiary} />}
              title="No prayer requests"
              description="Submit a prayer request to start the wall"
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewPrayer(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={theme.colors.background} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={showNewPrayer} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetForm}>
                <X size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Prayer Request</Text>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!title.trim() || !description.trim() || createPrayerMutation.isPending}
              >
                {createPrayerMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text
                    style={[
                      styles.submitText,
                      (!title.trim() || !description.trim()) && styles.submitTextDisabled,
                    ]}
                  >
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Prayer title"
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TextInput
                style={styles.descInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Share your prayer request..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Post Anonymously</Text>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.accentMuted }}
                  thumbColor={isAnonymous ? theme.colors.accent : theme.colors.textTertiary}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Mark as Urgent</Text>
                <Switch
                  value={isUrgent}
                  onValueChange={setIsUrgent}
                  trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.errorMuted }}
                  thumbColor={isUrgent ? theme.colors.error : theme.colors.textTertiary}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.accent,
  },
  submitTextDisabled: {
    opacity: 0.4,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 12,
  },
  descInput: {
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textTertiary,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  categoryText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  categoryTextActive: {
    color: theme.colors.accent,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  toggleLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
});
