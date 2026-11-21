import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { LineChart } from '../../components/charts/LineChart';
import { BackHeader, Button, Card, ProgressBar, RankBadge, Screen, Text } from '../../components/ui';
import { exerciseName } from '../../components/workout/ExercisePicker';
import { PlateSheet } from '../../components/workout/PlateSheet';
import { oneRmSeries } from '../../lib/profileStats';
import { rankLabel, scoreToRank } from '../../lib/ranking';
import { exerciseBySlug } from '../../lib/standards';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, space } from '../../theme';

export default function ExerciseDetail() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const ex = exerciseBySlug(String(slug));
  const { history, bests, lastSets, targets, active, start } = useWorkout();
  const [plates, setPlates] = useState(false);
  const series = useMemo(() => oneRmSeries(history, String(slug)), [history, slug]);
  if (!ex) return <Screen><BackHeader title={t('feat.exercise')} /></Screen>;

  const best = bests[ex.slug];
  const rank = best ? scoreToRank(best.score) : null;
  const tColor = rank ? colors.tiers[rank.tier - 1] : colors.textTertiary;
  const last = lastSets[ex.slug];
  const target = targets[ex.slug];
  const bestText = best ? (ex.rankingType === 'weight_ratio' ? `${Math.round(best.oneRm ?? 0)} kg` : ex.rankingType === 'time' ? `${best.durationS} s` : `${best.reps} ×`) : '–';

  return (
    <Screen>
      <BackHeader title={exerciseName(ex, lang)} label={t('onboarding.back')} />
      <Text color={colors.textSecondary}>
        {t('feat.primary')}: {t(`muscles.${ex.primaryMuscle}`)}
        {ex.secondaryMuscles.length ? ` · ${t('feat.secondary')}: ${ex.secondaryMuscles.map((m) => t(`muscles.${m}`)).join(', ')}` : ''}
      </Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        {rank ? <RankBadge tier={rank.tier} division={rank.division} size={64} lang={lang} /> : null}
        <View style={{ flex: 1, gap: space[1] }}>
          <Text variant="h2" color={tColor}>{rank ? rankLabel(rank, lang) : t('ranks.unranked')}</Text>
          {rank ? <ProgressBar value={rank.progress} color={tColor} /> : null}
          <Text variant="caption" color={colors.textSecondary}>
            {t('feat.bestLift')}: {bestText}{ex.rankingType === 'weight_ratio' && best ? ` (${t('feat.est1rm')})` : ''}
          </Text>
        </View>
      </Card>

      {target ? (
        <Card style={{ gap: space[1], backgroundColor: colors.primarySoft, borderColor: colors.primaryLine }}>
          <Text variant="overline" color={colors.accent}>{t('feat.nextTarget')}</Text>
          <Text variant="h2">{target.repsMin}–{target.repsMax} Wdh.{target.weightKg ? ` @ ${String(target.weightKg).replace('.', ',')} kg` : ''}</Text>
          <Text variant="caption" color={colors.textSecondary}>{lang === 'de' ? target.noteDe : target.noteEn}</Text>
        </Card>
      ) : null}

      {ex.rankingType === 'weight_ratio' ? (
        <Card style={{ gap: space[3] }}>
          <Text variant="h3">{t('profile.oneRm')}</Text>
          <LineChart data={series} unit="kg" emptyText={t('feat.noHistory')} />
        </Card>
      ) : null}

      <Card style={{ gap: space[2] }}>
        <Text variant="h3">{t('feat.recent')}</Text>
        {last?.length ? last.map((s, i) => (
          <Text key={i} tabular color={colors.textSecondary}>
            {i + 1}. {s.durationS ? `${s.durationS} s` : `${s.weightKg ? `${String(s.weightKg).replace('.', ',')} kg × ` : ''}${s.reps ?? '–'}`}
          </Text>
        )) : <Text color={colors.textTertiary}>{t('feat.noHistory')}</Text>}
      </Card>

      {ex.equipment === 'barbell' ? <Button label={t('feat.plateTitle')} variant="secondary" size="m" onPress={() => setPlates(true)} /> : null}
      {!active ? (
        <Button label={t('feat.startWith')} onPress={() => { start(exerciseName(ex, lang), [{ slug: ex.slug, sets: 3 }]); router.push('/workout/active'); }} />
      ) : null}
      <PlateSheet visible={plates} initialKg={target?.weightKg ?? last?.[0]?.weightKg ?? 60} onClose={() => setPlates(false)} />
    </Screen>
  );
}
