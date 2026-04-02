import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SavedProvider } from "@/contexts/SavedContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { QuickNavProvider } from "@/contexts/QuickNavContext";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
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
      <Stack.Screen name="ai-assistant" options={{ title: 'AI Assistant' }} />
      <Stack.Screen name="customize-tabs" options={{ title: 'Customize Quick Access' }} />
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
      <Stack.Screen name="short-viewer" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="edit-name" options={{ title: 'Name' }} />
      <Stack.Screen name="edit-bio" options={{ title: 'Bio' }} />
      <Stack.Screen name="edit-username" options={{ title: 'Username' }} />
      <Stack.Screen name="edit-pronouns" options={{ title: 'Pronouns' }} />
      <Stack.Screen name="edit-gender" options={{ title: 'Gender' }} />
      <Stack.Screen name="new-message" options={{ title: 'New Message' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="archive" options={{ title: 'Archive' }} />
      <Stack.Screen name="your-activity" options={{ title: 'Your Activity' }} />
      <Stack.Screen name="time-spent" options={{ title: 'Time Spent' }} />
      <Stack.Screen name="account-privacy" options={{ title: 'Account Privacy' }} />
      <Stack.Screen name="close-friends" options={{ title: 'Close Friends' }} />
      <Stack.Screen name="blocked-accounts" options={{ title: 'Blocked' }} />
      <Stack.Screen name="tags-mentions" options={{ title: 'Tags and Mentions' }} />
      <Stack.Screen name="comments-settings" options={{ title: 'Comments' }} />
      <Stack.Screen name="sharing-settings" options={{ title: 'Sharing' }} />
      <Stack.Screen name="restricted-accounts" options={{ title: 'Restricted' }} />
      <Stack.Screen name="limit-interactions" options={{ title: 'Limit Interactions' }} />
      <Stack.Screen name="hidden-words" options={{ title: 'Hidden Words' }} />
      <Stack.Screen name="follow-invite" options={{ title: 'Follow and Invite' }} />
      <Stack.Screen name="favourites" options={{ title: 'Favourites' }} />
      <Stack.Screen name="muted-accounts" options={{ title: 'Muted Accounts' }} />
      <Stack.Screen name="suggested-content" options={{ title: 'Suggested Content' }} />
      <Stack.Screen name="like-share-counts" options={{ title: 'Like and Share Counts' }} />
      <Stack.Screen name="device-permissions" options={{ title: 'Device Permissions' }} />
      <Stack.Screen name="archiving-downloading" options={{ title: 'Archiving and Downloading' }} />
      <Stack.Screen name="accessibility-settings" options={{ title: 'Accessibility' }} />
      <Stack.Screen name="language-settings" options={{ title: 'Language' }} />
      <Stack.Screen name="data-usage" options={{ title: 'Data Usage' }} />
      <Stack.Screen name="website-permissions" options={{ title: 'Website Permissions' }} />
      <Stack.Screen name="help" options={{ title: 'Help' }} />
      <Stack.Screen name="privacy-security-help" options={{ title: 'Privacy & Security Help' }} />
      <Stack.Screen name="account-status" options={{ title: 'Account Status' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="about-church" options={{ title: 'About This Church' }} />
      <Stack.Screen name="activity-interactions" options={{ title: 'Interactions' }} />
      <Stack.Screen name="activity-comments" options={{ title: 'Your Comments' }} />
      <Stack.Screen name="activity-content-viewed" options={{ title: 'Content Viewed' }} />
      <Stack.Screen name="activity-recently-deleted" options={{ title: 'Recently Deleted' }} />
      <Stack.Screen name="archive-posts" options={{ title: 'Archived Posts' }} />
      <Stack.Screen name="archive-shorts" options={{ title: 'Archived Shorts' }} />
      <Stack.Screen name="archive-stories" options={{ title: 'Archived Stories' }} />
      <Stack.Screen name="help-centre" options={{ title: 'Help Centre' }} />
      <Stack.Screen name="support-requests" options={{ title: 'Support Requests' }} />
      <Stack.Screen name="report-problem" options={{ title: 'Report a Problem' }} />
      <Stack.Screen name="terms-of-service" options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="security-tips" options={{ title: 'Account Security' }} />
      <Stack.Screen name="privacy-checkup" options={{ title: 'Privacy Checkup' }} />
      <Stack.Screen name="report-abuse" options={{ title: 'Report Abuse' }} />
      <Stack.Screen name="hacked-account" options={{ title: 'Hacked Account' }} />
      <Stack.Screen name="active-sessions" options={{ title: 'Active Sessions' }} />
      <Stack.Screen name="security-checkup" options={{ title: 'Security Checkup' }} />
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
        <ThemeProvider>
          <AuthProvider>
            <SavedProvider>
              <QuickNavProvider>
                <RootLayoutNav />
              </QuickNavProvider>
            </SavedProvider>
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

// Live reload trigger
