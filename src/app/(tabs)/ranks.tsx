import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RankBadge } from '@/components/RankBadge';
import { Body, Card, H1, H2, Overline, ProgressBar, Screen } from '@/components/ui';
import { EXERCISES, MUSCLE_LABELS } from '@/data/exercises';
import { rankFromScore, rankName, TIER_NAMES } from '@/lib/ranking';
import { computeRanks } from '@/lib/selectors';
import { toAthlete, useStore } from '@/store/useStore';
import { colors, font, rankColors, spacing } from '@/theme';

/** Fortschritt innerhalb der aktuellen Division (0–1). */
const divisionProgress = (score: number) => {
  const per = 100 / 8 / 3;
  return (score % per) / per;
};

export default function Ranks() {
  const profile = useStore((s) => s.profile)!;
  const history = useStore((s) => s.history);
  const ranks = useMemo(() => computeRanks(history, toAthlete(profile)), [history, profile]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <H1>Ränge</H1>
        <Card style={{ alignItems: 'center', gap: spacing.md }}>
          <RankBadge rank={ranks.overall} size={130} />
          <H2>{ranks.overall ? rankName(ranks.overall) : 'Noch ungerankt'}</H2>
          {ranks.overall && <Body dim>{Math.round(ranks.overall.score)} / 100 Punkte</Body>}
        </Card>

        <H2>Muskelgruppen</H2>
        {ranks.muscles.map(({ muscle, rank }) => (
          <Card key={muscle} style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Body>{MUSCLE_LABELS[muscle]}</Body>
              <Text style={[styles.rank, { color: rank ? rankColors[rank.tier - 1] : colors.textTertiary }]}>
                {rank ? rankName(rank) : '–'}
              </Text>
            </View>
            <ProgressBar value={rank ? divisionProgress(rank.score) : 0} color={rank ? rankColors[rank.tier - 1] : colors.border} />
          </Card>
        ))}

        <H2>Übungen</H2>
        {EXERCISES.map((ex) => {
          const score = ranks.exercises[ex.id];
          const rank = score === undefined ? null : rankFromScore(score);
          return (
            <View key={ex.id} style={styles.row}>
              <Body dim={!rank}>{ex.name}</Body>
              <Text style={[styles.rank, { color: rank ? rankColors[rank.tier - 1] : colors.textTertiary }]}>
                {rank ? rankName(rank) : '–'}
              </Text>
            </View>
          );
        })}

        <Card style={{ gap: spacing.sm }}>
          <Overline>Rang-Leiter</Overline>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {TIER_NAMES.map((n, i) => (
              <Text key={n} style={{ ...font.caption, color: rankColors[i] }}>{n}</Text>
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rank: { ...font.h3 },
});
