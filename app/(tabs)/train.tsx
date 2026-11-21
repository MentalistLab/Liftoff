import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { buildPlan } from '../../components/onboarding/PlanPreview';
import { ExerciseFilterBar, ExerciseRow, exerciseName, useExerciseFilter } from '../../components/workout/ExercisePicker';
import { Button, Card, Screen, Text } from '../../components/ui';
import { exerciseBySlug } from '../../lib/standards';
import { formatDuration } from '../../lib/workoutSummary';
import { useOnboarding } from '../../stores/onboarding';
import { useWorkout } from '../../stores/workout';
import { colors, gradients, radius, space } from '../../theme';

export default function TrainScreen() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const ob = useOnboarding();
  const active = useWorkout((s) => s.active);
  const start = useWorkout((s) => s.start);
  const f = useExerciseFilter();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!active) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [active]);

  const plan = useMemo(() => (ob.completed || ob.result ? buildPlan(ob, ob.result?.muscleScores) : null), [ob]);
  const days = t('weekdays', { returnObjects: true }) as unknown as string[];
  const todayWd = ((new Date().getDay() + 6) % 7) + 1;

  const go = () => router.push('/workout/active');
  const startDay = (wd: number) => {
    const d = plan!.days.find((x) => x.weekday === wd)!;
    start(d.title, d.exercises.map((e) => ({ slug: e.slug, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, durationS: e.durationS })), wd);
    go();
  };

  return (
    <Screen title={t('train.title')}>
      {active ? (
        <Pressable onPress={go} accessibilityRole="button" style={{ borderRadius: radius.lg, padding: space[4], backgroundColor: gradients.primary[0] }}>
          <Text variant="h3">▶ {t('train.resume')}</Text>
          <Text variant="caption" color={colors.text}>{active.title} · {t('train.running', { time: formatDuration(Math.floor((now - active.startedAt) / 1000)) })}</Text>
        </Pressable>
      ) : (
        <Button label={t('train.free')} variant="secondary" onPress={() => { start(t('train.freeTitle'), []); go(); }} />
      )}

      <Text variant="h2" accessibilityRole="header">{t('train.plan')}</Text>
      {plan ? plan.days.map((d) => (
        <Card key={d.weekday} style={{ gap: space[2], borderColor: d.weekday === todayWd ? colors.primary : colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="overline" color={colors.primary}>{days[d.weekday - 1]}{d.weekday === todayWd ? ` · ${t('train.today')}` : ''}</Text>
            {!active ? <Button label={t('train.start')} size="s" variant={d.weekday === todayWd ? 'primary' : 'secondary'} onPress={() => startDay(d.weekday)} /> : null}
          </View>
          <Text variant="h3">{d.title}</Text>
          <Text variant="caption" color={colors.textSecondary}>{d.exercises.map((e) => exerciseName(exerciseBySlug(e.slug), f.lang, e.slug)).join(' · ')}</Text>
        </Card>
      )) : <Card><Text color={colors.textTertiary}>{t('train.noPlan')}</Text></Card>}

      <Text variant="h2" accessibilityRole="header">{t('train.library')}</Text>
      <ExerciseFilterBar {...f} />
      {f.list.map((e) => <ExerciseRow key={e.slug} e={e} lang={f.lang} />)}
    </Screen>
  );
}
