import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RankBadge } from '@/components/RankBadge';
import { Body, Button, Card, H1, H2, Overline, ProgressBar, Screen } from '@/components/ui';
import { computeRanks } from '@/lib/selectors';
import { rankName } from '@/lib/ranking';
import { displayStreak, toDateKey } from '@/lib/streak';
import { levelFromXp } from '@/lib/xp';
import { toAthlete, useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';

export default function Home() {
  const profile = useStore((s) => s.profile)!;
  const history = useStore((s) => s.history);
  const streak = useStore((s) => s.streak);
  const xp = useStore((s) => s.xp);
  const draft = useStore((s) => s.draft);
  const startWorkout = useStore((s) => s.startWorkout);

  const ranks = useMemo(() => computeRanks(history, toAthlete(profile)), [history, profile]);
  const lvl = levelFromXp(xp);
  const current = displayStreak(streak, toDateKey(new Date()), profile.trainingDays);
  const recent = history.filter((w) => w.xp > 0).slice(-3).reverse();

  const go = () => {
    startWorkout();
    router.push('/workout/active');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Overline>Willkommen zurück</Overline>
            <H1>{profile.name}</H1>
          </View>
          <View style={styles.streak} accessibilityLabel={`Streak: ${current} Tage`}>
            <Ionicons name="flame" size={22} color={colors.streak} />
            <Text style={styles.streakText}>{current}</Text>
          </View>
        </View>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
          <RankBadge rank={ranks.overall} size={84} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Overline>Gesamtrang</Overline>
            <H2>{ranks.overall ? rankName(ranks.overall) : 'Noch ungerankt'}</H2>
            <Body dim>Level {lvl.level}</Body>
            <ProgressBar value={lvl.current / lvl.needed} color={colors.accent} />
            <Text style={styles.cap}>{lvl.current} / {lvl.needed} XP</Text>
          </View>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Overline>Heutiges Training</Overline>
          <H2>{draft ? 'Workout läuft' : 'Freies Workout'}</H2>
          <Body dim>
            {draft ? `${draft.sets.filter((s) => s.done).length} Sätze abgeschlossen.` : `Dein Ziel: ${profile.trainingDays}× pro Woche. Wähle Übungen und logge deine Sätze.`}
          </Body>
          <Button label={draft ? 'Workout fortsetzen' : 'Workout starten'} onPress={go} />
        </Card>

        <View style={{ gap: spacing.md }}>
          <H2>Letzte Workouts</H2>
          {recent.length === 0 && <Card><Body dim>Noch keine Workouts. Starte dein erstes und sammle XP!</Body></Card>}
          {recent.map((w) => (
            <Card key={w.id} style={styles.row}>
              <View><Body>{formatDate(w.date)}</Body><Text style={styles.cap}>{w.sets.length} Sätze · {w.volumeKg} kg Volumen</Text></View>
              <Text style={styles.xp}>+{w.xp} XP</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

export const formatDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  streakText: { ...font.h3, color: colors.text, fontVariant: ['tabular-nums'] },
  cap: { ...font.caption, color: colors.textTertiary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xp: { ...font.h3, color: colors.accent },
});
