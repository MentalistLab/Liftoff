import React, { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { Card, MuscleMap, ProgressBar, RankBadge, Screen, SegmentedControl, Text } from '../../components/ui';
import { useMyRanks } from '../../hooks/useMyRanks';
import { muscleFill } from '../../lib/muscleMapView';
import { rankLabel, scoreToRank } from '../../lib/ranking';
import { MUSCLES, type Muscle } from '../../lib/standards';
import { useSettings } from '../../stores/settings';
import { colors, space } from '../../theme';

function nextRankText(score: number, lang: 'de' | 'en', t: TFunction) {
  const r = scoreToRank(score);
  if (r.step >= 23) return t('ranks.max');
  const next = scoreToRank(((r.step + 1) * 100) / 24 + 0.01);
  return t('ranks.next', { pct: Math.round((1 - r.progress) * 100), rank: rankLabel(next, lang) });
}

export default function RanksScreen() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const { width } = useWindowDimensions();
  const { data, isLoading } = useMyRanks();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<Muscle | null>(null);

  if (isLoading || !data) {
    return <Screen title={t('ranks.title')}><ActivityIndicator color={colors.primary} /></Screen>;
  }

  const overall = data.overall != null ? scoreToRank(data.overall) : null;
  const sorted = [...MUSCLES].sort((a, b) => (data.scores[b] ?? -1) - (data.scores[a] ?? -1));

  return (
    <Screen title={t('ranks.title')}>
      {data.demo ? <Text variant="caption" color={colors.warning}>{t('common.demo')}</Text> : null}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        {overall ? <RankBadge tier={overall.tier} division={overall.division} size={64} lang={lang} /> : null}
        <View style={{ flex: 1, gap: space[1] }}>
          <Text variant="overline" color={colors.textSecondary}>{t('ranks.overall')}</Text>
          <Text variant="h2" color={overall ? colors.tiers[overall.tier - 1] : colors.textSecondary}>
            {overall ? rankLabel(overall, lang) : t('ranks.unranked')}
          </Text>
          {overall && data.overall != null ? (
            <>
              <ProgressBar value={overall.progress} color={colors.tiers[overall.tier - 1]} />
              <Text variant="caption" color={colors.textSecondary}>{nextRankText(data.overall, lang, t)}</Text>
            </>
          ) : null}
        </View>
      </Card>

      <SegmentedControl
        options={[{ value: 'front', label: t('ranks.front') }, { value: 'back', label: t('ranks.back') }]}
        value={view}
        onChange={setView}
      />
      <MuscleMap
        gender={data.gender}
        scores={data.scores}
        view={view}
        selected={selected}
        onPressMuscle={(m) => setSelected((s) => (s === m ? null : m))}
        width={Math.min(width - space[8], 340)}
        lang={lang}
      />

      <Text variant="h3" accessibilityRole="header">{t('ranks.muscles')}</Text>
      {sorted.map((m) => {
        const score = data.scores[m];
        const f = muscleFill(score);
        const r = score != null ? scoreToRank(score) : null;
        return (
          <Pressable key={m} onPress={() => setSelected((s) => (s === m ? null : m))} accessibilityRole="button">
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], borderColor: selected === m ? f.color ?? colors.border : colors.border }}>
              {r ? <RankBadge tier={r.tier} division={r.division} size={36} lang={lang} /> : <View style={{ width: 36 }} />}
              <View style={{ flex: 1, gap: space[1] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="h3">{t(`muscles.${m}`)}</Text>
                  <Text variant="caption" color={f.color ?? colors.textTertiary}>{r ? rankLabel(r, lang) : t('ranks.unranked')}</Text>
                </View>
                <ProgressBar value={r?.progress ?? 0} color={f.color ?? colors.textTertiary} height={6} />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
