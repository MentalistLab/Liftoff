// Kristo – das Ascend-Maskottchen: ein Kristall-Wesen in der Farbe deines Rangs.
// Stimmungen: happy (Startklar), focus (Training), cheer (Jubel), sleepy (Streak verloren).
import React, { useEffect, useId } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
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

  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gBody = `kb${uid}`, gTop = `kt${uid}`, gGlow = `kg${uid}`;
  const outline = shade(color, -0.55);

  return (
    <Animated.View style={[{ width: size, height: size * 1.1 }, bob]} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
        <Defs>
          <LinearGradient id={gBody} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.45" stopColor={color} />
            <Stop offset="1" stopColor={dark} />
          </LinearGradient>
          <LinearGradient id={gTop} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset="1" stopColor={light} />
          </LinearGradient>
          <RadialGradient id={gGlow} cx="50%" cy="48%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Schein und Schatten */}
        <Circle cx={100} cy={104} r={98} fill={`url(#${gGlow})`} />
        <Ellipse cx={100} cy={207} rx={54} ry={8} fill="#000000" fillOpacity={0.35} />

        {/* schwebende Splitter */}
        {pose !== 'sleepy' ? (
          <G>
            <Path d="M24 70 L32 62 L36 74 L28 80 Z" fill={light} fillOpacity={0.85} />
            <Path d="M170 150 L178 144 L181 154 L174 158 Z" fill={mid} fillOpacity={0.85} />
            <Path d="M176 84 L180 80 L183 86 L179 89 Z" fill={light} fillOpacity={0.7} />
          </G>
        ) : null}

        {/* Arme (facettiert) */}
        {pose === 'cheer' ? (
          <G stroke={outline} strokeWidth={2.5} strokeLinejoin="round">
            <Path d="M46 96 L20 56 L34 50 L56 86 Z" fill={mid} />
            <Path d="M20 56 L34 50 L30 42 L16 48 Z" fill={light} />
            <Path d="M154 96 L180 56 L166 50 L144 86 Z" fill={dark} />
            <Path d="M180 56 L166 50 L170 42 L184 48 Z" fill={mid} />
          </G>
        ) : (
          <G stroke={outline} strokeWidth={2.5} strokeLinejoin="round">
            <Path d="M42 106 L18 118 L24 138 L44 128 Z" fill={mid} />
            <Path d="M18 118 L24 138 L14 136 L11 122 Z" fill={light} />
            <Path d="M158 106 L182 118 L176 138 L156 128 Z" fill={dark} />
            <Path d="M182 118 L176 138 L186 136 L189 122 Z" fill={mid} />
          </G>
        )}

        {/* Füße */}
        <G stroke={outline} strokeWidth={2.5}>
          <Rect x={68} y={176} width={24} height={22} rx={10} fill={dark} />
          <Rect x={108} y={176} width={24} height={22} rx={10} fill={dark} />
        </G>
        <Rect x={73} y={180} width={10} height={5} rx={2.5} fill={light} fillOpacity={0.6} />
        <Rect x={113} y={180} width={10} height={5} rx={2.5} fill={light} fillOpacity={0.6} />

        {/* Körper: Kristall mit Facetten */}
        <Path d="M100 14 L163 53 L163 143 L100 190 L37 143 L37 53 Z" fill={`url(#${gBody})`} stroke={outline} strokeWidth={3} strokeLinejoin="round" />
        <Path d="M100 14 L163 53 L100 78 L37 53 Z" fill={`url(#${gTop})`} />
        <Path d="M37 53 L100 78 L66 150 L37 143 Z" fill={light} fillOpacity={0.35} />
        <Path d="M163 53 L163 143 L134 150 L100 78 Z" fill={dark} fillOpacity={0.45} />
        <Path d="M66 150 L100 78 L134 150 L100 190 Z" fill={color} fillOpacity={0.25} />
        <Path d="M37 143 L66 150 L100 190 Z" fill={dark} fillOpacity={0.35} />
        <Path d="M163 143 L134 150 L100 190 Z" fill={dark} fillOpacity={0.55} />
        {/* Facettenkanten */}
        <G stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} fill="none">
          <Path d="M37 53 L100 78 L163 53" />
          <Path d="M100 78 L66 150 M100 78 L134 150" />
        </G>
        {/* Glanzlichter */}
        <Path d="M100 14 L120 26 L100 33 L80 26 Z" fill="#FFFFFF" fillOpacity={0.7} />
        <Path d="M48 62 L56 66 L50 96 L44 92 Z" fill="#FFFFFF" fillOpacity={0.35} />
        <Circle cx={148} cy={66} r={3} fill="#FFFFFF" fillOpacity={0.7} />

        {/* Wangen */}
        {pose !== 'focus' ? (
          <G>
            <Ellipse cx={68} cy={128} rx={9} ry={5} fill="#FF7A9A" fillOpacity={0.45} />
            <Ellipse cx={132} cy={128} rx={9} ry={5} fill="#FF7A9A" fillOpacity={0.45} />
          </G>
        ) : null}

        {pose === 'happy' ? (
          <G>
            <Path d="M70 94 Q80 89 90 94" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <Path d="M110 94 Q120 89 130 94" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <Ellipse cx={80} cy={112} rx={10} ry={13} fill={INK} />
            <Ellipse cx={120} cy={112} rx={10} ry={13} fill={INK} />
            <Circle cx={84} cy={106} r={3.6} fill="#FFFFFF" />
            <Circle cx={124} cy={106} r={3.6} fill="#FFFFFF" />
            <Circle cx={77} cy={118} r={1.8} fill="#FFFFFF" fillOpacity={0.8} />
            <Circle cx={117} cy={118} r={1.8} fill="#FFFFFF" fillOpacity={0.8} />
            <Path d="M86 136 Q100 150 114 136" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
          </G>
        ) : null}
        {pose === 'cheer' ? (
          <G>
            <Path d="M68 116 Q80 98 92 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M108 116 Q120 98 132 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M84 132 Q100 160 116 132 Z" fill={INK} />
            <Path d="M92 145 Q100 152 108 145 Q100 140 92 145 Z" fill="#FF7A9A" />
            <Path d="M22 34 l4 -11 l4 11 l11 4 l-11 4 l-4 11 l-4 -11 l-11 -4 Z" fill="#FFFFFF" fillOpacity={0.9} />
            <Path d="M172 28 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" fill="#FFFFFF" fillOpacity={0.9} />
          </G>
        ) : null}
        {pose === 'sleepy' ? (
          <G>
            <Path d="M68 116 Q80 124 92 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M108 116 Q120 124 132 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M92 142 Q100 138 108 142" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />
            <Path d="M150 30 h14 l-14 16 h14" stroke={light} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M172 10 h9 l-9 10 h9" stroke={light} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </G>
        ) : null}
        {pose === 'focus' ? (
          <G>
            <Path d="M66 98 L92 106" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
            <Path d="M134 98 L108 106" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
            <Ellipse cx={80} cy={117} rx={8} ry={9} fill={INK} />
            <Ellipse cx={120} cy={117} rx={8} ry={9} fill={INK} />
            <Circle cx={83} cy={114} r={2.6} fill="#FFFFFF" />
            <Circle cx={123} cy={114} r={2.6} fill="#FFFFFF" />
            <Path d="M88 140 Q100 136 112 140" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            <Path d="M146 76 Q152 86 146 92 Q140 86 146 76 Z" fill="#8FD8FF" />
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}
