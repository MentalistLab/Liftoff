import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { MUSCLE_LABELS } from '@/data/exercises';
import { RankBadge } from '@/components/RankBadge';
import { Body, Button, Card, Chip, H1, H2, ProgressBar, Screen } from '@/components/ui';
import { Gender, rankName } from '@/lib/ranking';
import { computeRanksFromSets } from '@/lib/selectors';
import { LoggedSet } from '@/lib/workout';
import { Goal, useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';

const STEPS = ['welcome', 'name', 'goal', 'gender', 'age', 'weight', 'days', 'strength', 'calc', 'reveal'] as const;
type Step = (typeof STEPS)[number];

const GOALS: { id: Goal; label: string; sub: string }[] = [
  { id: 'muscle', label: 'Muskelaufbau', sub: 'Mehr Masse und Definition' },
  { id: 'strength', label: 'Kraft', sub: 'Schwerer heben, stärker werden' },
  { id: 'lose', label: 'Abnehmen', sub: 'Fett verlieren, Muskeln erhalten' },
  { id: 'fit', label: 'Fit bleiben', sub: 'Gesund und leistungsfähig' },
];

const LIFTS = [
  { id: 'bench', label: 'Bankdrücken' },
  { id: 'squat', label: 'Kniebeuge' },
  { id: 'deadlift', label: 'Kreuzheben' },
] as const;

const num = (s: string) => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

function Stepper({ value, onChange, min, max, step = 1, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string }) {
  const set = (v: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  };
  return (
    <View style={{ alignItems: 'center', gap: spacing.xl }}>
      <Text style={styles.bigNumber} accessibilityLabel={`${value} ${unit}`}>
        {value}
        <Text style={styles.bigUnit}> {unit}</Text>
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Pressable accessibilityLabel="Weniger" style={styles.round} onPress={() => set(value - step)}><Text style={styles.roundText}>−</Text></Pressable>
        <Pressable accessibilityLabel="Mehr" style={styles.round} onPress={() => set(value + step)}><Text style={styles.roundText}>+</Text></Pressable>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [i, setI] = useState(0);
  const step: Step = STEPS[i];

  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('muscle');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(75);
  const [days, setDays] = useState(3);
  const [lifts, setLifts] = useState<Record<string, { kg: string; reps: string }>>({});
  const [pullups, setPullups] = useState('');
  const [pushups, setPushups] = useState('');

  const checkIn = useMemo<LoggedSet[]>(() => {
    const out: LoggedSet[] = [];
    for (const l of LIFTS) {
      const kg = num(lifts[l.id]?.kg ?? '');
      if (kg > 0) out.push({ exerciseId: l.id, weightKg: kg, reps: Math.round(num(lifts[l.id]?.reps ?? '')) || 1 });
    }
    if (num(pullups) > 0) out.push({ exerciseId: 'pullup', weightKg: 0, reps: Math.round(num(pullups)) });
    if (num(pushups) > 0) out.push({ exerciseId: 'pushup', weightKg: 0, reps: Math.round(num(pushups)) });
    return out;
  }, [lifts, pullups, pushups]);

  const athlete = { gender, age, bodyweightKg: weight };
  const ranks = useMemo(() => computeRanksFromSets(checkIn, athlete), [checkIn, gender, age, weight]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => setI((v) => Math.min(STEPS.length - 1, v + 1));
  const back = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    if (step === 'calc') {
      const t = setTimeout(next, 2200);
      return () => clearTimeout(t);
    }
    if (step === 'reveal') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [step]);

  const finish = () => {
    completeOnboarding(
      { name: name.trim() || 'Athlet', gender, age, bodyweightKg: weight, goal, trainingDays: days },
      checkIn,
    );
    router.replace('/(tabs)');
  };

  const topMuscles = ranks.muscles.filter((m) => m.rank).sort((a, b) => b.rank!.score - a.rank!.score).slice(0, 3);
  const progress = i / (STEPS.length - 1);

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step !== 'welcome' && step !== 'calc' && step !== 'reveal' && (
          <View style={styles.top}>
            <Pressable accessibilityLabel="Zurück" onPress={back} hitSlop={12}><Text style={styles.backText}>‹ Zurück</Text></Pressable>
            <View style={{ flex: 1 }}><ProgressBar value={progress} /></View>
          </View>
        )}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View key={step} entering={FadeInDown.duration(300)} style={{ gap: spacing.xxl, flexGrow: 1 }}>
            {step === 'welcome' && (
              <View style={{ alignItems: 'center', gap: spacing.xxl, paddingTop: 64 }}>
                <Animated.View entering={ZoomIn.springify()}><RankBadge rank={{ score: 60, tier: 5, division: 2 }} size={140} /></Animated.View>
                <Text style={styles.display}>Finde heraus, wie stark du wirklich bist.</Text>
                <Body dim>Logge deine Workouts, steige im Rang auf und miss dich mit dir selbst.</Body>
              </View>
            )}

            {step === 'name' && (<>
              <H1>Wie heißt du?</H1>
              <TextInput value={name} onChangeText={setName} placeholder="Dein Name" placeholderTextColor={colors.textTertiary} style={styles.input} maxLength={24} accessibilityLabel="Name" />
            </>)}

            {step === 'goal' && (<>
              <H1>Was ist dein Ziel?</H1>
              <View style={{ gap: spacing.md }}>
                {GOALS.map((g) => (
                  <Pressable key={g.id} accessibilityRole="button" accessibilityState={{ selected: goal === g.id }}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); setGoal(g.id); }}>
                    <Card style={goal === g.id ? { borderColor: colors.primary, backgroundColor: colors.surface2 } : undefined}>
                      <H2>{g.label}</H2><Body dim>{g.sub}</Body>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </>)}

            {step === 'gender' && (<>
              <H1>Dein Geschlecht</H1>
              <Body dim>Wird nur für die Kraftnormen deiner Ränge verwendet.</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                <Chip label="Männlich" selected={gender === 'male'} onPress={() => setGender('male')} />
                <Chip label="Weiblich" selected={gender === 'female'} onPress={() => setGender('female')} />
                <Chip label="Keine Angabe" selected={gender === 'other'} onPress={() => setGender('other')} />
              </View>
            </>)}

            {step === 'age' && (<><H1>Wie alt bist du?</H1><Stepper value={age} onChange={setAge} min={14} max={90} unit="Jahre" /></>)}
            {step === 'weight' && (<><H1>Dein Körpergewicht</H1><Stepper value={weight} onChange={setWeight} min={30} max={250} step={0.5} unit="kg" /></>)}

            {step === 'days' && (<>
              <H1>Wie oft pro Woche willst du trainieren?</H1>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {[2, 3, 4, 5, 6].map((d) => <Chip key={d} label={`${d}×`} selected={days === d} onPress={() => setDays(d)} />)}
              </View>
              <Body dim>Ruhetage brechen deinen Streak nicht – Hauptsache, du bleibst dran.</Body>
            </>)}

            {step === 'strength' && (<>
              <H1>Kraft-Check</H1>
              <Body dim>Optional: Trage deine besten Sätze ein, um sofort deinen Rang zu sehen. Leer lassen = überspringen.</Body>
              {LIFTS.map((l) => (
                <View key={l.id} style={{ gap: spacing.sm }}>
                  <H2>{l.label}</H2>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <TextInput style={[styles.input, { flex: 1 }]} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={colors.textTertiary}
                      value={lifts[l.id]?.kg ?? ''} accessibilityLabel={`${l.label} Gewicht in kg`}
                      onChangeText={(t) => setLifts((p) => ({ ...p, [l.id]: { kg: t, reps: p[l.id]?.reps ?? '' } }))} />
                    <TextInput style={[styles.input, { flex: 1 }]} keyboardType="number-pad" placeholder="Wdh." placeholderTextColor={colors.textTertiary}
                      value={lifts[l.id]?.reps ?? ''} accessibilityLabel={`${l.label} Wiederholungen`}
                      onChangeText={(t) => setLifts((p) => ({ ...p, [l.id]: { kg: p[l.id]?.kg ?? '', reps: t } }))} />
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1, gap: spacing.sm }}><H2>Klimmzüge</H2>
                  <TextInput style={styles.input} keyboardType="number-pad" placeholder="Wdh." placeholderTextColor={colors.textTertiary} value={pullups} onChangeText={setPullups} accessibilityLabel="Klimmzüge Wiederholungen" /></View>
                <View style={{ flex: 1, gap: spacing.sm }}><H2>Liegestütze</H2>
                  <TextInput style={styles.input} keyboardType="number-pad" placeholder="Wdh." placeholderTextColor={colors.textTertiary} value={pushups} onChangeText={setPushups} accessibilityLabel="Liegestütze Wiederholungen" /></View>
              </View>
            </>)}

            {step === 'calc' && (
              <View style={{ alignItems: 'center', gap: spacing.xl, paddingTop: 140 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <H2>Analysiere deine Stärke…</H2>
              </View>
            )}

            {step === 'reveal' && (
              <View style={{ alignItems: 'center', gap: spacing.xl, paddingTop: 48 }}>
                <Animated.View entering={ZoomIn.springify().damping(12)}><RankBadge rank={ranks.overall} size={170} /></Animated.View>
                <Animated.View entering={FadeIn.delay(500)} style={{ alignItems: 'center', gap: spacing.sm }}>
                  <Text style={styles.display}>{ranks.overall ? rankName(ranks.overall) : 'Noch ungerankt'}</Text>
                  <Body dim>{ranks.overall ? 'Dein Start-Rang. Jetzt wird es Zeit, ihn zu verbessern.' : 'Absolviere dein erstes Workout, um deinen Rang zu erhalten.'}</Body>
                </Animated.View>
                {topMuscles.length > 0 && (
                  <Animated.View entering={FadeIn.delay(900)} style={{ width: '100%' }}>
                    <Card style={{ gap: spacing.md }}>
                      <Text style={styles.cap}>DEINE STÄRKSTEN MUSKELGRUPPEN</Text>
                      {topMuscles.map((m) => (
                        <View key={m.muscle} style={styles.row}>
                          <Body>{MUSCLE_LABELS[m.muscle]}</Body>
                          <Body dim>{rankName(m.rank!)}</Body>
                        </View>
                      ))}
                    </Card>
                  </Animated.View>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {step !== 'calc' && (
          <View style={styles.footer}>
            {step === 'welcome' && <Button label="Los geht’s" onPress={next} />}
            {step === 'strength' && <Button label={checkIn.length ? 'Rang berechnen' : 'Überspringen'} onPress={next} />}
            {step === 'reveal' && <Button label="Training starten" onPress={finish} />}
            {step !== 'welcome' && step !== 'strength' && step !== 'reveal' && (
              <Button label="Weiter" onPress={next} disabled={false} />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  backText: { ...font.body, color: colors.textSecondary },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1 },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxl },
  display: { ...font.display, color: colors.text, textAlign: 'center' },
  bigNumber: { fontSize: 72, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 24, color: colors.textSecondary },
  round: { width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 36, color: colors.text, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, color: colors.text, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...font.body, minHeight: 52 },
  cap: { ...font.overline, color: colors.textTertiary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
