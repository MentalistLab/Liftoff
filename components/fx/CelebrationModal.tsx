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
import { Button, RankBadge, Text } from '../ui';
import { Confetti } from './Confetti';

type T = (k: string, o?: object) => string;

function content(c: Celebration, t: T, lang: 'de' | 'en'): { emoji?: string; badge?: { tier: number; division: number }; title: string; sub: string; color: string; party: boolean } {
  switch (c.kind) {
    case 'rank_up': {
      const ex = exerciseBySlug(c.slug);
      return { badge: c, title: t('cel.rankUp'), sub: t('cel.rankUpSub', { name: ex ? (lang === 'de' ? ex.nameDe : ex.nameEn) : c.slug, rank: rankLabel(c, lang) }), color: colors.tiers[c.tier - 1], party: true };
    }
    case 'badge': {
      const b = BADGES.find((x) => x.id === c.id);
      return { emoji: '🏅', title: t('cel.badge'), sub: b ? `${lang === 'de' ? b.nameDe : b.nameEn} – ${lang === 'de' ? b.descDe : b.descEn}` : c.id, color: colors.warning, party: true };
    }
    case 'league': {
      const name = LEAGUE_NAMES[lang][c.tier - 1];
      return {
        emoji: c.result === 'promoted' ? '🚀' : c.result === 'demoted' ? '📉' : '🛡️',
        title: t(`cel.league_${c.result}`),
        sub: c.position ? t('cel.leagueSub', { pos: c.position, name }) : t('cel.leagueSubNoPos', { name }),
        color: c.result === 'promoted' ? colors.success : c.result === 'demoted' ? colors.danger : colors.leagues[c.tier - 1],
        party: c.result === 'promoted',
      };
    }
    case 'streak_lost':
      return { emoji: '🧊', title: t('cel.streakLost'), sub: t('cel.streakLostSub', { n: c.lost }), color: colors.textSecondary, party: false };
    case 'streak_freeze':
      return { emoji: '❄️', title: t('cel.streakFreeze'), sub: t('cel.streakFreezeSub', { n: c.freezes }), color: colors.accent, party: false };
  }
}

export function CelebrationModal() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as T;
  const lang = useSettings((s) => s.language);
  const current = useCelebrations((s) => s.queue[0]);
  const pop = useCelebrations((s) => s.pop);
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
          {c.badge ? <RankBadge tier={c.badge.tier} division={c.badge.division} size={96} lang={lang} /> : <Text style={{ fontSize: 64, lineHeight: 76 }}>{c.emoji}</Text>}
          <Text variant="h1" color={c.color} style={{ textAlign: 'center' }} accessibilityRole="header">{c.title}</Text>
          <Text color={colors.textSecondary} style={{ textAlign: 'center' }}>{c.sub}</Text>
          <Button label={t('cel.next')} onPress={pop} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}
