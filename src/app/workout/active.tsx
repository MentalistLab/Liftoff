import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Body, Button, Card, Chip, H2, Screen } from '@/components/ui';
import { EXERCISES, getExercise } from '@/data/exercises';
import { DraftSet, useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';

const REST_SECONDS = 90;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const parse = (t: string) => {
  const v = parseFloat(t.replace(',', '.'));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

function SetRow({ s, index }: { s: DraftSet; index: number }) {
  const ex = getExercise(s.exerciseId)!;
  const updateSet = useStore((st) => st.updateSet);
  const toggleSet = useStore((st) => st.toggleSet);
  const removeSet = useStore((st) => st.removeSet);
  const isTime = ex.type === 'time';
  const isReps = ex.type === 'reps';
  return (
    <View style={[styles.setRow, s.done && { backgroundColor: '#2BD67B22' }]}>
      <Text style={styles.setIdx}>{index + 1}</Text>
      {!isTime && !isReps && (
        <TextInput
          style={styles.setInput}
          keyboardType="decimal-pad"
          defaultValue={s.weightKg ? String(s.weightKg) : ''}
          placeholder="kg"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={`Satz ${index + 1} Gewicht in kg`}
          onChangeText={(t) => updateSet(s.key, { weightKg: parse(t) })}
          editable={!s.done}
        />
      )}
      {isTime ? (
        <TextInput
          style={styles.setInput}
          keyboardType="number-pad"
          defaultValue={s.durationS ? String(s.durationS) : ''}
          placeholder="Sek."
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={`Satz ${index + 1} Sekunden`}
          onChangeText={(t) => updateSet(s.key, { durationS: Math.round(parse(t)) })}
          editable={!s.done}
        />
      ) : (
        <TextInput
          style={styles.setInput}
          keyboardType="number-pad"
          defaultValue={s.reps ? String(s.reps) : ''}
          placeholder="Wdh."
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={`Satz ${index + 1} Wiederholungen`}
          onChangeText={(t) => updateSet(s.key, { reps: Math.round(parse(t)) })}
          editable={!s.done}
        />
      )}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: s.done }}
        accessibilityLabel={`Satz ${index + 1} abgeschlossen`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          toggleSet(s.key);
        }}
        style={[styles.check, s.done && { backgroundColor: colors.success, borderColor: colors.success }]}
      >
        {s.done && <Ionicons name="checkmark" size={22} color="#fff" />}
      </Pressable>
      {!s.done && (
        <Pressable accessibilityLabel="Satz löschen" hitSlop={10} onPress={() => removeSet(s.key)}>
          <Ionicons name="close" size={20} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

export default function ActiveWorkout() {
  const draft = useStore((s) => s.draft);
  const addSet = useStore((s) => s.addSet);
  const discard = useStore((s) => s.discardWorkout);
  const finish = useStore((s) => s.finishActiveWorkout);
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const doneCount = draft?.sets.filter((s) => s.done).length ?? 0;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Rest-Timer startet, sobald ein weiterer Satz abgehakt wird
  const [lastDone, setLastDone] = useState(doneCount);
  useEffect(() => {
    if (doneCount > lastDone) setRestEnd(Date.now() + REST_SECONDS * 1000);
    setLastDone(doneCount);
  }, [doneCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  useEffect(() => {
    if (restEnd && restLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setRestEnd(null);
    }
  }, [restLeft, restEnd]);

  if (!draft) return <Redirect href="/(tabs)" />;

  // Übungen in der Reihenfolge ihres ersten Auftretens
  const order = [...new Set(draft.sets.map((s) => s.exerciseId))];
  const elapsed = Math.floor((now - draft.startedAt) / 1000);

  const onFinish = () => {
    const result = finish();
    if (!result) {
      Alert.alert('Noch kein Satz abgeschlossen', 'Hake mindestens einen Satz mit gültigen Werten ab.');
      return;
    }
    router.replace('/workout/summary');
  };

  const onCancel = () =>
    Alert.alert('Workout verwerfen?', 'Alle Sätze dieses Workouts gehen verloren.', [
      { text: 'Weiter trainieren', style: 'cancel' },
      { text: 'Verwerfen', style: 'destructive', onPress: () => { discard(); router.back(); } },
    ]);

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Workout verwerfen" onPress={onCancel} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.timer} accessibilityLabel={`Dauer ${fmt(elapsed)}`}>{fmt(elapsed)}</Text>
          <View style={{ width: 26 }} />
        </View>

        {restEnd !== null && (
          <Pressable style={styles.rest} onPress={() => setRestEnd(null)} accessibilityLabel="Pause überspringen">
            <Text style={styles.restText}>Pause {fmt(restLeft)}</Text>
            <Text style={styles.restSkip}>Überspringen</Text>
          </Pressable>
        )}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {order.map((id) => {
            const ex = getExercise(id)!;
            const sets = draft.sets.filter((s) => s.exerciseId === id);
            return (
              <Card key={id} style={{ gap: spacing.md }}>
                <H2>{ex.name}</H2>
                {sets.map((s, i) => <SetRow key={s.key} s={s} index={i} />)}
                <Button variant="secondary" label="+ Satz hinzufügen" onPress={() => addSet(id)} />
              </Card>
            );
          })}

          <H2>Übung hinzufügen</H2>
          <View style={styles.chips}>
            {EXERCISES.filter((e) => !order.includes(e.id)).map((e) => (
              <Chip key={e.id} label={e.name} onPress={() => addSet(e.id)} />
            ))}
          </View>
          {order.length === 0 && <Body dim>Wähle eine Übung, um den ersten Satz anzulegen.</Body>}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={`Workout beenden (${doneCount} Sätze)`} onPress={onFinish} disabled={doneCount === 0} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, paddingBottom: spacing.md },
  timer: { ...font.h2, color: colors.text, fontVariant: ['tabular-nums'] },
  rest: { marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  restText: { ...font.h3, color: '#fff', fontVariant: ['tabular-nums'] },
  restSkip: { ...font.caption, color: '#ffffffcc' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxl },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, padding: spacing.xs },
  setIdx: { ...font.h3, color: colors.textTertiary, width: 22, textAlign: 'center' },
  setInput: { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...font.body, minHeight: 44, fontVariant: ['tabular-nums'] },
  check: { width: 44, height: 44, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
