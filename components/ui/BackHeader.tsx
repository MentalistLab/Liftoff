import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Text } from './Text';

export function BackHeader({ title, label = 'Zurück' }: { title: string; label?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} accessibilityRole="button" accessibilityLabel={label} hitSlop={12}
        style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
        <Text variant="h1" color={colors.text}>‹</Text>
      </Pressable>
      <Text variant="h1" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
    </View>
  );
}
