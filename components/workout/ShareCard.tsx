// Teilen-Karte: wird als Bild aufgenommen (react-native-view-shot) und über das Teilen-Menü verschickt.
import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rankLabel, scoreToRank } from '../../lib/ranking';
import { exerciseBySlug } from '../../lib/standards';
import { formatDuration, type WorkoutSummary } from '../../lib/workoutSummary';
import { colors, gradients, radius, space } from '../../theme';
import { RankBadge, Text } from '../ui';
import { exerciseName } from './ExercisePicker';

export type ShareCardHandle = React.ComponentRef<typeof View>;

export const ShareCard = forwardRef<ShareCardHandle, { title: string; summary: WorkoutSummary; lang: 'de' | 'en'; overall: number | null }>(
  function ShareCard({ title, summary, lang, overall }, ref) {
    const r = overall != null ? scoreToRank(overall) : null;
    const de = lang === 'de';
    return (
      <View ref={ref} collapsable={false} style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.bg }}>
        <LinearGradient colors={[colors.surface2, colors.bg]} style={{ padding: space[5], gap: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            {r ? <RankBadge tier={r.tier} division={r.division} size={52} lang={lang} /> : null}
            <View style={{ flex: 1 }}>
              <Text variant="overline" color={colors.accent}>ASCEND</Text>
              <Text variant="h2" numberOfLines={1}>{title}</Text>
              {r ? <Text variant="caption" color={colors.tiers[r.tier - 1]}>{rankLabel(r, lang)}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              [de ? 'Dauer' : 'Time', formatDuration(summary.durationS)],
              [de ? 'Volumen' : 'Volume', `${summary.volumeKg.toLocaleString(lang)} kg`],
              [de ? 'Sätze' : 'Sets', String(summary.completedSets)],
              ['XP', `+${summary.xp.total}`],
            ].map(([l, v]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <Text variant="h3" tabular>{v}</Text>
                <Text variant="caption" color={colors.textSecondary}>{l}</Text>
              </View>
            ))}
          </View>
          {summary.prs.length ? (
            <Text color={colors.warning}>🏆 {summary.prs.map((s) => exerciseName(exerciseBySlug(s), lang, s)).join(', ')}</Text>
          ) : null}
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 4, borderRadius: 2 }} />
        </LinearGradient>
      </View>
    );
  },
);
