import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { RankBadge } from '@/components/RankBadge';
import { Body, Button, Card, H1, H2, Screen } from '@/components/ui';
import { MUSCLE_LABELS, Muscle, getExercise } from '@/data/exercises';
import { rankName } from '@/lib/ranking';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';

const unitLabel = { kg: 'kg (geschätztes 1RM)', reps: 'Wdh.', s: 'Sek.' } as const;

export default function Summary() {
  const result = useStore((s) => s.lastResult);
  const hasRankUp = !!result && result.rankUps.length > 0;

  useEffect(() => {
    if (hasRankUp) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [hasRankUp]);

  if (!result) return <Redirect href="/(tabs)" />;
  const { workout, prs, rankUps, streak, overallAfter } = result;
  const minutes = Math.max(1, Math.round((workout.endedAt - workout.startedAt) / 60000));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: spacing.md }}>
          <RankBadge rank={overallAfter} size={110} />
          <H1>Workout geschafft!</H1>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={{ gap: spacing.lg }}>
          <Card style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.xp}>+{workout.xp} XP</Text>
            <Body dim>Streak: {streak.current} {streak.current === 1 ? 'Tag' : 'Tage'}</Body>
          </Card>

          <View style={styles.grid}>
            <Card style={styles.stat}><Text style={styles.cap}>SÄTZE</Text><Text style={styles.val}>{workout.sets.length}</Text></Card>
            <Card style={styles.stat}><Text style={styles.cap}>VOLUMEN</Text><Text style={styles.val}>{workout.volumeKg} kg</Text></Card>
            <Card style={styles.stat}><Text style={styles.cap}>DAUER</Text><Text style={styles.val}>{minutes} min</Text></Card>
          </View>
        </Animated.View>

        {rankUps.length > 0 && (
          <Animated.View entering={FadeIn.delay(600)} style={{ gap: spacing.md }}>
            <H2>Rang-Aufstiege 🎉</H2>
            {rankUps.map((u, i) => (
              <Card key={i} style={styles.row}>
                <Body>{u.kind === 'overall' ? 'Gesamtrang' : u.kind === 'muscle' ? MUSCLE_LABELS[u.label as Muscle] : u.label}</Body>
                <Text style={styles.up}>{rankName(u.from)} → {rankName(u.to)}</Text>
              </Card>
            ))}
          </Animated.View>
        )}

        {prs.length > 0 && (
          <Animated.View entering={FadeIn.delay(800)} style={{ gap: spacing.md }}>
            <H2>Neue Bestleistungen 💪</H2>
            {prs.map((p) => (
              <Card key={p.exerciseId} style={styles.row}>
                <Body>{getExercise(p.exerciseId)?.name}</Body>
                <Text style={styles.up}>{Math.round(p.value * 10) / 10} {unitLabel[p.unit]}</Text>
              </Card>
            ))}
          </Animated.View>
        )}

        <Button label="Fertig" onPress={() => router.replace('/(tabs)')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xl },
  xp: { ...font.display, color: colors.accent },
  grid: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 4, padding: spacing.md },
  cap: { ...font.overline, color: colors.textTertiary },
  val: { ...font.h3, color: colors.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  up: { ...font.caption, color: colors.accent, flexShrink: 1, textAlign: 'right' },
});
