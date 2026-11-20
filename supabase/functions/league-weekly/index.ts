// league-weekly: schließt die Ligawoche ab (Sonntag 23:59 Europe/Berlin) und
// stellt die Gruppen für die neue Woche zusammen. Wird von pg_cron aufgerufen
// (Header x-cron-secret) und ist idempotent – mehrfaches Aufrufen schadet nicht.

import { handler, HttpError, json, must, serviceClient } from '../_shared/http.ts';
import { closeGroup, formGroups, isWeekCloseTime, LEAGUE_NAMES, weekStart, type LeagueResult } from '../_shared/core/league.ts';
import { addDays } from '../_shared/core/streak.ts';

Deno.serve(handler(async (req) => {
  // Der Cron-Secret liegt im Vault der Datenbank und wird dort geprüft.
  const db = serviceClient();
  const provided = req.headers.get('x-cron-secret') ?? '';
  const ok = provided ? must(await db.rpc('verify_cron_secret', { p_secret: provided }), 'cron secret') as boolean : false;
  if (!ok) throw new HttpError(401, 'unauthorized');

  const now = new Date();
  const current = weekStart(now);
  // Sonntag ab 23:59 wird die laufende Woche geschlossen, sonst nur vergangene, offene Wochen.
  const closeUpTo = isWeekCloseTime(now) ? current : addDays(current, -7);

  const open = must(
    await db.from('leagues').select('id, tier, week_start').is('closed_at', null).lte('week_start', closeUpTo),
    'open leagues',
  ) as { id: string; tier: number; week_start: string }[];

  const nextGroups = new Map<string, { userId: string; tier: number; score: number }[]>(); // je Zielwoche
  let closed = 0;

  for (const league of open) {
    const members = must(await db.from('league_members').select('user_id, weekly_xp').eq('league_id', league.id), 'members') as { user_id: string; weekly_xp: number }[];
    const results: LeagueResult[] = closeGroup(members.map((m) => ({ userId: m.user_id, weeklyXp: m.weekly_xp })), league.tier);
    const ids = results.map((r) => r.userId);
    const profiles = ids.length
      ? must(await db.from('profiles').select('id, best_league_tier, league_promotions, overall_score').in('id', ids), 'profiles') as
        { id: string; best_league_tier: number; league_promotions: number; overall_score: number | null }[]
      : [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const feed: Record<string, unknown>[] = [];

    for (const r of results) {
      must(await db.from('league_members').update({ final_position: r.position, result: r.result, result_seen: false })
        .eq('league_id', league.id).eq('user_id', r.userId), 'member result');
      const p = byId.get(r.userId);
      if (!p) continue;
      must(await db.from('profiles').update({
        league_tier: r.newTier,
        best_league_tier: Math.max(p.best_league_tier, r.newTier),
        league_promotions: p.league_promotions + (r.result === 'promoted' ? 1 : 0),
      }).eq('id', r.userId), 'profile tier');
      if (r.result !== 'stayed') {
        feed.push({ user_id: r.userId, type: 'league', payload: { result: r.result, position: r.position, fromTier: league.tier, toTier: r.newTier, toNameDe: LEAGUE_NAMES.de[r.newTier - 1], toNameEn: LEAGUE_NAMES.en[r.newTier - 1] } });
      }
      // Nur wer diese Woche aktiv war, wird für die nächste Woche vorab eingeteilt.
      if (r.weeklyXp > 0) {
        const target = addDays(league.week_start, 7);
        if (!nextGroups.has(target)) nextGroups.set(target, []);
        nextGroups.get(target)!.push({ userId: r.userId, tier: r.newTier, score: Number(p.overall_score ?? 0) });
      }
    }
    if (feed.length) must(await db.from('feed_events').insert(feed), 'league feed');
    must(await db.from('leagues').update({ closed_at: now.toISOString() }).eq('id', league.id), 'close');
    closed++;
  }

  // Neue Gruppen bilden (nach Stärke gemischt). Inaktive kommen beim ersten XP automatisch dazu.
  let created = 0;
  for (const [week, users] of nextGroups) {
    const already = new Set((must(await db.from('league_members').select('user_id').eq('week_start', week), 'existing') as { user_id: string }[]).map((m) => m.user_id));
    const todo = users.filter((u) => !already.has(u.userId));
    for (const g of formGroups(todo)) {
      const maxNo = must(await db.from('leagues').select('group_no').eq('tier', g.tier).eq('week_start', week).order('group_no', { ascending: false }).limit(1), 'group no') as { group_no: number }[];
      const league = must(await db.from('leagues').insert({ tier: g.tier, week_start: week, group_no: (maxNo[0]?.group_no ?? 0) + 1 }).select('id').single(), 'new league') as { id: string };
      must(await db.from('league_members').insert(g.userIds.map((u) => ({ league_id: league.id, user_id: u, week_start: week }))), 'new members');
      created++;
    }
  }

  return json({ closed, created, closeUpTo, current });
}));
