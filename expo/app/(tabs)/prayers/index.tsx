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
import { Plus, X, HandHeart, Leaf } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import PrayerCard from '@/components/PrayerCard';
import EmptyState from '@/components/EmptyState';
import type { Prayer } from '@/types';

const CATEGORIES = ['general', 'health', 'family', 'financial', 'spiritual'] as const;

const DAILY_VERSES = [
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'Cast all your anxiety on him because he cares for you.', ref: '1 Peter 5:7' },
  { text: 'The Lord is near to the brokenhearted.', ref: 'Psalm 34:18' },
  { text: 'Do not be anxious about anything, but in everything by prayer.', ref: 'Philippians 4:6' },
  { text: 'The prayer of a righteous person is powerful and effective.', ref: 'James 5:16' },
];

function getDailyVerse() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

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

  const { user } = useAuth();
  const verse = getDailyVerse();

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

  const fulfillMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('[Prayers] Marking prayer as fulfilled:', id);
      return api.put(`/prayers/${id}/answered`, {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      Alert.alert('Praise!', 'Your prayer has been marked as fulfilled. Thank you for sharing!');
    },
    onError: (error) => {
      console.log('[Prayers] Fulfill error:', error.message);
      Alert.alert('Error', error.message || 'Could not mark prayer as fulfilled.');
    },
  });

  const deletePrayerMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/prayers/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
    onError: (error) => {
      console.log('[Prayers] Delete error:', error.message);
      Alert.alert('Error', 'Could not delete prayer.');
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

  const renderHeader = () => (
    <View style={styles.headerBanner}>
      <View style={styles.bannerContent}>
        <View style={styles.verseSection}>
          <Text style={styles.verseText}>"{verse.text}"</Text>
          <Text style={styles.verseRef}>{verse.ref}</Text>
        </View>
        <View style={styles.bannerIconWrap}>
          <Leaf size={36} color={theme.colors.accentLight} strokeWidth={1.2} />
        </View>
      </View>
      <Text style={styles.bannerSubtext}>
        Carry each other's burdens, and in this way you will fulfill the law of Christ.
      </Text>
    </View>
  );

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
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PrayerCard
            prayer={item}
            onPray={(id) => prayMutation.mutate(id)}
            onPress={(prayer) => router.push(`/prayer-detail?id=${prayer.id}` as never)}
            onMarkFulfilled={(id) => fulfillMutation.mutate(id)}
            onDelete={(id) => deletePrayerMutation.mutate(id)}
            onReport={(id) => {
              console.log('[Prayers] Report prayer:', id);
              Alert.alert('Reported', 'Thank you for your report. We will review this prayer request.');
            }}
            isOwner={item.author_id === user?.id}
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
              title="No prayer requests yet"
              description="Be the first to share a prayer request with the community"
            />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewPrayer(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={theme.colors.textInverse} strokeWidth={2.5} />
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
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  headerBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 18,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  verseSection: {
    flex: 1,
    marginRight: 16,
  },
  verseText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    lineHeight: 28,
    fontStyle: 'italic' as const,
    marginBottom: 6,
  },
  verseRef: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.accentLight,
    fontStyle: 'italic' as const,
  },
  bannerIconWrap: {
    opacity: 0.5,
    marginTop: 4,
  },
  bannerSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
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
    borderWidth: 1,
    borderColor: theme.colors.accent,
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
