import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme';

const PALETTE = [colors.primary, colors.accent, colors.warning, colors.success, colors.danger, '#B05CFF'];

function Piece({ x, delay, color, w, h, drift, spin, height }: { x: number; delay: number; color: string; w: number; h: number; drift: number; spin: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(delay, withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) })); }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - Math.max(0, t.value - 0.75) * 4,
    transform: [
      { translateX: x + drift * t.value },
      { translateY: -40 + t.value * (height + 80) },
      { rotate: `${spin * t.value}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: w, height: h, borderRadius: 2, backgroundColor: color }, style]} />;
}

/** Konfetti-Regen über den ganzen Screen; nimmt keine Touches an. */
export function Confetti({ count = 70 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width, delay: Math.random() * 500, color: PALETTE[i % PALETTE.length],
    w: 6 + Math.random() * 6, h: 10 + Math.random() * 8, drift: (Math.random() - 0.5) * 160, spin: (Math.random() - 0.5) * 900,
  })), [count, width]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => <Piece key={i} {...p} height={height} />)}
    </View>
  );
}
