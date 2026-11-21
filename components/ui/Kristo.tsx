// Kristo – das Ascend-Maskottchen: ein Kristall-Wesen in der Farbe deines Rangs.
// Stimmungen: happy (Startklar), focus (Training), cheer (Jubel), sleepy (Streak verloren).
import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export type KristoPose = 'happy' | 'focus' | 'cheer' | 'sleepy';

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amt >= 0 ? c + (255 - c) * amt : c * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

const INK = '#0E1116';

export function Kristo({ color = colors.primary, pose = 'happy', size = 120, animated = true, label = 'Kristo' }: {
  color?: string; pose?: KristoPose; size?: number; animated?: boolean; label?: string;
}) {
  const light = shade(color, 0.45), mid = shade(color, 0.15), dark = shade(color, -0.35);
  const y = useSharedValue(0);
  useEffect(() => {
    if (!animated) return;
    const amp = pose === 'cheer' ? -10 : pose === 'sleepy' ? 2 : -4;
    const dur = pose === 'cheer' ? 380 : 1400;
    y.value = withRepeat(withSequence(withTiming(amp, { duration: dur, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: dur, easing: Easing.inOut(Easing.quad) })), -1);
  }, [animated, pose, y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size * 1.1 }, bob]} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
        <Ellipse cx={100} cy={206} rx={52} ry={8} fill="#000000" fillOpacity={0.35} />
        <Circle cx={100} cy={104} r={92} fill={color} fillOpacity={0.1} />
        {pose === 'cheer' ? (
          <G>
            <Path d="M44 96 L18 58 L30 52 L52 86 Z" fill={mid} />
            <Path d="M156 96 L182 58 L170 52 L148 86 Z" fill={dark} />
            <Path d="M22 40 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 Z" fill={light} />
            <Path d="M170 32 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" fill={light} />
          </G>
        ) : (
          <G>
            <Path d="M42 108 L20 120 L26 136 L44 128 Z" fill={mid} />
            <Path d="M158 108 L180 120 L174 136 L156 128 Z" fill={dark} />
          </G>
        )}
        <Rect x={70} y={178} width={22} height={20} rx={9} fill={dark} />
        <Rect x={108} y={178} width={22} height={20} rx={9} fill={dark} />
        <Path d="M100 16 L162 54 L162 142 L100 188 L38 142 L38 54 Z" fill={color} />
        <Path d="M100 16 L162 54 L100 76 L38 54 Z" fill={light} />
        <Path d="M38 54 L100 76 L100 188 L38 142 Z" fill={mid} />
        <Path d="M162 54 L162 142 L100 188 L100 76 Z" fill={dark} fillOpacity={0.55} />
        <Path d="M100 16 L118 27 L100 34 L82 27 Z" fill="#FFFFFF" fillOpacity={0.55} />
        {pose === 'happy' ? (
          <G>
            <Ellipse cx={80} cy={112} rx={9} ry={12} fill={INK} />
            <Ellipse cx={120} cy={112} rx={9} ry={12} fill={INK} />
            <Circle cx={83} cy={107} r={3} fill="#FFFFFF" />
            <Circle cx={123} cy={107} r={3} fill="#FFFFFF" />
            <Path d="M88 136 Q100 147 112 136" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
          </G>
        ) : null}
        {pose === 'cheer' ? (
          <G>
            <Path d="M70 114 Q80 100 90 114" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M110 114 Q120 100 130 114" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M86 132 Q100 156 114 132 Z" fill={INK} />
          </G>
        ) : null}
        {pose === 'sleepy' ? (
          <G>
            <Path d="M70 116 Q80 122 90 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M110 116 Q120 122 130 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M92 140 L108 140" stroke={INK} strokeWidth={5} strokeLinecap="round" />
            <Path d="M150 30 h14 l-14 16 h14" stroke={light} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M172 10 h9 l-9 10 h9" stroke={light} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </G>
        ) : null}
        {pose === 'focus' ? (
          <G>
            <Path d="M68 102 L92 108" stroke={INK} strokeWidth={5} strokeLinecap="round" />
            <Path d="M132 102 L108 108" stroke={INK} strokeWidth={5} strokeLinecap="round" />
            <Ellipse cx={80} cy={116} rx={7} ry={8} fill={INK} />
            <Ellipse cx={120} cy={116} rx={7} ry={8} fill={INK} />
            <Path d="M90 138 L110 138" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}
