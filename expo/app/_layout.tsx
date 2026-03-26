import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SavedProvider } from "@/contexts/SavedContext";
import { theme } from "@/constants/theme";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'welcome' || segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'onboard';

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[Nav] Not authenticated, redirecting to welcome');
      router.replace('/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[Nav] Authenticated, redirecting to home');
      router.replace('/(tabs)/(home)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="onboard" options={{ headerShown: false }} />
      <Stack.Screen name="create-post" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="sermon-player" options={{ title: 'Sermon' }} />
      <Stack.Screen name="event-detail" options={{ title: 'Event' }} />
      <Stack.Screen name="prayer-detail" options={{ title: 'Prayer Request' }} />
      <Stack.Screen name="bible" options={{ title: 'Bible' }} />
      <Stack.Screen name="giving" options={{ title: 'Giving' }} />
      <Stack.Screen name="groups" options={{ title: 'Groups' }} />
      <Stack.Screen name="group-detail" options={{ title: 'Group' }} />
      <Stack.Screen name="chat" options={{ title: 'Fellowship Chat' }} />
      <Stack.Screen name="chat-room" options={{ title: 'Chat' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="user-profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="followers-list" options={{ title: 'Connections' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
      <Stack.Screen name="password-security" options={{ title: 'Password & Security' }} />
      <Stack.Screen name="payment-methods" options={{ title: 'Payment Methods' }} />
      <Stack.Screen name="add-card" options={{ presentation: 'modal', title: 'Add Card' }} />
      <Stack.Screen name="orders-payments" options={{ title: 'Orders & Payments' }} />
      <Stack.Screen name="admin-members" options={{ title: 'Members' }} />
      <Stack.Screen name="admin-member-detail" options={{ title: 'Member Detail' }} />
      <Stack.Screen name="admin-events" options={{ title: 'Manage Events' }} />
      <Stack.Screen name="admin-prayers" options={{ title: 'Prayer Moderation' }} />
      <Stack.Screen name="admin-finance" options={{ title: 'Giving & Finance' }} />
      <Stack.Screen name="admin-groups" options={{ title: 'Manage Groups' }} />
      <Stack.Screen name="admin-analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="admin-announcements" options={{ title: 'Announcements' }} />
      <Stack.Screen name="admin-sermons" options={{ title: 'Sermons & Services' }} />
      <Stack.Screen name="admin-settings" options={{ title: 'Church Settings' }} />
      <Stack.Screen name="saved-posts" options={{ title: 'Saved' }} />
      <Stack.Screen name="edit-name" options={{ title: 'Name' }} />
      <Stack.Screen name="edit-bio" options={{ title: 'Bio' }} />
      <Stack.Screen name="edit-username" options={{ title: 'Username' }} />
      <Stack.Screen name="edit-pronouns" options={{ title: 'Pronouns' }} />
      <Stack.Screen name="edit-gender" options={{ title: 'Gender' }} />
      <Stack.Screen name="new-message" options={{ title: 'New Message' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SavedProvider>
            <RootLayoutNav />
          </SavedProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
