// Pausen-Timer als Bottom-Sheet: läuft über Endzeit (robust gegen Hintergrund), ±15 s, Haptik am Ende.
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { formatDuration } from '../../lib/workoutSummary';
import { colors, radius, shadow, space } from '../../theme';
import { Button, Text } from '../ui';

export function RestTimer({ endsAt, total, onAdjust, onClose, labels }: {
  endsAt: number; total: number; onAdjust: (deltaS: number) => void; onClose: () => void;
  labels: { rest: string; skip: string };
}) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    if (left === 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); const id = setTimeout(onClose, 800); return () => clearTimeout(id); }
  }, [left, onClose]);

  const R = 52, C = 2 * Math.PI * R, frac = total > 0 ? left / total : 0;
  return (
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown}
      accessibilityLiveRegion="polite"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + space[4], padding: space[5], gap: space[4], alignItems: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.border }, shadow.card]}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
      <Text variant="overline" color={colors.textSecondary}>{labels.rest}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={128} height={128} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={64} cy={64} r={R} stroke={colors.surface2} strokeWidth={8} fill="none" />
          <Circle cx={64} cy={64} r={R} stroke={colors.accent} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - frac)} />
        </Svg>
        <Text variant="h1" tabular style={{ position: 'absolute' }} accessibilityLabel={`${left}`}>{formatDuration(left)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space[3], alignSelf: 'stretch' }}>
        {[-15, 15].map((d) => (
          <Pressable key={d} onPress={() => onAdjust(d)} accessibilityRole="button" accessibilityLabel={`${d > 0 ? '+' : '−'}15 s`}
            style={{ flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="h3">{d > 0 ? '+15 s' : '−15 s'}</Text>
          </Pressable>
        ))}
      </View>
      <Button label={labels.skip} variant="ghost" onPress={onClose} style={{ alignSelf: 'stretch' }} />
    </Animated.View>
  );
}
