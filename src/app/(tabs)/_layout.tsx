import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { useStore } from '@/store/useStore';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName, focused: IconName) => ({ color, focused: f }: { color: ColorValue; focused: boolean }) =>
  <Ionicons name={f ? focused : name} size={24} color={color as string} />;

export default function TabsLayout() {
  const onboarded = useStore((s) => s.profile !== null);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="train" options={{ title: 'Training', tabBarIcon: icon('barbell-outline', 'barbell') }} />
      <Tabs.Screen name="ranks" options={{ title: 'Ränge', tabBarIcon: icon('trophy-outline', 'trophy') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
