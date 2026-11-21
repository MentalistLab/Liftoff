// Originelles Rang-Emblem: sechseckiger Kristall in Rang-Farbe, Division als Balken.
import React from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { DIVISION_LABELS, TIER_NAMES } from '../../lib/ranking';
import { colors } from '../../theme';

export function RankBadge({ tier, division, size = 48, lang = 'de' }: { tier: number; division: number; size?: number; lang?: 'de' | 'en' }) {
  const c = colors.tiers[tier - 1] ?? colors.tiers[0];
  const id = `rb${tier}`;
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 100 115" accessibilityLabel={`${TIER_NAMES[lang][tier - 1]} ${DIVISION_LABELS[division - 1]}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c} stopOpacity={1} />
          <Stop offset="1" stopColor={c} stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <Path d="M50 4 92 28 92 72 50 96 8 72 8 28Z" fill={`url(#${id})`} stroke={colors.text} strokeOpacity={0.25} strokeWidth={3} />
      <Path d="M50 18 78 34 78 66 50 82 22 66 22 34Z" fill={colors.bg} fillOpacity={0.35} />
      <Path d="M50 26 64 50 50 74 36 50Z" fill={c} />
      {[0, 1, 2].map((i) => (
        <Rect key={i} x={29 + i * 15} y={104} width={12} height={7} rx={2} fill={i < division ? c : colors.surface2} />
      ))}
    </Svg>
  );
}
