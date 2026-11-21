import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { BarChart } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import { BadgeWall } from '../../components/profile/BadgeWall';
import { exerciseName } from '../../components/workout/ExercisePicker';
import { Avatar, Button, Card, ProgressBar, Screen, SegmentedControl, Stepper, Text } from '../../components/ui';
import { useMyRanks } from '../../hooks/useMyRanks';
import { useSession } from '../../hooks/useSession';
import { BADGES } from '../../lib/badges';
import { confirm } from '../../lib/confirm';
import { computeStats, earnedBadgeIds, oneRmSeries, trackedLifts, weeklyVolume } from '../../lib/profileStats';
import { rankLabel, scoreToRank } from '../../lib/ranking';
import { exerciseBySlug } from '../../lib/standards';
import { supabase } from '../../lib/supabase';
import { levelFromXp } from '../../lib/xp';
import { useOnboarding } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { useWorkout } from '../../stores/workout';
import { colors, radius, space } from '../../theme';

const LB = 2.20462;

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48 }}>
      <View style={{ flex: 1 }}>
        <Text>{label}</Text>
        {sub ? <Text variant="caption" color={colors.textTertiary}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const qc = useQueryClient();
  const settings = useSettings();
  const { language, unitSystem } = settings;
  const ob = useOnboarding();
  const { history, xp } = useWorkout();
  const session = useSession();
  const ranks = useMyRanks();
  const imp = unitSystem === 'imperial';
  const toUnit = (kg: number) => (imp ? Math.round(kg * LB) : kg);
  const wUnit = imp ? 'lbs' : 'kg';

  const server = useQuery({
    queryKey: ['my-profile', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const uid = session!.user.id;
      const [p, b] = await Promise.all([
        supabase.from('profiles').select('username, xp, level, longest_streak, is_private').eq('id', uid).single(),
        supabase.from('user_badges').select('badge_id').eq('user_id', uid),
      ]);
      return { profile: p.data, badges: (b.data ?? []).map((x) => x.badge_id as string) };
    },
  });

  const stats = useMemo(() => computeStats(history, {
    highestTier: ob.result ? scoreToRank(ob.result.overall).tier : 0,
  }), [history, ob.result]);
  const earned = useMemo(() => new Set([...earnedBadgeIds(stats), ...(server.data?.badges ?? [])]), [stats, server.data]);
  const lifts = useMemo(() => trackedLifts(history), [history]);
  const [lift, setLift] = useState<string | null>(null);
  const activeLift = lift ?? lifts[0] ?? null;
  const [weight, setWeight] = useState(ob.bodyweightKg);

  const totalXp = server.data?.profile?.xp ?? xp;
  const level = levelFromXp(totalXp);
  const overall = ranks.data?.overall != null ? scoreToRank(ranks.data.overall) : null;
  const name = server.data?.profile?.username ?? t('profile.guest');
  const weekNames = t('weekdays', { returnObjects: true }) as unknown as string[];
  const volume = weeklyVolume(history, 8).map((w) => ({ label: `${new Date(w.weekStart).getDate()}.${new Date(w.weekStart).getMonth() + 1}`, value: w.volumeKg }));
  const weightSeries = settings.weightLog.map((e) => ({ t: e.t, value: toUnit(e.kg) }));

  const updateProfile = async (patch: Record<string, unknown>) => {
    if (!session) return;
    await supabase.from('profiles').update(patch).eq('id', session.user.id);
  };

  const saveWeight = async () => {
    settings.logWeight(weight);
    ob.set({ bodyweightKg: weight });
    await updateProfile({ bodyweight_kg: weight });
  };

  const toggleReminders = async (v: boolean) => {
    if (v) {
      try { const r = await Notifications.requestPermissionsAsync(); if (!r.granted) return; } catch { /* Web */ }
    }
    settings.setReminders(v);
  };

  const signOut = async () => { await supabase.auth.signOut(); qc.clear(); };
  const deleteAccount = async () => {
    if (!(await confirm(t('profile.deleteQ'), t('profile.delete'), t('workout.cancel'), true))) return;
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
    if (error) { await confirm(t('profile.error', { msg: error.message }), 'OK', t('workout.cancel')); return; }
    await supabase.auth.signOut();
    resetLocal(true);
  };
  const resetLocal = async (skipAsk = false) => {
    if (!skipAsk && !(await confirm(t('profile.resetQ'), t('profile.resetLocal'), t('workout.cancel'), true))) return;
    useWorkout.setState({ active: null, history: [], bests: {}, lastSets: {}, xp: 0 });
    ob.reset();
    qc.clear();
    router.replace('/onboarding');
  };

  return (
    <Screen>
      {/* Kopf */}
      <View style={{ alignItems: 'center', gap: space[2], paddingTop: space[2] }}>
        <Avatar name={name} tier={overall?.tier} size={88} />
        <Text variant="h1">{name}</Text>
        <Text variant="caption" color={overall ? colors.tiers[overall.tier - 1] : colors.textTertiary}>
          {overall ? rankLabel(overall, language) : ''}{overall ? ' · ' : ''}{t('profile.level', { n: level.level })}
        </Text>
        {!session ? <Text variant="caption" color={colors.textTertiary}>{t('profile.local')}</Text> : null}
        <View style={{ alignSelf: 'stretch' }}><ProgressBar value={level.progress} /></View>
      </View>

      {/* Statistik */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
        {[
          [t('profile.workouts'), String(stats.workouts)],
          [t('profile.volume'), `${toUnit(stats.totalVolumeKg).toLocaleString(language)} ${wUnit}`],
          [t('profile.longestStreak'), t('profile.days', { count: Math.max(stats.longestStreak, server.data?.profile?.longest_streak ?? 0) })],
          [t('profile.prs'), String(stats.prs)],
        ].map(([l, v]) => (
          <Card key={l} style={{ flexBasis: '47%', flexGrow: 1, gap: space[1] }}>
            <Text variant="overline" color={colors.textSecondary}>{l}</Text>
            <Text variant="h2" tabular>{v}</Text>
          </Card>
        ))}
      </View>

      {/* Abzeichen */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="h2" accessibilityRole="header">{t('profile.badges')}</Text>
        <Text variant="caption" color={colors.textSecondary}>{t('profile.badgesCount', { n: earned.size, total: BADGES.length })}</Text>
      </View>
      <BadgeWall earned={earned} />

      {/* Verläufe */}
      <Text variant="h2" accessibilityRole="header">{t('profile.progress')}</Text>
      <Card style={{ gap: space[3] }}>
        <Text variant="h3">{t('profile.bodyweight')}</Text>
        <LineChart data={weightSeries} unit={wUnit} color={colors.accent} emptyText={t('profile.noData')} />
        <Stepper big={false} label={t('profile.bodyweight')} unit={wUnit} step={imp ? 1 : 0.5} min={imp ? 66 : 30} max={imp ? 660 : 300}
          value={toUnit(weight)} onChange={(v) => setWeight(imp ? Math.round((v / LB) * 10) / 10 : v)} />
        <Button size="m" variant="secondary" label={t('profile.logWeight')} onPress={saveWeight} />
      </Card>
      <Card style={{ gap: space[3] }}>
        <Text variant="h3">{t('profile.oneRm')}</Text>
        {lifts.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
            {lifts.map((s) => (
              <Pressable key={s} onPress={() => setLift(s)} accessibilityRole="button" accessibilityState={{ selected: s === activeLift }}
                style={{ paddingHorizontal: space[3], height: 32, justifyContent: 'center', borderRadius: radius.full, backgroundColor: s === activeLift ? colors.primary : colors.surface2 }}>
                <Text variant="caption">{exerciseName(exerciseBySlug(s), language, s)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : activeLift ? <Text variant="caption" color={colors.textSecondary}>{exerciseName(exerciseBySlug(activeLift), language, activeLift)}</Text> : null}
        <LineChart data={activeLift ? oneRmSeries(history, activeLift).map((p) => ({ t: p.t, value: toUnit(p.value) })) : []} unit={wUnit} emptyText={t('profile.noData')} />
      </Card>
      <Card style={{ gap: space[3] }}>
        <Text variant="h3">{t('profile.weeklyVolume')} ({wUnit})</Text>
        <BarChart data={volume.map((v) => ({ ...v, value: toUnit(v.value) }))} />
      </Card>

      {/* Einstellungen */}
      <Text variant="h2" accessibilityRole="header">{t('profile.settings')}</Text>
      <Card style={{ gap: space[3] }}>
        <Text variant="caption" color={colors.textSecondary}>{t('profile.language')}</Text>
        <SegmentedControl options={[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]} value={language}
          onChange={(l) => { settings.setLanguage(l); updateProfile({ language: l }); }} />
        <Text variant="caption" color={colors.textSecondary}>{t('profile.units')}</Text>
        <SegmentedControl options={[{ value: 'metric', label: 'kg / cm' }, { value: 'imperial', label: 'lbs / ft' }]} value={unitSystem}
          onChange={(u) => { settings.setUnitSystem(u); updateProfile({ unit_system: u }); }} />
        <Row label={t('profile.reminders')}>
          <Switch value={settings.remindersEnabled} onValueChange={toggleReminders} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor={colors.text} accessibilityLabel={t('profile.reminders')} />
        </Row>
        <Row label={t('profile.private')} sub={t('profile.privateSub')}>
          <Switch value={server.data?.profile?.is_private ?? settings.isPrivate} trackColor={{ true: colors.primary, false: colors.surface2 }} thumbColor={colors.text} accessibilityLabel={t('profile.private')}
            onValueChange={async (v) => { settings.setPrivate(v); await updateProfile({ is_private: v }); server.refetch(); }} />
        </Row>
        <Text variant="caption" color={colors.textTertiary}>{ob.trainingDays.map((d) => weekNames[d - 1]).join(' · ')}</Text>
      </Card>

      <Card style={{ gap: space[3] }}>
        <Text variant="h3">{t('profile.account')}</Text>
        {session ? (
          <>
            <Text variant="caption" color={colors.textSecondary}>{session.user.email}</Text>
            <Button size="m" variant="secondary" label={t('profile.signOut')} onPress={signOut} />
            <Button size="m" variant="danger" label={t('profile.delete')} onPress={deleteAccount} />
          </>
        ) : (
          <>
            <Button size="m" label={t('profile.signIn')} onPress={() => router.push({ pathname: '/onboarding', params: { step: 'account' } })} />
            <Button size="m" variant="ghost" label={t('profile.resetLocal')} onPress={() => resetLocal()} />
          </>
        )}
      </Card>
      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>{t('profile.version', { v: Constants.expoConfig?.version ?? '' })}</Text>
    </Screen>
  );
}
