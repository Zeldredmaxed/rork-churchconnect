import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';

export default function ExploreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="search"
        options={{
          animation: 'fade',
        }}
      />
    </Stack>
  );
}
