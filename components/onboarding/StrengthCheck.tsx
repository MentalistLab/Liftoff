import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { exerciseBySlug, ONBOARDING_LIFTS } from '../../lib/standards';
import { useOnboarding } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { colors, radius, space } from '../../theme';
import { Card, Stepper, Text } from '../ui';

const DEFAULTS: Record<string, { weightKg?: number; reps: number }> = {
  bench_press: { weightKg: 60, reps: 5 }, back_squat: { weightKg: 80, reps: 5 }, deadlift: { weightKg: 100, reps: 5 },
  pull_up: { reps: 5 }, push_up: { reps: 20 },
};

export function StrengthCheck() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const { lifts, setLift } = useOnboarding();
  return (
    <View style={{ gap: space[3] }}>
      {ONBOARDING_LIFTS.map((slug) => {
        const ex = exerciseBySlug(slug)!;
        const name = lang === 'de' ? ex.nameDe : ex.nameEn;
        const v = lifts[slug];
        const unknown = v === null || v === undefined;
        const weighted = ex.rankingType === 'weight_ratio';
        return (
          <Card key={slug} style={{ gap: space[3] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h3">{name}</Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: unknown }}
                accessibilityLabel={`${name}: ${t('onboarding.strength.unknown')}`}
                onPress={() => { Haptics.selectionAsync(); setLift(slug, unknown ? { ...DEFAULTS[slug] } : null); }}
                style={{ paddingVertical: space[1], paddingHorizontal: space[3], borderRadius: radius.full, borderWidth: 1, borderColor: unknown ? colors.primary : colors.border, backgroundColor: unknown ? '#6C5CFF22' : 'transparent' }}
              >
                <Text variant="caption" color={unknown ? colors.text : colors.textSecondary}>{t('onboarding.strength.unknown')}</Text>
              </Pressable>
            </View>
            {!unknown ? (
              <View style={{ gap: space[2] }}>
                {weighted ? (
                  <Stepper big={false} label={`${name} ${t('onboarding.strength.weight')}`} value={v.weightKg ?? 0} min={0} max={400} step={2.5} unit="kg"
                    onChange={(w) => setLift(slug, { ...v, weightKg: w })} />
                ) : null}
                <Stepper big={false} label={`${name} ${t('onboarding.strength.reps')}`} value={v.reps ?? 1} min={1} max={weighted ? 12 : 100} unit={t('onboarding.strength.reps')}
                  onChange={(r) => setLift(slug, { ...v, reps: r })} />
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
