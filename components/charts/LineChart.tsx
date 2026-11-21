// Schlanker Linien-Chart mit react-native-svg (Expo-Go-tauglich, keine Zusatz-Library).
import React, { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { Text } from '../ui';

export interface Point { t: number; value: number }

export function LineChart({ data, color = colors.primary, unit = '', height = 160, emptyText }: {
  data: Point[]; color?: string; unit?: string; height?: number; emptyText: string;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  if (data.length === 0) return <View style={{ height, justifyContent: 'center' }}><Text variant="caption" color={colors.textTertiary}>{emptyText}</Text></View>;

  const pad = { l: 36, r: 12, t: 12, b: 20 };
  const vals = data.map((d) => d.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 1; max += 1; }
  const span = max - min; min -= span * 0.1; max += span * 0.1;
  const t0 = data[0].t, t1 = data[data.length - 1].t || t0 + 1;
  const x = (t: number) => pad.l + (data.length === 1 ? (w - pad.l - pad.r) / 2 : ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(t1).toFixed(1)} ${height - pad.b} L${x(t0).toFixed(1)} ${height - pad.b} Z`;
  const last = data[data.length - 1];
  const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(1));
  const ticks = [max - (max - min) * 0.1, (max + min) / 2, min + (max - min) * 0.1];
  const gid = `g${color.replace('#', '')}`;

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityLabel={`${data.length} ${unit}: ${data.map((d) => fmt(d.value)).join(', ')}`}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((v) => (
            <React.Fragment key={v}>
              <Line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke={colors.border} strokeDasharray="3 4" />
              <SvgText x={pad.l - 6} y={y(v) + 4} fill={colors.textTertiary} fontSize={10} fontFamily={fonts.medium} textAnchor="end">{fmt(v)}</SvgText>
            </React.Fragment>
          ))}
          {data.length > 1 ? <Path d={area} fill={`url(#${gid})`} /> : null}
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={x(last.t)} cy={y(last.value)} r={5} fill={color} stroke={colors.bg} strokeWidth={2} />
          <SvgText x={Math.min(x(last.t), w - pad.r - 2)} y={Math.max(12, y(last.value) - 10)} fill={colors.text} fontSize={12} fontFamily={fonts.semibold} textAnchor="end">{fmt(last.value)} {unit}</SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
