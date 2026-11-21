import React from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '../../theme';
import { Text } from './Text';

export function Screen({ title, children, scroll = true, style }: ViewProps & { title?: string; scroll?: boolean }) {
  const body = (
    <View style={[{ padding: space[4], gap: space[4] }, style]}>
      {title ? <Text variant="h1" accessibilityRole="header">{title}</Text> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? <ScrollView contentContainerStyle={{ paddingBottom: space[10] }}>{body}</ScrollView> : body}
    </SafeAreaView>
  );
}
