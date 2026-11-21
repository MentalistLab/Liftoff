import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { BackHeader, Card, Kristo, Screen, Text } from '../../components/ui';
import { formatDuration } from '../../lib/workoutSummary';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, space } from '../../theme';

export default function History() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const history = useWorkout((s) => s.history);
  return (
    <Screen>
      <BackHeader title={t('feat.history')} label={t('onboarding.back')} />
      {history.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: space[3] }}>
          <Kristo pose="sleepy" size={90} />
          <Text color={colors.textSecondary} style={{ textAlign: 'center' }}>{t('feat.historyEmpty')}</Text>
        </Card>
      ) : history.map((w) => (
        <Pressable key={w.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/history/[id]', params: { id: w.id } })}>
          <Card style={{ gap: space[1] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
              <Text variant="h3" style={{ flex: 1 }} numberOfLines={1}>{w.title}</Text>
              <Text variant="caption" color={colors.textSecondary}>{new Date(w.endedAt).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            </View>
            <Text variant="caption" color={colors.textSecondary}>
              {formatDuration(w.summary.durationS)} · {t('feat.sets', { count: w.summary.completedSets })} · {w.summary.volumeKg.toLocaleString(lang)} kg
              {w.summary.prs.length ? `  ·  🏆 ${w.summary.prs.length}` : ''}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
