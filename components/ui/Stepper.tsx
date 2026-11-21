// Großer Zahlenwähler mit +/− (gedrückt halten = schneller).
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { colors, radius, space } from '../../theme';
import { Text } from './Text';

export function Stepper({ value, onChange, min, max, step = 1, unit, label, big = true }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
  unit?: string; label: string; big?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const valRef = useRef(value);
  valRef.current = value;
  const clamp = (v: number) => Math.round(Math.max(min, Math.min(max, v)) * 100) / 100;
  const bump = (dir: 1 | -1) => {
    const next = clamp(valRef.current + dir * step);
    if (next !== valRef.current) { valRef.current = next; onChange(next); Haptics.selectionAsync(); }
  };
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  const btn = (dir: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${dir > 0 ? '+' : '−'}${step}`}
      onPress={() => bump(dir)}
      onLongPress={() => { timer.current = setInterval(() => bump(dir), 70); }}
      onPressOut={stop}
      style={({ pressed }) => ({ width: big ? 64 : 44, height: big ? 64 : 44, borderRadius: radius.full, backgroundColor: pressed ? colors.border : colors.surface2, alignItems: 'center', justifyContent: 'center' })}
    >
      <Text variant={big ? 'h1' : 'h3'}>{dir > 0 ? '+' : '−'}</Text>
    </Pressable>
  );
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: `${value} ${unit ?? ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => bump(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[4] }}>
      {btn(-1)}
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text variant={big ? 'display' : 'h2'} tabular>{Number.isInteger(value) ? value : value.toFixed(1)}</Text>
        {unit ? <Text variant="caption" color={colors.textSecondary}>{unit}</Text> : null}
      </View>
      {btn(1)}
    </View>
  );
}
