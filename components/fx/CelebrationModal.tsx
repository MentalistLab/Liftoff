// Zeigt die Erfolgs-Warteschlange nacheinander als Modal (Rang-Aufstieg, Abzeichen, Liga, Streak).
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BADGES } from '../../lib/badges';
import { LEAGUE_NAMES } from '../../lib/league';
import { rankLabel } from '../../lib/ranking';
import { exerciseBySlug } from '../../lib/standards';
import { useCelebrations, type Celebration } from '../../stores/celebrations';
import { useSettings } from '../../stores/settings';
import { colors, radius, shadow, space } from '../../theme';
import { Button, Kristo, RankBadge, Text, type KristoPose } from '../ui';
import { useKristoColor } from '../../hooks/useKristoColor';
import { Confetti } from './Confetti';

type T = (k: string, o?: object) => string;

function content(c: Celebration, t: T, lang: 'de' | 'en'): { emoji?: string; badge?: { tier: number; division: number }; from?: string; title: string; sub: string; color: string; party: boolean; pose: KristoPose } {
  switch (c.kind) {
    case 'rank_up': {
      const ex = exerciseBySlug(c.slug);
      return { badge: c, from: c.fromTier ? rankLabel({ tier: c.fromTier, division: c.fromDivision ?? 1 }, lang) : undefined, title: rankLabel(c, lang), sub: t('cel.rankUpSub', { name: ex ? (lang === 'de' ? ex.nameDe : ex.nameEn) : c.slug, rank: rankLabel(c, lang) }), color: colors.tiers[c.tier - 1], party: true, pose: 'cheer' };
    }
    case 'badge': {
      const b = BADGES.find((x) => x.id === c.id);
      return { title: t('cel.badge'), sub: b ? `${lang === 'de' ? b.nameDe : b.nameEn} – ${lang === 'de' ? b.descDe : b.descEn}` : c.id, color: colors.warning, party: true, pose: 'cheer' };
    }
    case 'league': {
      const name = LEAGUE_NAMES[lang][c.tier - 1];
      return {
        emoji: c.result === 'promoted' ? '🚀' : c.result === 'demoted' ? '📉' : '🛡️',
        title: t(`cel.league_${c.result}`),
        sub: c.position ? t('cel.leagueSub', { pos: c.position, name }) : t('cel.leagueSubNoPos', { name }),
        color: c.result === 'promoted' ? colors.success : c.result === 'demoted' ? colors.danger : colors.leagues[c.tier - 1],
        party: c.result === 'promoted',
        pose: c.result === 'demoted' ? 'sleepy' : 'cheer',
      };
    }
    case 'streak_lost':
      return { title: t('cel.streakLost'), sub: t('cel.streakLostSub', { n: c.lost }), color: colors.textSecondary, party: false, pose: 'sleepy' };
    case 'streak_freeze':
      return { title: t('cel.streakFreeze'), sub: t('cel.streakFreezeSub', { n: c.freezes }), color: colors.frost, party: false, pose: 'happy' };
  }
}

export function CelebrationModal() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as T;
  const lang = useSettings((s) => s.language);
  const current = useCelebrations((s) => s.queue[0]);
  const pop = useCelebrations((s) => s.pop);
  const kristo = useKristoColor();
  useEffect(() => {
    if (current) Haptics.notificationAsync(current.kind === 'streak_lost' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
  }, [current]);
  if (!current) return null;
  const c = content(current, t, lang);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={pop}>
      <View style={{ flex: 1, backgroundColor: '#000000B3', alignItems: 'center', justifyContent: 'center', padding: space[6] }}>
        {c.party ? <Confetti count={50} /> : null}
        <Animated.View key={JSON.stringify(current)} entering={ZoomIn.springify().damping(12)} accessibilityViewIsModal accessibilityLiveRegion="assertive"
          style={[{ width: '100%', maxWidth: 360, alignItems: 'center', gap: space[3], padding: space[6], borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 2, borderColor: c.color }, shadow.glow(c.color)]}>
          {c.badge ? (
            <>
              <Text variant="overline" color={colors.textSecondary}>{t('cel.rankUp')}</Text>
              <RankBadge tier={c.badge.tier} division={c.badge.division} size={120} lang={lang} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                {c.from ? <Text variant="h2" color={colors.textSecondary}>{c.from}  →</Text> : null}
                <Text variant="display" color={c.color} accessibilityRole="header">{c.title}</Text>
              </View>
            </>
          ) : (
            <>
              {c.emoji ? <Text style={{ fontSize: 56, lineHeight: 68 }}>{c.emoji}</Text> : <Kristo color={kristo} pose={c.pose} size={110} />}
              <Text variant="h1" color={c.color} style={{ textAlign: 'center' }} accessibilityRole="header">{c.title}</Text>
            </>
          )}
          <Text color={colors.textSecondary} style={{ textAlign: 'center' }}>{c.sub}</Text>
          {c.badge ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], alignSelf: 'stretch', padding: space[3], borderRadius: radius.lg, backgroundColor: colors.surface2 }}>
              <Kristo color={c.color} pose="cheer" size={56} />
              <Text variant="h2" style={{ flex: 1 }}>{t('cel.kristoCheers')}</Text>
            </View>
          ) : null}
          <Button label={t('cel.next')} onPress={pop} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}
