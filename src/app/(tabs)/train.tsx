import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, H1, H2, Screen } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';
import { formatDate } from './index';

export default function Train() {
  const draft = useStore((s) => s.draft);
  const history = useStore((s) => s.history).filter((w) => w.xp > 0).slice().reverse();
  const startWorkout = useStore((s) => s.startWorkout);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <H1>Training</H1>
        <Button
          label={draft ? 'Workout fortsetzen' : 'Freies Workout starten'}
          onPress={() => { startWorkout(); router.push('/workout/active'); }}
        />
        <H2>Verlauf</H2>
        {history.length === 0 && <Card><Body dim>Noch keine Workouts.</Body></Card>}
        {history.map((w) => {
          const names = [...new Set(w.sets.map((s) => getExercise(s.exerciseId)?.name ?? s.exerciseId))];
          return (
            <Card key={w.id} style={{ gap: spacing.sm }}>
              <View style={styles.row}><Body>{formatDate(w.date)}</Body><Text style={styles.xp}>+{w.xp} XP</Text></View>
              <Text style={styles.cap}>{names.join(' · ')}</Text>
              <Text style={styles.cap}>{w.sets.length} Sätze · {w.volumeKg} kg · {Math.max(1, Math.round((w.endedAt - w.startedAt) / 60000))} min</Text>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cap: { ...font.caption, color: colors.textSecondary },
  xp: { ...font.h3, color: colors.accent },
});
