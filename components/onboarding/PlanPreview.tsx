import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { generatePlan, type GeneratedPlan } from '../../lib/planner';
import { ALL_EXERCISES, exerciseBySlug } from '../../lib/standards';
import type { OnboardingData } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { colors, space } from '../../theme';
import { Card, Text } from '../ui';

export function buildPlan(d: OnboardingData, scores?: Partial<Record<string, number>>): GeneratedPlan {
  const allowed = ALL_EXERCISES.filter((e) =>
    d.location === 'bodyweight' ? e.equipment === 'bodyweight' : d.location === 'home_dumbbells' ? !['machine', 'cable'].includes(e.equipment) : true);
  return generatePlan({
    goal: d.goal ?? 'fitness', experience: d.experience ?? 'beginner', days: d.trainingDays,
    exercises: allowed, muscleScores: scores as never,
  });
}

export function PlanPreview({ data, scores }: { data: OnboardingData; scores?: Partial<Record<string, number>> }) {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const plan = useMemo(() => buildPlan(data, scores), [data, scores]);
  const days = t('weekdays', { returnObjects: true }) as string[];
  return (
    <View style={{ gap: space[3] }}>
      {plan.days.map((d) => (
        <Card key={d.weekday} style={{ gap: space[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="overline" color={colors.primary}>{days[d.weekday - 1]}</Text>
            <Text variant="caption" color={colors.textTertiary}>{t('onboarding.plan.exercises', { count: d.exercises.length })}</Text>
          </View>
          <Text variant="h3">{d.title}</Text>
          {d.exercises.slice(0, 4).map((e) => {
            const ex = exerciseBySlug(e.slug);
            const reps = e.durationS ? `${e.durationS}s` : `${e.repsMin}–${e.repsMax}`;
            return (
              <Text key={e.slug} variant="caption" color={colors.textSecondary}>
                {ex ? (lang === 'de' ? ex.nameDe : ex.nameEn) : e.slug} · {e.sets} × {reps}
              </Text>
            );
          })}
        </Card>
      ))}
    </View>
  );
}
