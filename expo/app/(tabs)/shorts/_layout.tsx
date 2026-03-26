import React from 'react';
import { Stack } from 'expo-router';

export default function ShortsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
