import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { demoFeed, demoLeaderboard, demoLeague, DEMO_FRIENDS } from '../lib/demoSocial';
import { currentWeekStart } from '../lib/leagueView';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { useOnboarding } from '../stores/onboarding';
import { useWorkout } from '../stores/workout';

export type Reaction = 'fire' | 'strong' | 'clap';
export interface LeagueRow { place: number; userId: string; username: string; rankStep: number | null; weeklyXp: number; isMe: boolean }
export interface LeagueData { tier: number; rows: LeagueRow[]; demo: boolean }
export interface Friend { id: string; username: string; rankStep: number | null; streak: number; level: number }
export interface FriendRequest { userId: string; username: string; rankStep: number | null }
export interface FeedItem {
  id: string; userId: string; username: string; rankStep: number | null; type: 'workout' | 'pr' | 'rank_up' | 'badge' | 'league';
  payload: Record<string, unknown>; createdAt: string; reactions: Partial<Record<Reaction, number>>; mine: Reaction[];
}
export interface LeaderboardRow {
  place: number; userId: string; username: string; score: number; tier: number; division: number;
  best1rm: number | null; bestReps: number | null; relativeStrength: number | null; isMe: boolean;
}

/** Eingeloggter Nutzer oder null (→ Demo-Daten). */
async function me(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function weeklyLocalXp(): number {
  const ws = new Date(currentWeekStart() + 'T00:00:00').getTime();
  return useWorkout.getState().history.filter((h) => h.endedAt >= ws).reduce((a, h) => a + h.summary.xp.total, 0);
}

export function useLeague() {
  return useQuery({
    queryKey: ['league'],
    queryFn: async (): Promise<LeagueData | null> => {
      if (!(await me())) return demoLeague(weeklyLocalXp());
      const { data, error } = await supabase.rpc('get_my_league');
      if (error) throw error;
      if (!data?.length) return null; // noch keiner Gruppe zugeteilt (erstes Workout)
      return {
        tier: data[0].tier, demo: false,
        rows: data.map((r: Record<string, unknown>) => ({ place: Number(r.place), userId: r.user_id as string, username: r.username as string, rankStep: r.overall_rank as number | null, weeklyXp: r.weekly_xp as number, isMe: r.is_me as boolean })),
      };
    },
    refetchInterval: 60_000,
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: async (): Promise<{ friends: Friend[]; requests: FriendRequest[]; demo: boolean }> => {
      const uid = await me();
      if (!uid) return { friends: DEMO_FRIENDS, requests: [], demo: true };
      const [f, req] = await Promise.all([
        supabase.rpc('get_friends'),
        supabase.from('friendships').select('requester_id').eq('addressee_id', uid).eq('status', 'pending'),
      ]);
      if (f.error) throw f.error;
      if (req.error) throw req.error;
      const requests = await Promise.all((req.data ?? []).map(async (r) => {
        const p = await supabase.rpc('get_public_profile', { p_user: r.requester_id });
        const row = p.data?.[0];
        return { userId: r.requester_id as string, username: row?.username ?? '?', rankStep: row?.overall_rank ?? null };
      }));
      return {
        demo: false, requests,
        friends: (f.data ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, username: r.username as string, rankStep: r.overall_rank as number | null, streak: (r.current_streak as number) ?? 0, level: (r.level as number) ?? 1 })),
      };
    },
  });
}

export function useFeed() {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async (): Promise<{ items: FeedItem[]; demo: boolean }> => {
      if (!(await me())) return { items: demoFeed(), demo: true };
      const { data, error } = await supabase.rpc('get_feed', { p_limit: 30 });
      if (error) throw error;
      return {
        demo: false,
        items: (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string, userId: r.user_id as string, username: r.username as string, rankStep: r.overall_rank as number | null,
          type: r.type as FeedItem['type'], payload: (r.payload as Record<string, unknown>) ?? {}, createdAt: r.created_at as string,
          reactions: (r.reactions as FeedItem['reactions']) ?? {}, mine: (r.my_reactions as Reaction[]) ?? [],
        })),
      };
    },
  });
}

export function useLeaderboard(slug: string, weightClass: string | null) {
  return useQuery({
    queryKey: ['leaderboard', slug, weightClass],
    queryFn: async (): Promise<{ rows: LeaderboardRow[]; myPlace: number | null; demo: boolean }> => {
      if (!(await me())) return { rows: demoLeaderboard(slug, useOnboarding.getState().bodyweightKg), myPlace: null, demo: true };
      const [lb, pos] = await Promise.all([
        supabase.rpc('get_leaderboard', { p_exercise_slug: slug, p_weight_class: weightClass, p_limit: 50 }),
        supabase.rpc('get_my_leaderboard_position', { p_exercise_slug: slug, p_weight_class: weightClass }),
      ]);
      if (lb.error) throw lb.error;
      return {
        demo: false, myPlace: (pos.data as number | null) ?? null,
        rows: (lb.data ?? []).map((r: Record<string, unknown>) => ({
          place: Number(r.place), userId: r.user_id as string, username: r.username as string, score: Number(r.score), tier: r.tier as number, division: r.division as number,
          best1rm: r.best_1rm == null ? null : Number(r.best_1rm), bestReps: (r.best_reps as number | null) ?? null,
          relativeStrength: r.relative_strength == null ? null : Number(r.relative_strength), isMe: r.is_me as boolean,
        })),
      };
    },
  });
}

/** Reaktion setzen/entfernen – optimistisch, Demo-Modus nur lokal. */
export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, reaction }: { item: FeedItem; reaction: Reaction }) => {
      if (!(await me())) return;
      const has = item.mine.includes(reaction);
      const r = has
        ? await supabase.from('feed_reactions').delete().eq('event_id', item.id).eq('reaction', reaction).eq('user_id', (await me())!)
        : await supabase.from('feed_reactions').insert({ event_id: item.id, reaction });
      if (r.error) throw r.error;
    },
    onMutate: ({ item, reaction }) => {
      qc.setQueryData<{ items: FeedItem[]; demo: boolean }>(['feed'], (old) => old && {
        ...old,
        items: old.items.map((i) => {
          if (i.id !== item.id) return i;
          const has = i.mine.includes(reaction);
          return { ...i, mine: has ? i.mine.filter((x) => x !== reaction) : [...i.mine, reaction], reactions: { ...i.reactions, [reaction]: Math.max(0, (i.reactions[reaction] ?? 0) + (has ? -1 : 1)) } };
        }),
      });
    },
    onError: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export async function searchUsers(q: string) {
  if (!(await me())) return [];
  const { data, error } = await supabase.rpc('search_users', { p_query: q });
  if (error) throw error;
  return (data ?? []) as { id: string; username: string; overall_rank: number | null; friendship_status: string | null }[];
}

export function useFriendActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['friends'] });
  return {
    request: async (userId: string) => {
      const uid = await me(); if (!uid) return;
      const r = await supabase.from('friendships').insert({ requester_id: uid, addressee_id: userId });
      if (r.error && r.error.code !== '23505') throw r.error;
      refresh();
    },
    respond: async (requesterId: string, accept: boolean) => {
      const uid = await me(); if (!uid) return;
      const r = accept
        ? await supabase.from('friendships').update({ status: 'accepted' }).eq('requester_id', requesterId).eq('addressee_id', uid)
        : await supabase.from('friendships').delete().eq('requester_id', requesterId).eq('addressee_id', uid);
      if (r.error) throw r.error;
      refresh(); qc.invalidateQueries({ queryKey: ['feed'] });
    },
  };
}

/** Realtime: Liga-Punkte und Feed live aktualisieren (RLS filtert, was der Nutzer sehen darf). */
export function useSocialRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabaseConfigured) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    me().then((uid) => {
      if (!uid || cancelled) return;
      channel = supabase.channel('social')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'league_members' }, () => qc.invalidateQueries({ queryKey: ['league'] }))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_events' }, () => qc.invalidateQueries({ queryKey: ['feed'] }))
        .subscribe();
    });
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [qc]);
}
