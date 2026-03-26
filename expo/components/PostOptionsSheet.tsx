import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Trash2, Flag, Bookmark, Share2, Link, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

interface PostOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  isOwner: boolean;
  onDelete: () => void;
  onReport?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isDeleting?: boolean;
  itemType?: 'post' | 'short';
}

export default function PostOptionsSheet({
  visible,
  onClose,
  isOwner,
  onDelete,
  onReport,
  onSave,
  isSaved = false,
  isDeleting = false,
  itemType = 'post',
}: PostOptionsSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleDelete = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const handleClose = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });
  const label = itemType === 'short' ? 'short' : 'post';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSave?.();
                onClose();
              }}
            >
              <View style={[styles.quickActionIcon, isSaved && styles.quickActionIconActive]}>
                <Bookmark size={22} color={isSaved ? theme.colors.accent : theme.colors.text} fill={isSaved ? theme.colors.accent : 'transparent'} />
              </View>
              <Text style={[styles.quickActionLabel, isSaved && styles.quickActionLabelActive]}>{isSaved ? 'Unsave' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} activeOpacity={0.7}>
              <View style={styles.quickActionIcon}>
                <Share2 size={22} color={theme.colors.text} />
              </View>
              <Text style={styles.quickActionLabel}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} activeOpacity={0.7}>
              <View style={styles.quickActionIcon}>
                <Link size={22} color={theme.colors.text} />
              </View>
              <Text style={styles.quickActionLabel}>Copy Link</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {!isOwner && (
            <TouchableOpacity
              style={styles.optionRow}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onReport?.();
              }}
            >
              <Flag size={20} color={theme.colors.error} />
              <Text style={styles.optionTextReport}>Report this {label}</Text>
            </TouchableOpacity>
          )}

          {isOwner && (
            <TouchableOpacity
              style={styles.optionRow}
              activeOpacity={0.7}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={theme.colors.error} />
              ) : (
                <Trash2 size={20} color={theme.colors.error} />
              )}
              <Text style={styles.optionTextDanger}>
                {isDeleting ? `Deleting ${label}...` : `Delete ${label}`}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface DeleteConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemType?: 'post' | 'short';
}

export function DeleteConfirmSheet({
  visible,
  onClose,
  onConfirm,
  isDeleting,
  itemType = 'post',
}: DeleteConfirmSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
  const label = itemType === 'short' ? 'short' : 'post';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.confirmSheet, { transform: [{ translateY }] }]}>
          <View style={styles.confirmIconWrap}>
            <AlertTriangle size={32} color={theme.colors.error} />
          </View>
          <Text style={styles.confirmTitle}>Delete {label}?</Text>
          <Text style={styles.confirmDesc}>
            This {label} will be permanently deleted. This action cannot be undone.
          </Text>

          <TouchableOpacity
            style={[styles.confirmDeleteBtn, isDeleting && styles.confirmDeleteBtnDisabled]}
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onConfirm();
            }}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Text style={styles.confirmDeleteText}>Delete</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmCancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  quickActionIconActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
  quickActionLabelActive: {
    color: theme.colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionTextDanger: {
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '500' as const,
  },
  optionTextReport: {
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '400' as const,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  confirmSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 28,
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.errorMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  confirmDeleteBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.6,
  },
  confirmDeleteText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  confirmCancelBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
});
