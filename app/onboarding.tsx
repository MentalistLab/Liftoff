import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountStep } from '../components/onboarding/AccountStep';
import { Calculating } from '../components/onboarding/Calculating';
import { PlanPreview } from '../components/onboarding/PlanPreview';
import { RankReveal } from '../components/onboarding/RankReveal';
import { StrengthCheck } from '../components/onboarding/StrengthCheck';
import { Button, OptionCard, ProgressBar, RankBadge, SegmentedControl, Stepper, Text } from '../components/ui';
import { computeOnboardingRanks } from '../lib/onboardingRanks';
import { useOnboarding } from '../stores/onboarding';
import { useSettings } from '../stores/settings';
import { colors, space } from '../theme';

const STEPS = ['welcome', 'language', 'goal', 'experience', 'gender', 'age', 'weight', 'height', 'location', 'days', 'strength', 'calc', 'reveal', 'plan', 'notify', 'account'] as const;
type Step = (typeof STEPS)[number];
const LB = 2.20462;

export default function Onboarding() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const ob = useOnboarding();
  const { language, setLanguage, unitSystem, setUnitSystem } = useSettings();
  const [i, setI] = useState(0);
  const step: Step = STEPS[i];
  const next = useCallback(() => setI((n) => Math.min(STEPS.length - 1, n + 1)), []);
  const back = () => setI((n) => Math.max(0, step === 'reveal' ? n - 2 : n - 1));

  const finish = () => { ob.complete(); router.replace('/home'); };
  const runCalc = useCallback(() => {
    const s = useOnboarding.getState();
    s.setResult(computeOnboardingRanks({
      gender: s.gender ?? 'none', age: s.age, bodyweightKg: s.bodyweightKg, experience: s.experience ?? 'beginner', lifts: s.lifts,
    }));
    next();
  }, [next]);

  const canContinue: Partial<Record<Step, boolean>> = {
    goal: !!ob.goal, experience: !!ob.experience, gender: !!ob.gender, location: !!ob.location, days: ob.trainingDays.length >= 2,
  };
  const title = (k: string) => <Text variant="h1" accessibilityRole="header">{t(`onboarding.${k}.title`)}</Text>;
  const sub = (k: string, o?: object) => <Text color={colors.textSecondary}>{t(`onboarding.${k}.sub`, o)}</Text>;
  const options = <K extends string>(key: string, values: K[], value: K | null, set: (v: K) => void, emoji?: Record<K, string>) => (
    <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
      {values.map((v) => (
        <OptionCard key={v} title={t(`onboarding.${key}.${v}`)} subtitle={t(`onboarding.${key}.${v}_sub`, { defaultValue: '' }) || undefined}
          emoji={emoji?.[v]} selected={value === v} onPress={() => set(v)} />
      ))}
    </View>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = <Button label={t('onboarding.next')} onPress={next} disabled={canContinue[step] === false} />;

  switch (step) {
    case 'welcome':
      body = (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: space[6], paddingTop: space[14] }}>
          <RankBadge tier={7} division={3} size={130} lang={language} />
          <Text variant="display" style={{ textAlign: 'center' }}>{t('onboarding.welcome.title')}</Text>
          <Text color={colors.textSecondary} style={{ textAlign: 'center' }}>{t('onboarding.welcome.sub')}</Text>
        </View>
      );
      footer = (
        <View style={{ gap: space[2] }}>
          <Button label={t('onboarding.welcome.start')} onPress={next} />
          <Button label={t('onboarding.welcome.login')} variant="ghost" onPress={() => setI(STEPS.indexOf('account'))} />
        </View>
      );
      break;
    case 'language':
      body = <>{title('language')}{options('_lang', ['de', 'en'] as const, language, setLanguage, { de: '🇩🇪', en: '🇬🇧' })}</>;
      break;
    case 'goal':
      body = <>{title('goal')}{options('goal', ['muscle', 'strength', 'fat_loss', 'fitness'], ob.goal, (goal) => ob.set({ goal }), { muscle: '💪', strength: '🏋️', fat_loss: '🔥', fitness: '🌿' })}</>;
      break;
    case 'experience':
      body = <>{title('experience')}{options('experience', ['beginner', 'intermediate', 'advanced'], ob.experience, (experience) => ob.set({ experience }), { beginner: '🌱', intermediate: '⚡', advanced: '🏆' })}</>;
      break;
    case 'gender':
      body = <>{title('gender')}{sub('gender')}{options('gender', ['male', 'female', 'none'], ob.gender, (gender) => ob.set({ gender }))}</>;
      break;
    case 'age':
      body = <>{title('age')}<View style={{ paddingTop: space[10] }}><Stepper label={t('onboarding.age.title')} value={ob.age} min={13} max={90} unit={t('onboarding.age.unit')} onChange={(age) => ob.set({ age })} /></View></>;
      break;
    case 'weight': {
      const imp = unitSystem === 'imperial';
      body = (
        <>
          {title('weight')}{sub('weight')}
          <SegmentedControl options={[{ value: 'metric', label: 'kg' }, { value: 'imperial', label: 'lbs' }]} value={unitSystem} onChange={setUnitSystem} />
          <View style={{ paddingTop: space[8] }}>
            <Stepper label={t('onboarding.weight.title')} unit={imp ? 'lbs' : 'kg'} step={imp ? 1 : 0.5} min={imp ? 66 : 30} max={imp ? 660 : 300}
              value={imp ? Math.round(ob.bodyweightKg * LB) : ob.bodyweightKg}
              onChange={(v) => ob.set({ bodyweightKg: imp ? Math.round((v / LB) * 10) / 10 : v })} />
          </View>
        </>
      );
      break;
    }
    case 'height': {
      const imp = unitSystem === 'imperial';
      const inches = Math.round(ob.heightCm / 2.54);
      body = (
        <>
          {title('height')}
          <SegmentedControl options={[{ value: 'metric', label: 'cm' }, { value: 'imperial', label: 'ft / in' }]} value={unitSystem} onChange={setUnitSystem} />
          <View style={{ paddingTop: space[8], gap: space[2] }}>
            <Stepper label={t('onboarding.height.title')} unit={imp ? 'in' : 'cm'} min={imp ? 39 : 100} max={imp ? 98 : 250}
              value={imp ? inches : ob.heightCm} onChange={(v) => ob.set({ heightCm: imp ? Math.round(v * 2.54) : v })} />
            {imp ? <Text variant="h3" color={colors.textSecondary} style={{ textAlign: 'center' }}>{Math.floor(inches / 12)}′ {inches % 12}″</Text> : null}
          </View>
        </>
      );
      break;
    }
    case 'location':
      body = <>{title('location')}{options('location', ['gym', 'home_dumbbells', 'bodyweight'], ob.location, (location) => ob.set({ location }), { gym: '🏢', home_dumbbells: '🏠', bodyweight: '🤸' })}</>;
      break;
    case 'days': {
      const names = t('weekdays', { returnObjects: true }) as unknown as string[];
      const toggle = (d: number) => {
        const has = ob.trainingDays.includes(d);
        if (!has && ob.trainingDays.length >= 6) return;
        ob.set({ trainingDays: has ? ob.trainingDays.filter((x) => x !== d) : [...ob.trainingDays, d].sort() });
      };
      body = (
        <>
          {title('days')}{sub('days', { count: ob.trainingDays.length })}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {names.map((n, idx) => {
              const d = idx + 1, on = ob.trainingDays.includes(d);
              return (
                <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={n} onPress={() => toggle(d)}
                  style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : colors.surface }}>
                  <Text variant="h3">{n}</Text>
                </Pressable>
              );
            })}
          </View>
          {ob.trainingDays.length < 2 ? <Text variant="caption" color={colors.warning}>{t('onboarding.days.min')}</Text> : null}
        </>
      );
      break;
    }
    case 'strength':
      body = <>{title('strength')}{sub('strength')}<StrengthCheck /></>;
      footer = <Button label={t('onboarding.next')} onPress={next} />;
      break;
    case 'calc':
      body = <Calculating onDone={runCalc} />;
      footer = null;
      break;
    case 'reveal':
      body = ob.result ? <RankReveal result={ob.result} /> : null;
      break;
    case 'plan':
      body = <>{title('plan')}{sub('plan')}<PlanPreview data={ob} scores={ob.result?.muscleScores} /></>;
      break;
    case 'notify':
      body = (
        <View style={{ flex: 1, justifyContent: 'center', gap: space[4], paddingTop: space[14] }}>
          <Text variant="display" style={{ textAlign: 'center' }}>🔔</Text>
          {title('notify')}{sub('notify')}
        </View>
      );
      footer = (
        <View style={{ gap: space[2] }}>
          <Button label={t('onboarding.notify.allow')} onPress={async () => { try { await Notifications.requestPermissionsAsync(); } catch { /* Web/Expo Go */ } next(); }} />
          <Button label={t('onboarding.notify.later')} variant="ghost" onPress={next} />
        </View>
      );
      break;
    case 'account':
      body = <>{title('account')}{sub('account')}<AccountStep onDone={finish} /></>;
      footer = null;
      break;
  }

  const showChrome = step !== 'welcome' && step !== 'calc';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {showChrome ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingTop: space[2] }}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={t('onboarding.back')} hitSlop={12} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
            <Text variant="h2">‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}><ProgressBar value={i / (STEPS.length - 1)} height={6} /></View>
          {step === 'strength' ? (
            <Pressable onPress={next} accessibilityRole="button" hitSlop={12}><Text variant="caption" color={colors.textSecondary}>{t('onboarding.skip')}</Text></Pressable>
          ) : <View style={{ width: 44 }} />}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space[4] }} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.duration(250)} exiting={FadeOutLeft.duration(150)} style={{ flex: 1, gap: space[4] }}>
          {body}
        </Animated.View>
      </ScrollView>
      {footer ? <View style={{ padding: space[4], paddingTop: space[2] }}>{footer}</View> : null}
    </SafeAreaView>
  );
}
