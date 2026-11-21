import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, ProgressBar, Screen, Text } from '../../components/ui';
import { DEMO_PROFILE } from '../../lib/demo';
import { levelFromXp } from '../../lib/xp';
import { colors, gradients, radius, space } from '../../theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const p = DEMO_PROFILE;
  const lp = levelFromXp(p.xp);
  return (
    <Screen>
      <Text variant="h1">{t('home.greeting', { name: p.displayName })}</Text>
      <LinearGradient colors={gradients.streak} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: space[4] }}>
        <Text variant="h3">🔥 {t('home.streak', { count: p.currentStreak })}</Text>
      </LinearGradient>
      <Card style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="h3">{t('home.level', { level: lp.level })}</Text>
          <Text variant="caption" color={colors.textSecondary} tabular>{lp.xpIntoLevel} / {lp.xpForNext} XP</Text>
        </View>
        <ProgressBar value={lp.progress} />
      </Card>
      <Card style={{ gap: space[2] }}>
        <Text variant="overline" color={colors.textSecondary}>{t('home.today')}</Text>
        <Text color={colors.textTertiary}>{t('common.soon')}</Text>
      </Card>
    </Screen>
  );
}
