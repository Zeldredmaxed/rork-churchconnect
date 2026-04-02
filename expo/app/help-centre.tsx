import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, ChevronRight, BookOpen, Users, Shield, Bell, Camera, MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';

interface FaqCategory {
  icon: React.ReactNode;
  title: string;
  articles: string[];
}

export default function HelpCentreScreen() {
  const { theme } = useTheme();
  const s = createStyles(theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const categories: FaqCategory[] = [
    {
      icon: <Users size={20} color={theme.colors.accent} />,
      title: 'Account & Profile',
      articles: [
        'How do I edit my profile?',
        'How do I change my username?',
        'How do I switch churches?',
        'How do I delete my account?',
      ],
    },
    {
      icon: <Camera size={20} color={theme.colors.info} />,
      title: 'Posts & Shorts',
      articles: [
        'How do I create a post?',
        'How do I upload a short?',
        'Why isn\'t my short showing up?',
        'How do I archive a post?',
      ],
    },
    {
      icon: <MessageCircle size={20} color={theme.colors.success} />,
      title: 'Messaging',
      articles: [
        'How do I start a conversation?',
        'Can I send images in chat?',
        'How do I block someone?',
        'How do I report a message?',
      ],
    },
    {
      icon: <Bell size={20} color={theme.colors.warning} />,
      title: 'Notifications',
      articles: [
        'How do I manage notifications?',
        'Why am I not receiving notifications?',
        'How do I mute notifications?',
      ],
    },
    {
      icon: <Shield size={20} color={theme.colors.error} />,
      title: 'Privacy & Safety',
      articles: [
        'How do I make my account private?',
        'How do I report abuse?',
        'How do I block or restrict someone?',
        'What data does the app collect?',
      ],
    },
  ];

  const filteredCategories = searchQuery.trim()
    ? categories.map((cat) => ({
        ...cat,
        articles: cat.articles.filter((a) => a.toLowerCase().includes(searchQuery.toLowerCase())),
      })).filter((cat) => cat.articles.length > 0)
    : categories;

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Help Centre',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroSection}>
          <BookOpen size={40} color={theme.colors.accent} />
          <Text style={s.heroTitle}>How can we help?</Text>
        </View>

        <View style={s.searchContainer}>
          <Search size={16} color={theme.colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search help articles..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredCategories.map((cat, catIdx) => (
          <View key={catIdx} style={s.categoryCard}>
            <TouchableOpacity
              style={s.categoryHeader}
              onPress={() => setExpandedIdx(expandedIdx === catIdx ? null : catIdx)}
              activeOpacity={0.7}
            >
              <View style={s.categoryIcon}>{cat.icon}</View>
              <Text style={s.categoryTitle}>{cat.title}</Text>
              <ChevronRight
                size={16}
                color={theme.colors.textTertiary}
                style={{ transform: [{ rotate: expandedIdx === catIdx ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {expandedIdx === catIdx && (
              <View style={s.articlesList}>
                {cat.articles.map((article, aIdx) => (
                  <TouchableOpacity key={aIdx} style={s.articleRow} activeOpacity={0.6}>
                    <Text style={s.articleText}>{article}</Text>
                    <ChevronRight size={14} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {filteredCategories.length === 0 && (
          <View style={s.noResults}>
            <Text style={s.noResultsText}>No articles found for "{searchQuery}"</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, gap: 10 },
  heroTitle: { fontSize: 22, fontWeight: '700' as const, color: theme.colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceElevated, borderRadius: 10, marginHorizontal: 16, marginBottom: 20, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  categoryCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderLight, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
  categoryIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: theme.colors.text },
  articlesList: { borderTopWidth: 0.5, borderTopColor: theme.colors.borderLight },
  articleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, paddingLeft: 58 },
  articleText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary },
  noResults: { alignItems: 'center', paddingTop: 40 },
  noResultsText: { fontSize: 14, color: theme.colors.textTertiary },
});
