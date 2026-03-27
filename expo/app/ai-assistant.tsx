import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Send, Sparkles, Bot } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRorkAgent } from '@rork-ai/toolkit-sdk';
import { useTheme } from '@/contexts/ThemeContext';
import type { AppTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function AIAssistantScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { messages, sendMessage } = useRorkAgent({
    tools: {},
  });

  const displayMessages: DisplayMessage[] = [];
  for (const m of messages) {
    for (const part of m.parts) {
      if (part.type === 'text' && part.text.trim()) {
        displayMessages.push({
          id: `${m.id}-${displayMessages.length}`,
          role: m.role as 'user' | 'assistant',
          text: part.text,
        });
      }
    }
  }

  const isStreaming = messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].parts.some(
      (p) => p.type === 'text' && p.text === ''
    );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    sendMessage(trimmed);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [input, sendMessage]);

  const userInitials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const renderItem = useCallback(({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}>
        {!isUser && (
          <View style={styles.avatarBot}>
            <Bot size={16} color={theme.colors.accent} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
        </View>
        {isUser && (
          <View style={styles.avatarUser}>
            <Text style={styles.avatarUserText}>{userInitials}</Text>
          </View>
        )}
      </View>
    );
  }, [styles, theme, userInitials]);

  const suggestions = [
    "Where can I find verses about peace?",
    "What did the pastor preach last Sunday?",
    "How do I join a small group?",
    "Explain Romans 8:28",
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AI Assistant',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, displayMessages.length === 0 && styles.listContentEmpty]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Sparkles size={36} color={theme.colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>Church AI Assistant</Text>
              <Text style={styles.emptyDesc}>
                Ask me anything about the Bible, sermons, church events, or finding specific scripture passages.
              </Text>
              <View style={styles.suggestionsWrap}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setInput(s);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isStreaming ? (
              <View style={styles.typingRow}>
                <View style={styles.avatarBot}>
                  <Bot size={16} color={theme.colors.accent} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim()}
              activeOpacity={0.7}
              testID="ai-send-button"
            >
              <Send size={18} color={input.trim() ? theme.colors.white : theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  suggestionsWrap: {
    width: '100%',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  messageBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUserText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: theme.colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.textInverse,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: theme.colors.background,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderLight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.surfaceElevated,
  },
});
