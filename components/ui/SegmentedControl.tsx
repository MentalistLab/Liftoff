import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, View } from 'react-native';
import { colors, radius, space } from '../../theme';
import { Text } from './Text';

export function SegmentedControl<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: space[1] }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => { if (!active) { Haptics.selectionAsync(); onChange(o.value); } }}
            style={{ flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: active ? colors.primary : 'transparent' }}
          >
            <Text variant="caption" color={active ? colors.onPrimary : colors.textSecondary}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
