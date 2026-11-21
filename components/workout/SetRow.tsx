import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { SetEntry } from '../../lib/workoutSummary';
import { colors, fonts, radius, space } from '../../theme';
import { Text } from '../ui';

type Kind = 'weight' | 'reps' | 'time';

function NumInput({ value, placeholder, onChange, label, decimal }: { value: number | null; placeholder?: string; onChange: (v: number | null) => void; label: string; decimal?: boolean }) {
  return (
    <TextInput
      accessibilityLabel={label}
      value={value == null ? '' : String(value)}
      placeholder={placeholder ?? '–'}
      placeholderTextColor={colors.textTertiary}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      onChangeText={(s) => {
        const n = parseFloat(s.replace(',', '.'));
        onChange(s.trim() === '' || Number.isNaN(n) ? null : Math.max(0, Math.min(decimal ? 999 : 9999, n)));
      }}
      style={{ flex: 1, minWidth: 0, width: 0, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface2, color: colors.text, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, fontVariant: ['tabular-nums'] }}
    />
  );
}

export function SetRow({ index, set, kind, prev, onChange, onDone, onRemove, labels }: {
  index: number; set: SetEntry; kind: Kind;
  prev?: { weightKg: number | null; reps: number | null; durationS: number | null };
  onChange: (p: Partial<SetEntry>) => void; onDone: (done: boolean) => void; onRemove: () => void;
  labels: { set: string; kg: string; reps: string; sec: string; done: string };
}) {
  const scale = useSharedValue(1);
  const bg = useSharedValue(set.done ? 1 : 0);
  useEffect(() => { bg.value = withTiming(set.done ? 1 : 0, { duration: 200 }); }, [set.done, bg]);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const rowStyle = useAnimatedStyle(() => ({ backgroundColor: `rgba(43,214,123,${bg.value * 0.12})` }));
  const prevText = prev ? (kind === 'time' ? `${prev.durationS ?? '–'}s` : kind === 'reps' ? `${prev.reps ?? '–'}` : `${prev.weightKg ?? '–'}×${prev.reps ?? '–'}`) : '–';

  const toggle = () => {
    const next = !set.done;
    // Platzhalter übernehmen, wenn nichts eingetragen ist
    if (next && prev) {
      const fill: Partial<SetEntry> = {};
      if (kind === 'weight' && set.weightKg == null) fill.weightKg = prev.weightKg;
      if (kind !== 'time' && set.reps == null) fill.reps = prev.reps;
      if (kind === 'time' && set.durationS == null) fill.durationS = prev.durationS;
      if (Object.keys(fill).length) onChange(fill);
    }
    if (next) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); scale.value = withSequence(withSpring(1.3, { damping: 6 }), withSpring(1)); }
    onDone(next);
  };

  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[1], paddingHorizontal: space[1], borderRadius: radius.sm }, rowStyle]}>
      <Pressable onLongPress={onRemove} accessibilityRole="text" accessibilityHint="Lang drücken zum Entfernen" style={{ width: 28, alignItems: 'center' }}>
        <Text variant="caption" color={colors.textSecondary}>{index + 1}</Text>
      </Pressable>
      <Text variant="caption" color={colors.textTertiary} style={{ width: 56, textAlign: 'center' }} tabular>{prevText}</Text>
      {kind === 'weight' ? <NumInput decimal label={`${labels.set} ${index + 1} ${labels.kg}`} value={set.weightKg} placeholder={prev?.weightKg?.toString()} onChange={(weightKg) => onChange({ weightKg })} /> : null}
      {kind !== 'time'
        ? <NumInput label={`${labels.set} ${index + 1} ${labels.reps}`} value={set.reps} placeholder={prev?.reps?.toString()} onChange={(reps) => onChange({ reps })} />
        : <NumInput label={`${labels.set} ${index + 1} ${labels.sec}`} value={set.durationS} placeholder={prev?.durationS?.toString()} onChange={(durationS) => onChange({ durationS })} />}
      <Pressable onPress={toggle} accessibilityRole="checkbox" accessibilityState={{ checked: set.done }} accessibilityLabel={`${labels.set} ${index + 1}: ${labels.done}`} hitSlop={6}>
        <Animated.View style={[{ width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: set.done ? colors.success : colors.surface2 }, checkStyle]}>
          <Text variant="h3" color={set.done ? colors.bg : colors.textTertiary}>✓</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
