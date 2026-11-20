// Muskelkarte: Körpersilhouette (Mann/Frau, vorne/hinten) mit Muskelflächen in Rang-Farbe.
// Ebenen: dunkle Silhouette (PNG) → einfärbbare SVG-Pfade → Linien (PNG) darüber.
// Läuft in Expo Go (react-native-svg ist dort enthalten).
import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Image as SvgImage, Path } from 'react-native-svg';
import type { Gender, Muscle } from '../../lib/standards';
import { MUSCLE_NAMES } from '../../lib/standards';
import { rankLabel } from '../../lib/ranking';
import {
  BODY_IMAGE_SIZE, muscleFill, musclePaths, viewBoxFor, viewBoxString,
  type MuscleMapView, type MuscleScores,
} from '../../lib/muscleMapView';

const BODY_BASE = require('../../assets/body/body-base.png');
const BODY_LINES = require('../../assets/body/body-lines.png');

export interface MuscleMapProps {
  gender: Gender;
  /** Muskel-Score 0–100 je Gruppe; fehlend/null = noch kein Rang (ungefärbt). */
  scores: MuscleScores;
  view?: MuscleMapView;
  /** Hervorgehobener Muskel (z. B. nach Tap); andere werden abgedunkelt. */
  selected?: Muscle | null;
  onPressMuscle?: (muscle: Muscle) => void;
  /** Breite in px; Höhe ergibt sich aus dem Seitenverhältnis. */
  width?: number;
  lang?: 'de' | 'en';
  style?: StyleProp<ViewStyle>;
}

function MuscleMapImpl({
  gender, scores, view = 'both', selected = null, onPressMuscle, width = 320, lang = 'de', style,
}: MuscleMapProps) {
  const vb = viewBoxFor(gender, view);
  const height = (width * vb.height) / vb.width;
  const unranked = lang === 'de' ? 'noch kein Rang' : 'not ranked yet';

  const summary = musclePaths(gender)
    .map(({ muscle }) => {
      const f = muscleFill(scores[muscle]);
      const rank = f.tier ? rankLabel({ tier: f.tier, division: f.division! }, lang) : unranked;
      return `${MUSCLE_NAMES[muscle][lang]}: ${rank}`;
    })
    .join(', ');

  return (
    <View
      style={[styles.root, { width, height }, style]}
      accessible={!onPressMuscle}
      accessibilityRole="image"
      accessibilityLabel={(lang === 'de' ? 'Muskelkarte. ' : 'Muscle map. ') + summary}
    >
      <Svg width={width} height={height} viewBox={viewBoxString(gender, view)}>
        <SvgImage href={BODY_BASE} x={0} y={0} width={BODY_IMAGE_SIZE.width} height={BODY_IMAGE_SIZE.height} />
        <G>
          {musclePaths(gender).map(({ muscle, d }) => {
            const f = muscleFill(scores[muscle]);
            const dimmed = selected != null && selected !== muscle;
            const isSel = selected === muscle;
            return (
              <Path
                key={muscle}
                d={d}
                fill={f.color ?? '#FFFFFF'}
                fillOpacity={f.color ? (dimmed ? f.opacity * 0.35 : f.opacity) : isSel ? 0.15 : 0}
                stroke={isSel ? (f.color ?? '#FFFFFF') : 'none'}
                strokeWidth={isSel ? 3 : 0}
                onPress={onPressMuscle ? () => onPressMuscle(muscle) : undefined}
                accessibilityLabel={`${MUSCLE_NAMES[muscle][lang]}: ${f.tier ? rankLabel({ tier: f.tier, division: f.division! }, lang) : unranked}`}
              />
            );
          })}
        </G>
        <SvgImage
          href={BODY_LINES} x={0} y={0} width={BODY_IMAGE_SIZE.width} height={BODY_IMAGE_SIZE.height}
          pointerEvents="none"
        />
      </Svg>
    </View>
  );
}

export const MuscleMap = memo(MuscleMapImpl);

const styles = StyleSheet.create({ root: { alignSelf: 'center' } });
