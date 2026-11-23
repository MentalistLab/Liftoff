import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, H1, H2, Screen } from '@/components/ui';
import { levelFromXp } from '@/lib/xp';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';

const GOAL_LABEL = { muscle: 'Muskelaufbau', strength: 'Kraft', lose: 'Abnehmen', fit: 'Fit bleiben' } as const;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <Text style={styles.cap}>{label}</Text>
      <Text style={styles.stat}>{value}</Text>
    </Card>
  );
}

export default function Profile() {
  const profile = useStore((s) => s.profile)!;
  const history = useStore((s) => s.history).filter((w) => w.xp > 0);
  const streak = useStore((s) => s.streak);
  const xp = useStore((s) => s.xp);
  const updateProfile = useStore((s) => s.updateProfile);
  const reset = useStore((s) => s.reset);
  const volume = history.reduce((a, w) => a + w.volumeKg, 0);

  const confirmReset = () =>
    Alert.alert('Alle Daten löschen?', 'Dein Fortschritt und alle Workouts werden unwiderruflich gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { reset(); router.replace('/onboarding'); } },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <H1>{profile.name}</H1>
        <Body dim>Level {levelFromXp(xp).level} · {xp} XP · Ziel: {GOAL_LABEL[profile.goal]}</Body>

        <View style={styles.grid}>
          <Stat label="WORKOUTS" value={String(history.length)} />
          <Stat label="VOLUMEN" value={`${Math.round(volume / 1000 * 10) / 10} t`} />
        </View>
        <View style={styles.grid}>
          <Stat label="LÄNGSTER STREAK" value={String(streak.longest)} />
          <Stat label="KÖRPERGEWICHT" value={`${profile.bodyweightKg} kg`} />
        </View>

        <H2>Körpergewicht anpassen</H2>
        <View style={styles.grid}>
          <View style={{ flex: 1 }}><Button variant="secondary" label="− 0,5 kg" onPress={() => updateProfile({ bodyweightKg: Math.max(30, Math.round((profile.bodyweightKg - 0.5) * 10) / 10) })} /></View>
          <View style={{ flex: 1 }}><Button variant="secondary" label="+ 0,5 kg" onPress={() => updateProfile({ bodyweightKg: Math.min(250, Math.round((profile.bodyweightKg + 0.5) * 10) / 10) })} /></View>
        </View>
        <Body dim>Dein Körpergewicht beeinflusst deine Ränge.</Body>

        <Button variant="danger" label="Alle Daten löschen" onPress={confirmReset} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  grid: { flexDirection: 'row', gap: spacing.md },
  cap: { ...font.overline, color: colors.textTertiary },
  stat: { ...font.h2, color: colors.text, fontVariant: ['tabular-nums'] },
});
