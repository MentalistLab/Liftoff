import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExercisePicker, exerciseName } from '../../components/workout/ExercisePicker';
import { RestTimer } from '../../components/workout/RestTimer';
import { SetRow } from '../../components/workout/SetRow';
import { Button, Card, Text } from '../../components/ui';
import { confirm } from '../../lib/confirm';
import { exerciseBySlug } from '../../lib/standards';
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
    if (!anyDone) { await confirm(t('workout.noSets'), 'OK', t('workout.cancel')); return; }
    if (!(await confirm(t('workout.finishQ'), t('workout.finish'), t('workout.cancel')))) return;
    const ob = useOnboarding.getState();
    const ended = Date.now();
    const summary = summarize(a.exercises, a.startedAt, ended, w.bests, { gender: ob.gender ?? 'none', bodyweightKg: ob.bodyweightKg, age: ob.age });
    leaving.current = true;
    const done = w.finish(summary, ended);
    if (done) syncWorkout(done).catch(() => { /* bleibt ausstehend, nächster App-Start */ });
    router.replace({ pathname: '/workout/summary', params: { id: done?.id } });
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
