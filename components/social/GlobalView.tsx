import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLeaderboard } from '../../hooks/useSocial';
import { rankLabel, weightClass } from '../../lib/ranking';
import { CORE_EXERCISES } from '../../lib/standards';
import { useOnboarding } from '../../stores/onboarding';
import { useSettings } from '../../stores/settings';
import { colors, radius, space } from '../../theme';
import { Avatar, Card, SegmentedControl, Text } from '../ui';
import { exerciseName } from '../workout/ExercisePicker';

const MEDALS = ['🥇', '🥈', '🥉'];

export function GlobalView() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as (k: string, o?: object) => string;
  const lang = useSettings((s) => s.language);
  const ob = useOnboarding();
  const [slug, setSlug] = useState('bench_press');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const myClass = weightClass(ob.gender ?? 'none', ob.bodyweightKg);
  const { data, isLoading } = useLeaderboard(slug, scope === 'mine' ? myClass : null);

  return (
    <View style={{ gap: space[3] }}>
      {data?.demo ? <Text variant="caption" color={colors.warning}>{t('social.demo')}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
        {CORE_EXERCISES.map((e) => {
          const on = e.slug === slug;
          return (
            <Pressable key={e.slug} onPress={() => setSlug(e.slug)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: space[3], height: 34, justifyContent: 'center', borderRadius: radius.full, backgroundColor: on ? colors.primary : colors.surface2 }}>
              <Text variant="caption" color={on ? colors.text : colors.textSecondary}>{exerciseName(e, lang)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <SegmentedControl options={[{ value: 'all', label: t('social.allClasses') }, { value: 'mine', label: myClass }]} value={scope} onChange={setScope} />
      {data?.myPlace ? <Text variant="caption" color={colors.accent}>{t('social.myPlace', { n: data.myPlace })}</Text> : null}
      {isLoading ? <ActivityIndicator color={colors.primary} /> : !data?.rows.length ? <Card><Text color={colors.textTertiary}>{t('social.noEntries')}</Text></Card> : (
        <View style={{ gap: space[1] }}>
          {data.rows.map((r) => (
            <View key={r.userId} accessible accessibilityLabel={`${r.place}. ${r.username}, ${rankLabel(r, lang)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: r.isMe ? '#6C5CFF2A' : colors.surface }}>
              <Text variant="h3" tabular style={{ width: 32, textAlign: 'center' }}>{MEDALS[r.place - 1] ?? r.place}</Text>
              <Avatar name={r.username} tier={r.tier} size={34} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1}>{r.username}</Text>
                <Text variant="caption" color={colors.tiers[r.tier - 1]}>{rankLabel(r, lang)}</Text>
              </View>
              <Text variant="caption" tabular color={colors.textSecondary}>
                {r.relativeStrength != null ? `${r.relativeStrength}× · ${r.best1rm} kg` : r.bestReps != null ? `${r.bestReps}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
