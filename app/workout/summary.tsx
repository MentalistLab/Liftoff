import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from '../../components/fx/Confetti';
import { CountUp } from '../../components/fx/CountUp';
import { exerciseName } from '../../components/workout/ExercisePicker';
import { Button, Card, ProgressBar, RankBadge, Text } from '../../components/ui';
import { rankLabel, scoreToRank } from '../../lib/ranking';
import { exerciseBySlug } from '../../lib/standards';
import { formatDuration } from '../../lib/workoutSummary';
import { levelFromXp } from '../../lib/xp';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, space } from '../../theme';

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card style={{ flex: 1, minWidth: '45%', gap: space[1] }}>
      <Text variant="overline" color={colors.textSecondary}>{label}</Text>
      {children}
    </Card>
  );
}

export default function Summary() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const w = useWorkout((s) => s.history.find((h) => h.id === id) ?? s.history[0]);
  const totalXp = useWorkout((s) => s.xp);
  const s = w?.summary;
  const celebrate = !!s && (s.rankUps > 0 || s.prs.length > 0);
  useEffect(() => { if (celebrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }, [celebrate]);

  if (!w || !s) return null;
  const level = levelFromXp(totalXp);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4], paddingBottom: space[14] }}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: 'center', gap: space[1], paddingTop: space[4] }}>
          <Text variant="display">💪</Text>
          <Text variant="h1" accessibilityRole="header">{s.rankUps > 0 ? t('summary.rankUp') : t('summary.title')}</Text>
          <Text color={colors.textSecondary}>{w.title}</Text>
        </Animated.View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
          <Stat label={t('summary.duration')}><Text variant="h2" tabular>{formatDuration(s.durationS)}</Text></Stat>
          <Stat label={t('summary.volume')}><CountUp to={s.volumeKg} suffix=" kg" variant="h2" /></Stat>
          <Stat label={t('summary.sets')}><CountUp to={s.completedSets} variant="h2" /></Stat>
          <Stat label={t('summary.xp')}><CountUp to={s.xp.total} suffix=" XP" variant="h2" color={colors.accent} /></Stat>
        </View>

        <Card style={{ gap: space[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="h3">Level {level.level}</Text>
            <Text variant="caption" color={colors.textSecondary} tabular>{level.xpIntoLevel} / {level.xpForNext} XP</Text>
          </View>
          <ProgressBar value={level.progress} color={colors.accent} />
          {s.xp.multiplier > 1 ? <Text variant="caption" color={colors.warning}>{t('summary.streakBonus', { m: s.xp.multiplier.toFixed(2) })}</Text> : null}
        </Card>

        {s.prs.length ? (
          <Animated.View entering={FadeInUp.delay(300)} style={{ gap: space[2] }}>
            <Text variant="h3">🏆 {t('summary.prs')}</Text>
            {s.prs.map((slug) => <Text key={slug} color={colors.warning}>{exerciseName(exerciseBySlug(slug), lang, slug)}</Text>)}
          </Animated.View>
        ) : null}

        <Text variant="h3">{t('summary.ranks')}</Text>
        {s.exercises.map((r, i) => {
          const rank = r.scoreAfter != null ? scoreToRank(r.scoreAfter) : null;
          const up = r.stepBefore != null && r.stepAfter != null && r.stepAfter > r.stepBefore;
          return (
            <Animated.View key={r.slug + i} entering={FadeInUp.delay(400 + i * 120)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], borderColor: up ? colors.tiers[rank!.tier - 1] : colors.border }}>
                {rank ? <RankBadge tier={rank.tier} division={rank.division} size={36} lang={lang} /> : null}
                <View style={{ flex: 1, gap: space[1] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>{exerciseName(exerciseBySlug(r.slug), lang, r.slug)}</Text>
                    <Text variant="caption" color={rank ? colors.tiers[rank.tier - 1] : colors.textTertiary}>
                      {up ? '▲ ' : ''}{rank ? rankLabel(rank, lang) : ''}
                    </Text>
                  </View>
                  <ProgressBar value={rank?.progress ?? 0} color={rank ? colors.tiers[rank.tier - 1] : colors.textTertiary} height={6} />
                  {r.stepBefore == null ? <Text variant="caption" color={colors.textTertiary}>{t('summary.first')}</Text> : null}
                </View>
              </Card>
            </Animated.View>
          );
        })}

        <Text variant="caption" color={w.synced ? colors.success : colors.textTertiary}>{w.synced ? `✓ ${t('summary.synced')}` : t('summary.offline')}</Text>
        <Button label={t('summary.done')} onPress={() => router.replace('/home')} />
      </ScrollView>
      {celebrate ? <Confetti /> : null}
    </SafeAreaView>
  );
}
