import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { OnboardingRankResult } from '../../lib/onboardingRanks';
import { rankLabel, scoreToRank } from '../../lib/ranking';
import { useSettings } from '../../stores/settings';
import { colors, radius, shadow, space } from '../../theme';
import { CountUp } from '../fx/CountUp';
import { Confetti } from '../fx/Confetti';
import { Card, RankBadge, Text } from '../ui';

export function RankReveal({ result }: { result: OnboardingRankResult }) {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const rank = scoreToRank(result.overall);
  const color = colors.tiers[rank.tier - 1];

  const scale = useSharedValue(0.2);
  const rot = useSharedValue(-25);
  const glow = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 9, stiffness: 120 });
    rot.value = withSpring(0, { damping: 10 });
    glow.value = withDelay(500, withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0.4, { duration: 1100 })), -1));
    const h = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 250);
    return () => clearTimeout(h);
  }, [scale, rot, glow]);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space[5] }}>
      <Confetti />
      <Text variant="overline" color={colors.textSecondary}>{t('onboarding.reveal.your')}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: 170, height: 170, borderRadius: radius.full, backgroundColor: color + '33' }, shadow.glow(color), glowStyle]} />
        <Animated.View style={badgeStyle}><RankBadge tier={rank.tier} division={rank.division} size={140} lang={lang} /></Animated.View>
      </View>
      <Animated.View entering={FadeInUp.delay(500)} style={{ alignItems: 'center', gap: space[2] }}>
        <Text variant="display" color={color}>{rankLabel(rank, lang)}</Text>
        <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {t('onboarding.reveal.stronger', { pct: result.percentile })}
        </Text>
        <CountUp to={result.percentile} suffix=" %" variant="h1" color={colors.accent} delay={600} />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(900)} style={{ alignSelf: 'stretch', gap: space[2] }}>
        <Text variant="h3">{t('onboarding.reveal.top')}</Text>
        {result.top.map((m) => {
          const r = scoreToRank(result.muscleScores[m]!);
          return (
            <Card key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] }}>
              <RankBadge tier={r.tier} division={r.division} size={30} lang={lang} />
              <Text variant="h3" style={{ flex: 1 }}>{t(`muscles.${m}`)}</Text>
              <Text variant="caption" color={colors.tiers[r.tier - 1]}>{rankLabel(r, lang)}</Text>
            </Card>
          );
        })}
        {result.estimated.length > 0 ? <Text variant="caption" color={colors.textTertiary}>{t('onboarding.reveal.estimated')}</Text> : null}
      </Animated.View>
    </View>
  );
}
