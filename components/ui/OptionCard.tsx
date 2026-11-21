import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, radius, space } from '../../theme';
import { Text } from './Text';

export function OptionCard({ title, subtitle, emoji, selected, onPress, compact }: {
  title: string; subtitle?: string; emoji?: string; selected: boolean; onPress: () => void; compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: space[3],
        minHeight: compact ? 52 : 72, padding: space[4], borderRadius: radius.lg, borderWidth: 2,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {emoji ? <Text variant="h2">{emoji}</Text> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="h3">{title}</Text>
        {subtitle ? <Text variant="caption" color={colors.textSecondary}>{subtitle}</Text> : null}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: radius.full, borderWidth: 2, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.primary }} /> : null}
      </View>
    </Pressable>
  );
}
