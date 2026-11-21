import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, space } from '../../theme';
import { Text } from '../ui';

export function Calculating({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [n, setN] = useState(0);
  useEffect(() => {
    const ids = [700, 1400, 2100].map((ms, i) => setTimeout(() => setN(i + 1), ms));
    ids.push(setTimeout(onDone, 2700));
    return () => ids.forEach(clearTimeout);
  }, [onDone]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[6] }} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text variant="h2">{t('onboarding.calc.title')}</Text>
      <View style={{ gap: space[2] }}>
        {(['s1', 's2', 's3'] as const).slice(0, n).map((k) => (
          <Animated.View key={k} entering={FadeIn}><Text color={colors.success}>✓ {t(`onboarding.calc.${k}`)}</Text></Animated.View>
        ))}
      </View>
    </View>
  );
}
