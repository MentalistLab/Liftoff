import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';

// Eigene Line-Icons, 24 px, 1.75 Stroke.
const ICONS = {
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  train: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12',
  ranks: 'M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z M9 12l2 2 4-4',
  social: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.8c1.8.7 3 2.5 3.5 5.2',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1-4 4.2-6.5 8-6.5s7 2.5 8 6.5',
} as const;

function Icon({ name, color }: { name: keyof typeof ICONS; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d={ICONS[name]} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const tab = (name: keyof typeof ICONS) => ({
    title: t(`tabs.${name}`),
    tabBarIcon: ({ color }: { color: unknown }) => <Icon name={name} color={String(color)} />,
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={tab('home')} />
      <Tabs.Screen name="train" options={tab('train')} />
      <Tabs.Screen name="ranks" options={tab('ranks')} />
      <Tabs.Screen name="social" options={tab('social')} />
      <Tabs.Screen name="profile" options={tab('profile')} />
    </Tabs>
  );
}
