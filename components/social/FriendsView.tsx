import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Share, TextInput, View } from 'react-native';
import { searchUsers, useFeed, useFriendActions, useFriends, useToggleReaction, type FeedItem, type Reaction } from '../../hooks/useSocial';
import { stepToRank } from '../../lib/leagueView';
import { useSettings } from '../../stores/settings';
import { colors, fonts, radius, space } from '../../theme';
import { Avatar, Button, Card, Text } from '../ui';

const REACTIONS: { key: Reaction; emoji: string }[] = [{ key: 'fire', emoji: '🔥' }, { key: 'strong', emoji: '💪' }, { key: 'clap', emoji: '👏' }];
type T = (k: string, o?: object) => string;

function ago(iso: string, t: T) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return t('social.ago_m', { n: m });
  if (m < 60 * 24) return t('social.ago_h', { n: Math.round(m / 60) });
  return t('social.ago_d', { n: Math.round(m / 1440) });
}

function feedText(i: FeedItem, t: T, lang: 'de' | 'en') {
  const p = i.payload as Record<string, string | number>;
  const name = String(lang === 'de' ? p.nameDe ?? '' : p.nameEn ?? '');
  switch (i.type) {
    case 'workout': return t('social.feedWorkout', { sets: p.sets, volume: p.volumeKg, min: p.durationMin });
    case 'pr': return t('social.feedPr', { name });
    case 'rank_up': return t('social.feedRank', { name, to: p.to });
    case 'badge': return t('social.feedBadge', { name });
    case 'league': {
      const ln = String(lang === 'de' ? p.toNameDe : p.toNameEn);
      return t(p.result === 'promoted' ? 'social.feedLeaguePromoted' : p.result === 'demoted' ? 'social.feedLeagueDemoted' : 'social.feedLeagueStayed', { name: ln });
    }
  }
}

function FeedCard({ item, t, lang }: { item: FeedItem; t: T; lang: 'de' | 'en' }) {
  const toggle = useToggleReaction();
  const rank = stepToRank(item.rankStep);
  const accent = item.type === 'rank_up' ? colors.tiers[((item.payload.tier as number) ?? 1) - 1] : item.type === 'pr' ? colors.warning : colors.border;
  return (
    <Card style={{ gap: space[3], borderColor: accent }}>
      <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
        <Avatar name={item.username} tier={rank?.tier} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={1}>{item.username}</Text>
          <Text variant="caption" color={colors.textTertiary}>{ago(item.createdAt, t)}</Text>
        </View>
      </View>
      <Text color={colors.textSecondary}>{feedText(item, t, lang)}</Text>
      <View style={{ flexDirection: 'row', gap: space[2] }}>
        {REACTIONS.map((r) => {
          const on = item.mine.includes(r.key);
          const n = item.reactions[r.key] ?? 0;
          return (
            <Pressable key={r.key} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${r.emoji} ${n}`}
              onPress={() => { Haptics.selectionAsync(); toggle.mutate({ item, reaction: r.key }); }}
              style={{ flexDirection: 'row', gap: space[1], alignItems: 'center', paddingHorizontal: space[3], height: 34, borderRadius: radius.full,
                backgroundColor: on ? '#6C5CFF33' : colors.surface2, borderWidth: 1, borderColor: on ? colors.primary : 'transparent' }}>
              <Text>{r.emoji}</Text>
              {n > 0 ? <Text variant="caption" tabular>{n}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function AddFriend({ t, demo }: { t: T; demo: boolean }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Awaited<ReturnType<typeof searchUsers>>>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const { request } = useFriendActions();
  useEffect(() => {
    if (demo || q.trim().length < 2) { setRes([]); return; }
    const id = setTimeout(() => { searchUsers(q).then(setRes).catch(() => setRes([])); }, 300);
    return () => clearTimeout(id);
  }, [q, demo]);
  const share = () => Share.share({ message: t('social.inviteText', { link: Linking.createURL('/') }) });

  return (
    <Card style={{ gap: space[3] }}>
      <Text variant="h3">{t('social.add')}</Text>
      {demo ? <Text variant="caption" color={colors.textTertiary}>{t('social.signIn')}</Text> : (
        <TextInput value={q} onChangeText={setQ} placeholder={t('social.searchPh')} placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false}
          accessibilityLabel={t('social.searchPh')}
          style={{ height: 44, paddingHorizontal: space[4], borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, fontFamily: fonts.regular, fontSize: 16 }} />
      )}
      {res.map((u) => {
        const status = sent.has(u.id) ? 'pending' : u.friendship_status;
        return (
          <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Avatar name={u.username} tier={stepToRank(u.overall_rank)?.tier} size={34} />
            <Text style={{ flex: 1 }} numberOfLines={1}>{u.username}</Text>
            {status === 'accepted' ? <Text variant="caption" color={colors.success}>{t('social.friend')}</Text>
              : status === 'pending' ? <Text variant="caption" color={colors.textSecondary}>{t('social.requested')}</Text>
              : <Button size="s" label={t('social.request')} onPress={async () => { await request(u.id); setSent((s) => new Set(s).add(u.id)); }} />}
          </View>
        );
      })}
      <Button size="m" variant="secondary" label={t('social.invite')} onPress={share} />
    </Card>
  );
}

export function FriendsView() {
  const { t: tr } = useTranslation();
  const t = tr as unknown as T;
  const lang = useSettings((s) => s.language);
  const friends = useFriends();
  const feed = useFeed();
  const { respond } = useFriendActions();
  if (friends.isLoading || feed.isLoading) return <ActivityIndicator color={colors.primary} />;
  const demo = !!friends.data?.demo;

  return (
    <View style={{ gap: space[4] }}>
      {demo ? <Text variant="caption" color={colors.warning}>{t('social.demo')}</Text> : null}
      {friends.data?.requests.length ? (
        <Card style={{ gap: space[3] }}>
          <Text variant="h3">{t('social.requests')}</Text>
          {friends.data.requests.map((r) => (
            <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Avatar name={r.username} tier={stepToRank(r.rankStep)?.tier} size={34} />
              <Text style={{ flex: 1 }} numberOfLines={1}>{r.username}</Text>
              <Button size="s" label={t('social.accept')} onPress={() => respond(r.userId, true)} />
              <Button size="s" variant="ghost" label={t('social.decline')} onPress={() => respond(r.userId, false)} />
            </View>
          ))}
        </Card>
      ) : null}

      <View style={{ gap: space[2] }}>
        <Text variant="h3">{t('social.myFriends')}</Text>
        {friends.data?.friends.length ? friends.data.friends.map((f) => (
          <View key={f.id} accessible accessibilityLabel={f.username}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md, backgroundColor: colors.surface }}>
            <Avatar name={f.username} tier={stepToRank(f.rankStep)?.tier} size={40} />
            <Text style={{ flex: 1 }} numberOfLines={1}>{f.username}</Text>
            <Text variant="caption" color={colors.warning}>{t('social.streak', { n: f.streak })}</Text>
            <Text variant="caption" color={colors.textSecondary}>{t('social.level', { n: f.level })}</Text>
          </View>
        )) : <Text color={colors.textTertiary}>{t('social.noFriends')}</Text>}
      </View>

      <AddFriend t={t} demo={demo} />

      <View style={{ gap: space[3] }}>
        <Text variant="h3">{t('social.feed')}</Text>
        {feed.data?.items.length ? feed.data.items.map((i) => <FeedCard key={i.id} item={i} t={t} lang={lang} />)
          : <Text color={colors.textTertiary}>{t('social.noFeed')}</Text>}
      </View>
    </View>
  );
}
