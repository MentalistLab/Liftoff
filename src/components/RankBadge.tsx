import React from 'react';
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { rankColors } from '@/theme';
import { Rank, rankName } from '@/lib/ranking';

/** Eigenes Schild-Emblem: Farbe = Stufe, Balken unten = Division (I–III). */
export function RankBadge({ rank, size = 96 }: { rank: Rank | null; size?: number }) {
  const tier = rank?.tier ?? 1;
  const color = rank ? rankColors[tier - 1] : '#2A2F3F';
  const id = `g${tier}${rank ? 'r' : 'n'}`;
  const h = size * 1.15;
  return (
    <Svg
      width={size}
      height={h}
      viewBox="0 0 100 115"
      accessibilityLabel={rank ? `Rang ${rankName(rank)}` : 'Noch kein Rang'}
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="0.45" />
        </LinearGradient>
      </Defs>
      {/* Schild */}
      <Path d="M50 4 L92 20 L92 58 C92 82 74 98 50 108 C26 98 8 82 8 58 L8 20 Z" fill={`url(#${id})`} stroke={color} strokeWidth={3} />
      <Path d="M50 14 L82 26 L82 57 C82 76 68 89 50 97 C32 89 18 76 18 57 L18 26 Z" fill="#0B0D12" fillOpacity={0.55} />
      {/* Kristall: je höher die Stufe, desto mehr Facetten */}
      <Polygon points="50,30 68,52 50,78 32,52" fill={color} fillOpacity={0.9} />
      {tier >= 3 && <Polygon points="50,30 59,52 50,78 41,52" fill="#fff" fillOpacity={0.25} />}
      {tier >= 5 && <Polygon points="32,52 68,52 50,58" fill="#fff" fillOpacity={0.2} />}
      {tier >= 7 && (
        <>
          <Polygon points="50,18 54,26 46,26" fill={color} />
          <Polygon points="24,44 30,48 24,52" fill={color} />
          <Polygon points="76,44 70,48 76,52" fill={color} />
        </>
      )}
      {/* Division */}
      {rank &&
        Array.from({ length: 3 }).map((_, i) => (
          <Rect
            key={i}
            x={34 + i * 13}
            y={84}
            width={9}
            height={4}
            rx={2}
            fill={i < rank.division ? '#fff' : '#ffffff40'}
          />
        ))}
    </Svg>
  );
}
