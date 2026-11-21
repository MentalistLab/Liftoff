import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { BackHeader, Card, Screen, Text } from '../../components/ui';
import { exerciseName } from '../../components/workout/ExercisePicker';
import { epley1RM } from '../../lib/ranking';
import { exerciseBySlug } from '../../lib/standards';
import { formatDuration, isSetDone } from '../../lib/workoutSummary';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, space } from '../../theme';

export default function WorkoutDetail() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = useWorkout((s) => s.history.find((h) => h.id === id));
  if (!w) return <Screen><BackHeader title={t('feat.workoutDetail')} /></Screen>;
  const prs = new Set(w.summary.prs);
  return (
    <Screen>
      <BackHeader title={w.title} label={t('onboarding.back')} />
      <Text color={colors.textSecondary}>
        {new Date(w.endedAt).toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </Text>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        {[[t('summary.duration'), formatDuration(w.summary.durationS)], [t('summary.volume'), `${w.summary.volumeKg.toLocaleString(lang)} kg`], [t('summary.sets'), String(w.summary.completedSets)], ['XP', `+${w.summary.xp.total}`]].map(([l, v]) => (
          <Card key={l} style={{ flex: 1, padding: space[3], gap: 2 }}>
            <Text variant="h3" tabular numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
            <Text variant="caption" color={colors.textSecondary}>{l}</Text>
          </Card>
        ))}
      </View>
      {w.exercises.map((e, i) => {
        const ex = exerciseBySlug(e.slug);
        const done = e.sets.filter(isSetDone);
        if (!done.length) return null;
        return (
          <Pressable key={`${e.slug}-${i}`} accessibilityRole="button" onPress={() => router.push({ pathname: '/exercise/[slug]', params: { slug: e.slug } })}>
            <Card style={{ gap: space[2] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="h2">{exerciseName(ex, lang, e.slug)}</Text>
                {prs.has(e.slug) ? <Text variant="caption" color={colors.warning}>🏆 PR</Text> : null}
              </View>
              {done.map((s, k) => {
                const orm = ex?.rankingType === 'weight_ratio' ? epley1RM(s.weightKg, s.reps) : null;
                return (
                  <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text color={colors.textSecondary}>{k + 1}.</Text>
                    <Text tabular style={{ flex: 1, marginLeft: space[3] }}>
                      {s.durationS ? `${s.durationS} s` : `${s.weightKg ? `${String(s.weightKg).replace('.', ',')} kg × ` : ''}${s.reps}`}
                    </Text>
                    {orm ? <Text variant="caption" color={colors.textTertiary} tabular>1RM ≈ {Math.round(orm)} kg</Text> : null}
                  </View>
                );
              })}
            </Card>
          </Pressable>
        );
      })}
      {w.notes ? (
        <Card style={{ gap: space[1] }}>
          <Text variant="overline" color={colors.textSecondary}>{t('feat.deleteNote')}</Text>
          <Text>{w.notes}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
