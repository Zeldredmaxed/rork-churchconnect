import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Image,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Users, FileText, Clapperboard, MessageCircle, Play, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { FlockUser, FeedPost, Clip, Conversation } from '@/types';

type SearchTab = 'all' | 'users' | 'posts' | 'shorts' | 'messages';

const RECENT_SEARCHES_KEY = 'app_recent_searches_v2';
const MAX_RECENT = 15;

interface RecentSearch {
  id: string;
  type: 'user' | 'post' | 'short' | 'clip' | 'message';
  title: string;
  subtitle?: string;
  avatar_url?: string;
  route: string;
}

export default function UniversalSearchScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    void loadRecentSearches();
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.log('[Search] Failed to load recent searches:', e);
    }
  };

  const saveRecentSearch = useCallback((item: RecentSearch) => {
    setRecentSearches((prev) => {
      const updated = [item, ...prev.filter((r) => r.id !== item.id || r.type !== item.type)].slice(0, MAX_RECENT);
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback(async (id: string, type: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecentSearches((prev) => {
      const updated = prev.filter((r) => !(r.id === id && r.type === type));
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAllRecent = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 1;

  const usersQuery = useQuery({
    queryKey: ['universal-search-users', trimmedQuery],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: FlockUser[] }>(`/seek?q=${encodeURIComponent(trimmedQuery)}`);
        return data?.data ?? [];
      } catch {
        return [] as FlockUser[];
      }
    },
    enabled: isSearching && (activeTab === 'all' || activeTab === 'users'),
  });

  const postsQuery = useQuery({
    queryKey: ['universal-search-posts', trimmedQuery],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: FeedPost[] }>(`/feed?search=${encodeURIComponent(trimmedQuery)}`);
        return data?.data ?? [];
      } catch {
        try {
          const data = await api.get<{ data: FeedPost[] }>('/feed');
          const all = data?.data ?? [];
          const q = trimmedQuery.toLowerCase();
          return all.filter(
            (p) =>
              p.content?.toLowerCase().includes(q) ||
              p.author_name?.toLowerCase().includes(q)
          );
        } catch {
          return [] as FeedPost[];
        }
      }
    },
    enabled: isSearching && (activeTab === 'all' || activeTab === 'posts'),
  });

  const shortsQuery = useQuery({
    queryKey: ['universal-search-shorts', trimmedQuery],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: Clip[] }>(`/clips/feed?limit=50`);
        const all = data?.data ?? [];
        const q = trimmedQuery.toLowerCase();
        return all.filter(
          (s) =>
            s.title?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.author_name?.toLowerCase().includes(q)
        );
      } catch {
        return [] as Clip[];
      }
    },
    enabled: isSearching && (activeTab === 'all' || activeTab === 'shorts'),
  });

  const messagesQuery = useQuery({
    queryKey: ['universal-search-messages', trimmedQuery],
    queryFn: async () => {
      try {
        const data = await api.get<{ data: Conversation[] }>('/chat/threads');
        const all = data?.data ?? [];
        const q = trimmedQuery.toLowerCase();
        return all.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.last_message?.toLowerCase().includes(q) ||
            c.participants?.some((p) => p.name?.toLowerCase().includes(q))
        );
      } catch {
        return [] as Conversation[];
      }
    },
    enabled: isSearching && (activeTab === 'all' || activeTab === 'messages'),
  });

  const users = usersQuery.data ?? [];
  const posts = postsQuery.data ?? [];
  const shorts = shortsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  const isLoading =
    (activeTab === 'all' && (usersQuery.isLoading || postsQuery.isLoading || shortsQuery.isLoading || messagesQuery.isLoading)) ||
    (activeTab === 'users' && usersQuery.isLoading) ||
    (activeTab === 'posts' && postsQuery.isLoading) ||
    (activeTab === 'shorts' && shortsQuery.isLoading) ||
    (activeTab === 'messages' && messagesQuery.isLoading);

  const hasNoResults =
    isSearching &&
    !isLoading &&
    ((activeTab === 'all' && users.length === 0 && posts.length === 0 && shorts.length === 0 && messages.length === 0) ||
      (activeTab === 'users' && users.length === 0) ||
      (activeTab === 'posts' && posts.length === 0) ||
      (activeTab === 'shorts' && shorts.length === 0) ||
      (activeTab === 'messages' && messages.length === 0));

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleUserPress = useCallback((user: FlockUser) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    saveRecentSearch({
      id: user.id,
      type: 'user',
      title: user.full_name,
      subtitle: user.username ? `@${user.username}` : undefined,
      avatar_url: user.avatar_url,
      route: `/user-profile?id=${user.id}`,
    });
    router.push(`/user-profile?id=${user.id}` as never);
  }, [router, saveRecentSearch]);

  const handlePostPress = useCallback((post: FeedPost) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    saveRecentSearch({
      id: String(post.id),
      type: 'post',
      title: post.content?.slice(0, 60) || 'Post',
      subtitle: `by ${post.author_name}`,
      route: '/(tabs)/(home)',
    });
    router.push('/(tabs)/(home)' as never);
  }, [router, saveRecentSearch]);

  const handleShortPress = useCallback((short: Clip) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    saveRecentSearch({
      id: String(short.id),
      type: 'short',
      title: short.title || 'Short',
      subtitle: short.author_name ? `by ${short.author_name}` : undefined,
      route: '/(tabs)/shorts',
    });
    router.push('/(tabs)/shorts' as never);
  }, [router, saveRecentSearch]);

  const handleConversationPress = useCallback((convo: Conversation) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const name = convo.name || convo.participants?.map((p) => p.name).join(', ') || 'Chat';
    saveRecentSearch({
      id: convo.id,
      type: 'message',
      title: name,
      subtitle: convo.last_message?.slice(0, 50),
      route: `/chat-room?id=${convo.id}`,
    });
    router.push(`/chat-room?id=${convo.id}` as never);
  }, [router, saveRecentSearch]);

  const handleRecentPress = useCallback((item: RecentSearch) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    router.push(item.route as never);
  }, [router]);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }, []);

  const tabs: { key: SearchTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Search size={14} color={activeTab === 'all' ? theme.colors.white : theme.colors.textSecondary} /> },
    { key: 'users', label: 'People', icon: <Users size={14} color={activeTab === 'users' ? theme.colors.white : theme.colors.textSecondary} /> },
    { key: 'posts', label: 'Posts', icon: <FileText size={14} color={activeTab === 'posts' ? theme.colors.white : theme.colors.textSecondary} /> },
    { key: 'shorts', label: 'Clips', icon: <Clapperboard size={14} color={activeTab === 'shorts' ? theme.colors.white : theme.colors.textSecondary} /> },
    { key: 'messages', label: 'Messages', icon: <MessageCircle size={14} color={activeTab === 'messages' ? theme.colors.white : theme.colors.textSecondary} /> },
  ];

  const renderUserItem = (user: FlockUser) => (
    <TouchableOpacity
      key={user.id}
      style={styles.resultRow}
      onPress={() => handleUserPress(user)}
      activeOpacity={0.6}
      testID={`search-user-${user.id}`}
    >
      <View style={styles.avatar}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{user.full_name}</Text>
        {user.username && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>@{user.username}</Text>
        )}
        {(user.followers_count ?? 0) > 0 && (
          <Text style={styles.resultMeta}>{user.followers_count?.toLocaleString()} followers</Text>
        )}
      </View>
      <View style={styles.typeBadge}>
        <Users size={12} color={theme.colors.accent} />
      </View>
    </TouchableOpacity>
  );

  const renderPostItem = (post: FeedPost) => (
    <TouchableOpacity
      key={post.id}
      style={styles.resultRow}
      onPress={() => handlePostPress(post)}
      activeOpacity={0.6}
      testID={`search-post-${post.id}`}
    >
      {post.media_urls && post.media_urls.length > 0 ? (
        <View style={styles.postThumb}>
          <Image source={{ uri: post.media_urls[0] }} style={styles.postThumbImage} />
        </View>
      ) : (
        <View style={[styles.avatar, styles.postAvatar]}>
          <FileText size={20} color={theme.colors.textTertiary} />
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{post.content}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {post.author_name} · {formatDate(post.created_at)}
        </Text>
      </View>
      <View style={styles.typeBadge}>
        <FileText size={12} color={theme.colors.info} />
      </View>
    </TouchableOpacity>
  );

  const renderShortItem = (short: Clip) => (
    <TouchableOpacity
      key={short.id}
      style={styles.resultRow}
      onPress={() => handleShortPress(short)}
      activeOpacity={0.6}
      testID={`search-short-${short.id}`}
    >
      <View style={styles.shortThumb}>
        {short.thumbnail_url ? (
          <Image source={{ uri: short.thumbnail_url }} style={styles.shortThumbImage} />
        ) : (
          <Play size={18} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.7)" />
        )}
        <View style={styles.shortPlayOverlay}>
          <Play size={10} color="#fff" fill="#fff" />
        </View>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{short.title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {short.author_name ?? 'Unknown'} · {short.view_count} views
        </Text>
      </View>
      <View style={styles.typeBadge}>
        <Clapperboard size={12} color={theme.colors.warning} />
      </View>
    </TouchableOpacity>
  );

  const renderConversationItem = (convo: Conversation) => {
    const name = convo.name || convo.participants?.map((p) => p.name).join(', ') || 'Chat';
    const initials = getInitials(name);
    return (
      <TouchableOpacity
        key={convo.id}
        style={styles.resultRow}
        onPress={() => handleConversationPress(convo)}
        activeOpacity={0.6}
        testID={`search-convo-${convo.id}`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>{name}</Text>
          {convo.last_message && (
            <Text style={styles.resultSubtitle} numberOfLines={1}>{convo.last_message}</Text>
          )}
        </View>
        <View style={styles.typeBadge}>
          <MessageCircle size={12} color={theme.colors.success} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecentItem = (item: RecentSearch) => {
    const TypeIcon = item.type === 'user' ? Users
      : item.type === 'post' ? FileText
      : item.type === 'short' ? Clapperboard
      : MessageCircle;

    return (
      <TouchableOpacity
        key={`${item.type}-${item.id}`}
        style={styles.resultRow}
        onPress={() => handleRecentPress(item)}
        activeOpacity={0.6}
      >
        <View style={styles.recentIcon}>
          <Clock size={18} color={theme.colors.textTertiary} />
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          )}
        </View>
        <View style={styles.recentTypeAndRemove}>
          <TypeIcon size={12} color={theme.colors.textTertiary} />
          <TouchableOpacity
            onPress={() => void removeRecentSearch(item.id, item.type)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.removeBtn}
          >
            <X size={14} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (hasNoResults) {
      return (
        <View style={styles.centered}>
          <Search size={40} color={theme.colors.textTertiary} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      );
    }

    const sections: React.ReactNode[] = [];

    if (activeTab === 'all' || activeTab === 'users') {
      const displayUsers = activeTab === 'all' ? users.slice(0, 3) : users;
      if (displayUsers.length > 0) {
        sections.push(
          <View key="users-section">
            {activeTab === 'all' && (
              <View style={styles.sectionHeader}>
                <Users size={16} color={theme.colors.accent} />
                <Text style={styles.sectionTitle}>People</Text>
                {users.length > 3 && (
                  <TouchableOpacity onPress={() => setActiveTab('users')}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {displayUsers.map(renderUserItem)}
          </View>
        );
      }
    }

    if (activeTab === 'all' || activeTab === 'posts') {
      const displayPosts = activeTab === 'all' ? posts.slice(0, 3) : posts;
      if (displayPosts.length > 0) {
        sections.push(
          <View key="posts-section">
            {activeTab === 'all' && (
              <View style={styles.sectionHeader}>
                <FileText size={16} color={theme.colors.info} />
                <Text style={styles.sectionTitle}>Posts</Text>
                {posts.length > 3 && (
                  <TouchableOpacity onPress={() => setActiveTab('posts')}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {displayPosts.map(renderPostItem)}
          </View>
        );
      }
    }

    if (activeTab === 'all' || activeTab === 'shorts') {
      const displayShorts = activeTab === 'all' ? shorts.slice(0, 3) : shorts;
      if (displayShorts.length > 0) {
        sections.push(
          <View key="shorts-section">
            {activeTab === 'all' && (
              <View style={styles.sectionHeader}>
                <Clapperboard size={16} color={theme.colors.warning} />
                <Text style={styles.sectionTitle}>Clips</Text>
                {shorts.length > 3 && (
                  <TouchableOpacity onPress={() => setActiveTab('shorts')}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {displayShorts.map(renderShortItem)}
          </View>
        );
      }
    }

    if (activeTab === 'all' || activeTab === 'messages') {
      const displayMessages = activeTab === 'all' ? messages.slice(0, 3) : messages;
      if (displayMessages.length > 0) {
        sections.push(
          <View key="messages-section">
            {activeTab === 'all' && (
              <View style={styles.sectionHeader}>
                <MessageCircle size={16} color={theme.colors.success} />
                <Text style={styles.sectionTitle}>Messages</Text>
                {messages.length > 3 && (
                  <TouchableOpacity onPress={() => setActiveTab('messages')}>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {displayMessages.map(renderConversationItem)}
          </View>
        );
      }
    }

    return <>{sections}</>;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.searchHeader}>
        <View style={styles.searchBarWrap}>
          <Search size={16} color={theme.colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search people, posts, clips, messages..."
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            testID="universal-search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            router.back();
          }}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {isSearching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsContainer}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
              activeOpacity={0.7}
            >
              {tab.icon}
              <Text style={[styles.tabChipText, activeTab === tab.key && styles.tabChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSearching ? (
          renderSearchResults()
        ) : recentSearches.length > 0 ? (
          <View>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent searches</Text>
              <TouchableOpacity onPress={() => void clearAllRecent()}>
                <Text style={styles.seeAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map(renderRecentItem)}
          </View>
        ) : (
          <View style={styles.centered}>
            <Search size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Search everything</Text>
            <Text style={styles.emptySubtitle}>
              Find people, posts, clips, and messages
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: theme.colors.background,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  tabsContainer: {
    maxHeight: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.borderLight,
  },
  tabsRow: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
  },
  tabChipActive: {
    backgroundColor: theme.colors.accent,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  tabChipTextActive: {
    color: theme.colors.white,
    fontWeight: '600' as const,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '500' as const,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  postAvatar: {
    borderRadius: 10,
  },
  postThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
  },
  postThumbImage: {
    width: 48,
    height: 48,
  },
  shortThumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortThumbImage: {
    width: 48,
    height: 64,
  },
  shortPlayOverlay: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.text,
    lineHeight: 19,
  },
  resultSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  resultMeta: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTypeAndRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removeBtn: {
    padding: 6,
  },
  centered: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
