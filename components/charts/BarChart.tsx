import React, { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../../theme';

export function BarChart({ data, color = colors.accent, height = 150, highlightLast = true }: {
  data: { label: string; value: number }[]; color?: string; height?: number; highlightLast?: boolean;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const max = Math.max(1, ...data.map((d) => d.value));
  const padB = 18, padT = 16, gap = 8;
  const bw = data.length ? (w - gap * (data.length - 1)) / data.length : 0;
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}`);
  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityLabel={data.map((d) => `${d.label}: ${fmt(d.value)}`).join(', ')}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, (d.value / max) * (height - padB - padT)) : 2;
            const xx = i * (bw + gap), yy = height - padB - h;
            const isLast = highlightLast && i === data.length - 1;
            return (
              <React.Fragment key={i}>
                <Rect x={xx} y={yy} width={bw} height={h} rx={4} fill={d.value > 0 ? color : colors.surface2} opacity={isLast || !highlightLast ? 1 : 0.55} />
                {d.value > 0 ? <SvgText x={xx + bw / 2} y={yy - 4} fill={colors.textSecondary} fontSize={9} fontFamily={fonts.medium} textAnchor="middle">{fmt(d.value)}</SvgText> : null}
                <SvgText x={xx + bw / 2} y={height - 4} fill={colors.textTertiary} fontSize={10} fontFamily={fonts.medium} textAnchor="middle">{d.label}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
