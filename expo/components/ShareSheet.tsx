import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Pressable,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Search, X, Link2, Share2, PlusCircle, MessageCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { FlockUser } from '@/types';

interface ShareableContent {
  id: string;
  type: 'post' | 'short';
  title: string;
  authorName?: string;
}

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  content: ShareableContent | null;
}

interface ContactItemProps {
  user: FlockUser;
  isSelected: boolean;
  isSent: boolean;
  isSending: boolean;
  onSelect: () => void;
  theme: AppTheme;
}

function ContactItem({ user, isSelected, isSent, isSending, onSelect, theme }: ContactItemProps) {
  const styles = createStyles(theme);
  const initials = user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <TouchableOpacity style={styles.contactItem} onPress={onSelect} activeOpacity={0.6} disabled={isSent || isSending}>
      <View style={[styles.contactAvatar, isSelected && styles.contactAvatarSelected]}>
        <Text style={[styles.contactAvatarText, isSelected && styles.contactAvatarTextSelected]}>{initials}</Text>
        {isSelected && !isSent && !isSending && (
          <View style={styles.checkMark}><View style={styles.checkInner} /></View>
        )}
      </View>
      <Text style={styles.contactName} numberOfLines={1}>{user.full_name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ShareSheet({ visible, onClose, content }: ShareSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sentUsers, setSentUsers] = useState<string[]>([]);
  const [sendingUsers, setSendingUsers] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const contactsQuery = useQuery({
    queryKey: ['share-contacts'],
    queryFn: async () => {
      try { const data = await api.get<{ data: FlockUser[] }>('/social/flock/suggestions'); return data; }
      catch { return { data: [] as FlockUser[] }; }
    },
    enabled: visible,
  });

  const searchUsersQuery = useQuery({
    queryKey: ['share-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { data: [] as FlockUser[] };
      try { const data = await api.get<{ data: FlockUser[] }>(`/members/search?q=${encodeURIComponent(searchQuery.trim())}`); return data; }
      catch { return { data: [] as FlockUser[] }; }
    },
    enabled: searchQuery.trim().length > 0 && visible,
  });

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 65 }).start();
    } else {
      slideAnim.setValue(0);
      setSearchQuery(''); setSelectedUsers([]); setSentUsers([]); setSendingUsers([]); setMessage('');
    }
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { onClose(); });
  }, [slideAnim, onClose]);

  const toggleUser = useCallback((userId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUsers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  }, []);

  const handleSend = useCallback(async () => {
    if (!content || selectedUsers.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const usersToSend = selectedUsers.filter((id) => !sentUsers.includes(id));
    setSendingUsers(usersToSend);
    for (const userId of usersToSend) {
      try {
        const shareMessage = message.trim() ? `${message.trim()}\n\nShared ${content.type}: "${content.title}"` : `Shared a ${content.type}: "${content.title}"`;
        await api.post('/chat/send', { recipient_id: userId, content: shareMessage, shared_content_id: content.id, shared_content_type: content.type });
        console.log('[Share] Sent to user:', userId);
        setSentUsers((prev) => [...prev, userId]);
      } catch (error) { console.log('[Share] Failed to send to user:', userId, error); }
      setSendingUsers((prev) => prev.filter((id) => id !== userId));
    }
  }, [content, selectedUsers, sentUsers, message]);

  const handleCopyLink = useCallback(async () => {
    if (!content) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await Clipboard.setStringAsync(`https://shepherd.app/${content.type}/${content.id}`); Alert.alert('Copied', 'Link copied to clipboard'); }
    catch { console.log('[Share] Failed to copy link'); }
  }, [content]);

  const handleExternalShare = useCallback(async () => {
    if (!content) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = `https://shepherd.app/${content.type}/${content.id}`;
    try { await Share.share({ message: content.title ? `Check this out: ${content.title}\n${link}` : link, url: Platform.OS === 'ios' ? link : undefined }); }
    catch { console.log('[Share] External share cancelled or failed'); }
  }, [content]);

  const handleSendInChat = useCallback(() => {
    if (!content) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleClose();
    setTimeout(() => { router.push('/new-message' as never); }, 300);
  }, [content, handleClose, router]);

  const isSearching = searchQuery.trim().length > 0;
  const contacts = isSearching ? (searchUsersQuery.data?.data ?? []) : (contactsQuery.data?.data ?? []);
  const hasSelectedUnsent = selectedUsers.some((id) => !sentUsers.includes(id));

  if (!visible) return null;

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={16} color={theme.colors.textTertiary} />
              <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search" placeholderTextColor={theme.colors.textTertiary} autoCapitalize="none" autoCorrect={false} testID="share-search" />
              {searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><X size={16} color={theme.colors.textTertiary} /></TouchableOpacity>)}
            </View>
          </View>
          <View style={styles.contactsSection}>
            {contactsQuery.isLoading && !isSearching ? (
              <View style={styles.contactsLoading}><ActivityIndicator size="small" color={theme.colors.accent} /></View>
            ) : contacts.length === 0 ? (
              <View style={styles.contactsEmpty}><Text style={styles.contactsEmptyText}>{isSearching ? 'No results found' : 'No contacts available'}</Text></View>
            ) : (
              <FlatList data={contacts} keyExtractor={(item) => String(item.id)} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactsList}
                renderItem={({ item }) => (<ContactItem user={item} isSelected={selectedUsers.includes(item.id)} isSent={sentUsers.includes(item.id)} isSending={sendingUsers.includes(item.id)} onSelect={() => toggleUser(item.id)} theme={theme} />)} />
            )}
          </View>
          {selectedUsers.length > 0 && (
            <View style={styles.messageSection}>
              <View style={styles.messageInputRow}>
                <TextInput style={styles.messageInput} value={message} onChangeText={setMessage} placeholder="Write a message..." placeholderTextColor={theme.colors.textTertiary} multiline={false} testID="share-message-input" />
                <TouchableOpacity style={[styles.sendBtn, !hasSelectedUnsent && styles.sendBtnDisabled]} onPress={handleSend} disabled={!hasSelectedUnsent || sendingUsers.length > 0} activeOpacity={0.7}>
                  {sendingUsers.length > 0 ? (<ActivityIndicator size="small" color={theme.colors.white} />) : (<Text style={styles.sendBtnText}>{sentUsers.length > 0 && !hasSelectedUnsent ? 'Sent' : 'Send'}</Text>)}
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.actionsSection}>
            <ActionButton icon={<Link2 size={22} color={theme.colors.text} />} label="Copy link" onPress={handleCopyLink} />
            <ActionButton icon={<Share2 size={22} color={theme.colors.text} />} label="Share" onPress={handleExternalShare} />
            <ActionButton icon={<MessageCircle size={22} color={theme.colors.text} />} label="Send in chat" onPress={handleSendInChat} />
            <ActionButton icon={<PlusCircle size={22} color={theme.colors.text} />} label="Add to story" onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Alert.alert('Coming Soon', 'Stories feature is coming soon!'); }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '70%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
  searchSection: { paddingHorizontal: 16, marginBottom: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, paddingHorizontal: 12, gap: 8, height: 38 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 0 },
  contactsSection: { minHeight: 100 },
  contactsLoading: { height: 100, alignItems: 'center', justifyContent: 'center' },
  contactsEmpty: { height: 100, alignItems: 'center', justifyContent: 'center' },
  contactsEmptyText: { fontSize: 14, color: theme.colors.textTertiary },
  contactsList: { paddingHorizontal: 12, gap: 4 },
  contactItem: { alignItems: 'center', width: 76, paddingVertical: 4 },
  contactAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
  contactAvatarSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentMuted },
  contactAvatarText: { fontSize: 17, fontWeight: '700' as const, color: theme.colors.textSecondary },
  contactAvatarTextSelected: { color: theme.colors.accent },
  checkMark: { position: 'absolute' as const, bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.surface },
  checkInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.white },
  contactName: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' as const, maxWidth: 70 },
  messageSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  messageInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  messageInput: { flex: 1, fontSize: 15, color: theme.colors.text, backgroundColor: theme.colors.surfaceElevated, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtn: { backgroundColor: theme.colors.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, minWidth: 64, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 14, fontWeight: '700' as const, color: theme.colors.white },
  divider: { height: 0.5, backgroundColor: theme.colors.borderLight, marginHorizontal: 16, marginVertical: 4 },
  actionsSection: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  actionItem: { alignItems: 'center', width: 72, gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  actionLabel: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center' as const, lineHeight: 14 },
});
