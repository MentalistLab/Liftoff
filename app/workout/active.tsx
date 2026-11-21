import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExercisePicker, exerciseName } from '../../components/workout/ExercisePicker';
import { RestTimer } from '../../components/workout/RestTimer';
import { SetRow } from '../../components/workout/SetRow';
import { Button, Card, Text } from '../../components/ui';
import { confirm, notice } from '../../lib/confirm';
import { stepToRank } from '../../lib/leagueView';
import { computeStats, earnedBadgeIds } from '../../lib/profileStats';
import { exerciseBySlug } from '../../lib/standards';
import { useCelebrations, type Celebration } from '../../stores/celebrations';
import { syncWorkout } from '../../lib/sync';
import { formatDuration, isSetDone, summarize } from '../../lib/workoutSummary';
import { useOnboarding } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, fonts, radius, space } from '../../theme';

export default function ActiveWorkout() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const w = useWorkout();
  const a = w.active;
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; index: number } | null>(null);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const closeRest = useCallback(() => setRest(null), []);

  const leaving = useRef(false);
  // Kein aktives Workout (z. B. Deep Link) → zurück zum Training; nicht beim Beenden/Verwerfen
  useEffect(() => { if (!a && !leaving.current) router.replace('/train'); }, [a]);
  if (!a) return null;

  const labels = { set: t('workout.set'), kg: t('workout.kg'), reps: t('workout.reps'), sec: t('workout.sec'), done: t('workout.done') };
  const anyDone = a.exercises.some((e) => e.sets.some(isSetDone));

  const finish = async () => {
    let exercises = a.exercises;
    if (!anyDone) {
      // Werte eingetragen, aber nicht abgehakt → anbieten, sie zu übernehmen
      const filled = a.exercises.some((e) => e.sets.some((s) => (s.reps ?? 0) > 0 || (s.durationS ?? 0) > 0));
      if (!filled) { await notice(t('workout.noSets')); return; }
      if (!(await confirm(t('workout.takeFilled'), t('workout.finish'), t('workout.cancel')))) return;
      exercises = a.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: s.done || (s.reps ?? 0) > 0 || (s.durationS ?? 0) > 0 })) }));
      exercises.forEach((e, ei) => e.sets.forEach((s) => { if (s.done) w.updateSet(ei, s.id, { done: true }); }));
    } else if (!(await confirm(t('workout.finishQ'), t('workout.finish'), t('workout.cancel')))) return;
    const ob = useOnboarding.getState();
    const ended = Date.now();
    const summary = summarize(exercises, a.startedAt, ended, w.bests, { gender: ob.gender ?? 'none', bodyweightKg: ob.bodyweightKg, age: ob.age });
    // Abzeichen vorher/nachher vergleichen (lokale Historie)
    const before = earnedBadgeIds(computeStats(w.history));
    summary.newBadges = [...earnedBadgeIds(computeStats([{ startedAt: a.startedAt, endedAt: ended, exercises, summary }, ...w.history]))].filter((id) => !before.has(id));
    leaving.current = true;
    const res = w.finish(summary, ended, ob.trainingDays);
    if (!res) return;
    const cel: Celebration[] = [];
    const best = [...summary.exercises].filter((r) => r.stepBefore != null && r.stepAfter != null && r.stepAfter > r.stepBefore)
      .sort((x, y) => y.stepAfter! - x.stepAfter!)[0];
    if (best) { const r = stepToRank(best.stepAfter)!; cel.push({ kind: 'rank_up', slug: best.slug, tier: r.tier, division: r.division }); }
    for (const id of summary.newBadges) cel.push({ kind: 'badge', id });
    for (const e of res.streakEvents) if (e.type === 'freeze_earned') cel.push({ kind: 'streak_freeze', freezes: e.freezes });
    useCelebrations.getState().push(...cel);
    syncWorkout(res.workout).catch(() => { /* bleibt ausstehend, nächster App-Start */ });
    router.replace({ pathname: '/workout/summary', params: { id: res.workout.id } });
  };
  const discard = async () => {
    if (await confirm(t('workout.discardQ'), t('workout.discard'), t('workout.cancel'), true)) { leaving.current = true; w.discard(); router.replace('/train'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], borderBottomWidth: 1, borderColor: colors.border }}>
        <Pressable onPress={discard} accessibilityRole="button" hitSlop={10}><Text color={colors.danger}>{t('workout.discard')}</Text></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="h2" tabular accessibilityLabel={formatDuration(Math.floor((now - a.startedAt) / 1000))}>{formatDuration(Math.floor((now - a.startedAt) / 1000))}</Text>
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{a.title}</Text>
        </View>
        <Button label={t('workout.finish')} size="s" onPress={finish} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4], paddingBottom: 320 }} keyboardShouldPersistTaps="handled">
        {a.exercises.map((e, ei) => {
          const ex = exerciseBySlug(e.slug);
          const kind = ex?.rankingType === 'time' ? 'time' : ex?.rankingType === 'reps' ? 'reps' : 'weight';
          const prev = w.lastSets[e.slug];
          return (
            <Card key={`${e.slug}-${ei}`} style={{ gap: space[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="h3" color={colors.primary} style={{ flex: 1 }} numberOfLines={1}>{exerciseName(ex, lang, e.slug)}</Text>
                <Pressable onPress={() => setPicker({ mode: 'swap', index: ei })} accessibilityRole="button" hitSlop={8} style={{ paddingHorizontal: space[2] }}>
                  <Text variant="caption" color={colors.textSecondary}>{t('workout.swap')}</Text>
                </Pressable>
                <Pressable onPress={() => w.removeExercise(ei)} accessibilityRole="button" hitSlop={8} style={{ paddingHorizontal: space[2] }}>
                  <Text variant="caption" color={colors.danger}>{t('workout.remove')}</Text>
                </Pressable>
              </View>
 {e.target ? (
                <Text variant="caption" color={colors.accent}>
                  {t('workout.target', {
                    sets: e.target.sets,
                    reps: e.target.durationS ? `${e.target.durationS} s` : `${e.target.repsMin}–${e.target.repsMax}`,
                    weight: e.target.weightKg ? ` @ ${e.target.weightKg} kg` : '',
                  })}
                  {w.targets[e.slug] ? ` · ${lang === 'de' ? w.targets[e.slug].noteDe : w.targets[e.slug].noteEn}` : ''}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: space[2], paddingHorizontal: space[1] }}>
                <Text variant="overline" color={colors.textTertiary} style={{ width: 28, textAlign: 'center' }} accessibilityLabel={t('workout.set')}>#</Text>
                <Text variant="overline" color={colors.textTertiary} style={{ width: 56, textAlign: 'center' }}>{t('workout.prev')}</Text>
                {kind === 'weight' ? <Text variant="overline" color={colors.textTertiary} style={{ flex: 1, textAlign: 'center' }}>{t('workout.kg')}</Text> : null}
                <Text variant="overline" color={colors.textTertiary} style={{ flex: 1, textAlign: 'center' }}>{kind === 'time' ? t('workout.sec') : t('workout.reps')}</Text>
                <View style={{ width: 40 }} />
              </View>
              {e.sets.map((s, si) => (
                <SetRow key={s.id} index={si} set={s} kind={kind} prev={prev?.[si] ?? prev?.at(-1)} labels={labels}
                  onChange={(p) => w.updateSet(ei, s.id, p)}
                  onRemove={() => w.removeSet(ei, s.id)}
                  onDone={(d) => {
                    w.updateSet(ei, s.id, { done: d });
                    if (d) setRest({ endsAt: Date.now() + w.restDefaultS * 1000, total: w.restDefaultS });
                  }} />
              ))}
              <Pressable onPress={() => w.addSet(ei)} accessibilityRole="button" style={{ height: 40, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="caption">{t('workout.addSet')}</Text>
              </Pressable>
            </Card>
          );
        })}
        <Button label={t('workout.addExercise')} variant="secondary" onPress={() => setPicker({ mode: 'add' })} />
        <View style={{ gap: space[1] }}>
          <Text variant="caption" color={colors.textSecondary}>{t('workout.notes')}</Text>
          <TextInput value={a.notes} onChangeText={w.setNotes} multiline placeholder={t('workout.notesPh')} placeholderTextColor={colors.textTertiary} accessibilityLabel={t('workout.notes')}
            style={{ minHeight: 80, padding: space[3], borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.text, fontFamily: fonts.regular, fontSize: 16, textAlignVertical: 'top' }} />
        </View>
      </ScrollView>

      {rest ? (
        <RestTimer endsAt={rest.endsAt} total={rest.total} onClose={closeRest} labels={{ rest: t('workout.rest'), skip: t('workout.skip') }}
          onAdjust={(d) => setRest((r) => r && { endsAt: Math.max(Date.now(), r.endsAt + d * 1000), total: Math.max(1, r.total + d) })} />
      ) : null}
      <ExercisePicker visible={!!picker} onClose={() => setPicker(null)}
        onPick={(slug) => { if (picker?.mode === 'swap') w.replaceExercise(picker.index, slug); else w.addExercise(slug); }} />
    </SafeAreaView>
  );
}
