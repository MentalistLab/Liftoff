import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius } from '../../theme';

export function ProgressBar({ value, color = colors.primary, height = 8 }: { value: number; color?: string; height?: number }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 700, easing: Easing.out(Easing.cubic) }); }, [value, v]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height, borderRadius: radius.full, backgroundColor: color }, fill]} />
    </View>
  );
}
