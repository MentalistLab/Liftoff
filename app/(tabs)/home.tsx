import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { buildPlan } from '../../components/onboarding/PlanPreview';
import { exerciseName } from '../../components/workout/ExercisePicker';
import { Button, Card, ProgressBar, Screen, Text } from '../../components/ui';
import { exerciseBySlug } from '../../lib/standards';
import { levelFromXp } from '../../lib/xp';
import { useOnboarding } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, gradients, radius, space } from '../../theme';

function weekStart(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x;
}

export default function HomeScreen() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const ob = useOnboarding();
  const { xp, history, active, start, streak } = useWorkout();
  const lp = levelFromXp(xp);
  const plan = useMemo(() => (ob.result || ob.completed ? buildPlan(ob, ob.result?.muscleScores) : null), [ob]);
  const todayWd = ((new Date().getDay() + 6) % 7) + 1;
  const today = plan?.days.find((d) => d.weekday === todayWd);
  const names = t('weekdays', { returnObjects: true }) as unknown as string[];

  const ws = weekStart().getTime();
  const trained = new Set(history.filter((h) => h.endedAt >= ws).map((h) => ((new Date(h.endedAt).getDay() + 6) % 7) + 1));

  return (
    <Screen>
      <Text variant="h1">{t('home.greetingAnon')}</Text>

      {streak.current > 0 ? (
        <LinearGradient colors={gradients.streak} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.lg, padding: space[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="h2" accessibilityRole="text">🔥 {t('home.streak', { count: streak.current })}</Text>
          {streak.freezes > 0 ? <Text variant="caption">{t('home.freezes', { n: streak.freezes })}</Text> : null}
        </LinearGradient>
      ) : (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text variant="h2">🔥</Text>
          <Text color={colors.textSecondary} style={{ flex: 1 }}>{t('home.streakZero')}</Text>
        </Card>
      )}

      <Card style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="h3">{t('home.level', { level: lp.level })}</Text>
          <Text variant="caption" color={colors.textSecondary} tabular>{lp.xpIntoLevel} / {lp.xpForNext} XP</Text>
        </View>
        <ProgressBar value={lp.progress} />
      </Card>

      <Card style={{ gap: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="overline" color={colors.textSecondary}>{t('home.week')}</Text>
          <Text variant="caption" color={colors.textSecondary}>{t('home.workouts', { count: trained.size })}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {names.map((n, i) => {
            const wd = i + 1, done = trained.has(wd), planned = ob.trainingDays.includes(wd), isToday = wd === todayWd;
            return (
              <View key={n} accessible accessibilityLabel={`${n}${done ? ' ✓' : ''}`} style={{ alignItems: 'center', gap: space[1] }}>
                <Text variant="caption" color={isToday ? colors.text : colors.textTertiary}>{n}</Text>
                <View style={{ width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? colors.success : 'transparent', borderWidth: 2, borderColor: done ? colors.success : planned ? colors.primary : colors.border }}>
                  {done ? <Text variant="caption" color={colors.bg}>✓</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: space[3] }}>
        <Text variant="overline" color={colors.textSecondary}>{t('home.today')}</Text>
        {today ? (
          <>
            <Text variant="h3">{today.title}</Text>
            <Text variant="caption" color={colors.textSecondary}>{today.exercises.map((e) => exerciseName(exerciseBySlug(e.slug), lang, e.slug)).join(' · ')}</Text>
            <Button label={active ? t('train.resume') : t('home.start')} onPress={() => {
              if (!active) start(today.title, today.exercises.map((e) => ({ slug: e.slug, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, durationS: e.durationS })), todayWd);
              router.push('/workout/active');
            }} />
          </>
        ) : <Text color={colors.textTertiary}>{plan ? t('home.rest') : t('train.noPlan')}</Text>}
      </Card>
    </Screen>
  );
}
