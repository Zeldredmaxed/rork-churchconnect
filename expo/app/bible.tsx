import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { BookOpen, Search, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { api } from '@/utils/api';
import type { BibleBook, BibleChapter } from '@/types';

type ViewMode = 'books' | 'chapters' | 'reading' | 'search';

export default function BibleScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [mode, setMode] = useState<ViewMode>('books');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchText, setSearchText] = useState('');

  const booksQuery = useQuery({
    queryKey: ['bible', 'books'],
    queryFn: () => api.get<{ data: BibleBook[] }>('/bible/books'),
  });

  const chapterQuery = useQuery({
    queryKey: ['bible', selectedBook?.name, selectedChapter],
    queryFn: () =>
      api.get<{ data: BibleChapter }>(
        `/bible/${encodeURIComponent(selectedBook?.name ?? '')}/${selectedChapter}`
      ),
    enabled: mode === 'reading' && !!selectedBook,
  });

  const searchResultsQuery = useQuery({
    queryKey: ['bible', 'search', searchQuery],
    queryFn: () => api.get<{ data: { results: { text: string; reference: string }[] } }>(
      `/bible/search?q=${encodeURIComponent(searchQuery)}`
    ),
    enabled: !!searchQuery,
  });

  const books = booksQuery.data?.data ?? [];
  const chapter = chapterQuery.data?.data;
  const searchResults = searchResultsQuery.data?.data?.results ?? [];

  const handleSelectBook = useCallback((book: BibleBook) => {
    setSelectedBook(book);
    setMode('chapters');
  }, []);

  const handleSelectChapter = useCallback((ch: number) => {
    setSelectedChapter(ch);
    setMode('reading');
  }, []);

  const handleSearch = useCallback(() => {
    if (searchText.trim()) {
      setSearchQuery(searchText.trim());
      setMode('search');
    }
  }, [searchText]);

  const handleBack = useCallback(() => {
    if (mode === 'reading') setMode('chapters');
    else if (mode === 'chapters') setMode('books');
    else if (mode === 'search') {
      setMode('books');
      setSearchQuery('');
      setSearchText('');
    }
  }, [mode]);

  const renderHeader = () => (
    <View style={styles.searchBar}>
      {mode !== 'books' && (
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
      )}
      <View style={styles.searchInputContainer}>
        <Search size={16} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search the Bible..."
          placeholderTextColor={theme.colors.textTertiary}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: mode === 'reading' && selectedBook
            ? `${selectedBook.name} ${selectedChapter}`
            : 'Bible',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      {renderHeader()}

      {mode === 'books' && (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookRow}
              onPress={() => handleSelectBook(item)}
              activeOpacity={0.6}
            >
              <BookOpen size={16} color={theme.colors.accent} />
              <Text style={styles.bookName}>{item.name}</Text>
              <Text style={styles.bookChapters}>{item.chapters} ch</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            booksQuery.isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
            ) : null
          }
          ItemSeparatorComponent={() => <View style={styles.bookDivider} />}
        />
      )}

      {mode === 'chapters' && selectedBook && (
        <ScrollView contentContainerStyle={styles.chaptersGrid}>
          <Text style={styles.bookTitle}>{selectedBook.name}</Text>
          <View style={styles.chaptersRow}>
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
              <TouchableOpacity
                key={ch}
                style={styles.chapterBtn}
                onPress={() => handleSelectChapter(ch)}
                activeOpacity={0.6}
              >
                <Text style={styles.chapterNum}>{ch}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {mode === 'reading' && (
        <ScrollView contentContainerStyle={styles.readingContent}>
          {chapterQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
          ) : (
            chapter?.verses.map((v) => (
              <Text key={v.verse} style={styles.verseText}>
                <Text style={styles.verseNum}>{v.verse} </Text>
                {v.text}
              </Text>
            ))
          )}
        </ScrollView>
      )}

      {mode === 'search' && (
        <FlatList
          data={searchResults}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.searchResult}>
              <Text style={styles.searchRef}>{item.reference}</Text>
              <Text style={styles.searchResultText}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchResultsQuery.isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
            ) : (
              <Text style={styles.noResults}>No results found</Text>
            )
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
  },
  listContent: {
    paddingBottom: 40,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: theme.colors.text,
    flex: 1,
  },
  bookChapters: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  bookDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 44,
  },
  chaptersGrid: {
    padding: 16,
    paddingBottom: 40,
  },
  bookTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 16,
  },
  chaptersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chapterBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNum: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  readingContent: {
    padding: 20,
    paddingBottom: 60,
  },
  verseText: {
    fontSize: 17,
    color: theme.colors.text,
    lineHeight: 30,
    marginBottom: 4,
  },
  verseNum: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: theme.colors.accent,
  },
  searchResult: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchRef: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.accent,
    marginBottom: 4,
  },
  searchResultText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 15,
    color: theme.colors.textTertiary,
    marginTop: 40,
  },
});

