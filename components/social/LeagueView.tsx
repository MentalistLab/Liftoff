import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLeague } from '../../hooks/useSocial';
import { LEAGUE_NAMES } from '../../lib/league';
import { formatCountdown, leagueCountdown, stepToRank, zoneFor } from '../../lib/leagueView';
import { useSettings } from '../../stores/settings';
import { colors, radius, space } from '../../theme';
import { Avatar, Card, Text } from '../ui';

const ZONE_COLOR = { promote: colors.success, stay: 'transparent', demote: colors.danger } as const;

export function LeagueView() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const { data, isLoading } = useLeague();
  const [left, setLeft] = useState(leagueCountdown());
  useEffect(() => { const id = setInterval(() => setLeft(leagueCountdown()), 30_000); return () => clearInterval(id); }, []);

  if (isLoading) return <ActivityIndicator color={colors.primary} />;
  if (!data) return <Card><Text color={colors.textSecondary}>{t('social.noLeague')}</Text></Card>;
  const size = data.rows.length;
  const tierColor = colors.leagues[data.tier - 1];

  return (
    <View style={{ gap: space[3] }}>
      {data.demo ? <Text variant="caption" color={colors.warning}>{t('social.demo')}</Text> : null}
      <Card style={{ alignItems: 'center', gap: space[1], borderColor: tierColor }}>
        <Text variant="overline" color={colors.textSecondary}>{t('social.league')} {data.tier}/10</Text>
        <Text variant="h1" color={tierColor}>{t('social.leagueName', { name: LEAGUE_NAMES[lang][data.tier - 1] })}</Text>
        <Text variant="caption" color={colors.textSecondary} accessibilityLiveRegion="polite">⏱ {t('social.endsIn', { time: formatCountdown(left, lang) })}</Text>
      </Card>
      <View style={{ gap: space[1] }}>
        {data.rows.map((r, i) => {
          const zone = zoneFor(r.place, size, data.tier, r.weeklyXp);
          const prev = i > 0 ? zoneFor(data.rows[i - 1].place, size, data.tier, data.rows[i - 1].weeklyXp) : null;
          const rank = stepToRank(r.rankStep);
          return (
            <View key={r.userId}>
              {zone !== prev && zone !== 'stay' ? (
                <Text variant="overline" color={ZONE_COLOR[zone]} style={{ marginTop: i ? space[2] : 0, marginBottom: space[1] }}>
                  {zone === 'promote' ? `▲ ${t('social.promote')}` : `▼ ${t('social.demote')}`}
                </Text>
              ) : null}
              <Animated.View entering={FadeInDown.delay(Math.min(i, 12) * 25)}
                accessible accessibilityLabel={`${r.place}. ${r.isMe ? t('social.you') : r.username}, ${r.weeklyXp} XP`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.md,
                  backgroundColor: r.isMe ? '#6C5CFF2A' : colors.surface, borderLeftWidth: 3, borderLeftColor: zone === 'stay' ? colors.border : ZONE_COLOR[zone] }}>
                <Text variant="h3" tabular style={{ width: 28, textAlign: 'right' }} color={zone === 'promote' ? colors.success : zone === 'demote' ? colors.danger : colors.textSecondary}>{r.place}</Text>
                <Avatar name={r.username} tier={rank?.tier} size={34} />
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{r.isMe ? t('social.you') : r.username}</Text>
                <Text variant="caption" tabular color={colors.textSecondary}>{t('social.xp', { xp: r.weeklyXp })}</Text>
              </Animated.View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
