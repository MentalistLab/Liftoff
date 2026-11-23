import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="workout/active" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="workout/summary" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
