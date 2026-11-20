// Wöchentliche Ligen: 10 Stufen, Gruppen à 30, Top 7 steigen auf, letzte 5 steigen ab.
// Die Woche endet Sonntag 23:59 Europe/Berlin.

import { addDays, isoWeekday, localDate, type DateStr } from './streak.ts';

export const LEAGUE_TZ = 'Europe/Berlin';
export const LEAGUE_TIERS = 10;
export const GROUP_SIZE = 30;
export const PROMOTE = 7;
export const DEMOTE = 5;

export const LEAGUE_NAMES = {
  de: ['Eisen', 'Bronze', 'Silber', 'Gold', 'Platin', 'Smaragd', 'Diamant', 'Meister', 'Großmeister', 'Titan'],
  en: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Titan'],
};

export interface LeagueMember {
  userId: string;
  weeklyXp: number;
}

export type LeagueOutcome = 'promoted' | 'stayed' | 'demoted';

export interface LeagueResult {
  userId: string;
  position: number;
  weeklyXp: number;
  result: LeagueOutcome;
  newTier: number;
}

/** Plätze für Auf- und Abstieg, skaliert für kleinere Gruppen. */
export function zoneSizes(groupSize: number, tier: number): { promote: number; demote: number } {
  const promote = tier < LEAGUE_TIERS ? Math.round((PROMOTE * groupSize) / GROUP_SIZE) : 0;
  let demote = tier > 1 ? Math.round((DEMOTE * groupSize) / GROUP_SIZE) : 0;
  if (promote + demote > groupSize) demote = Math.max(0, groupSize - promote);
  return { promote, demote };
}

/**
 * Wertet eine Ligagruppe am Wochenende aus.
 * Reihenfolge: Wochen-XP absteigend, bei Gleichstand nach userId (deterministisch).
 * Wer 0 XP hat, kann nicht aufsteigen.
 */
export function closeGroup(members: LeagueMember[], tier: number): LeagueResult[] {
  const sorted = [...members].sort((a, b) => b.weeklyXp - a.weeklyXp || (a.userId < b.userId ? -1 : 1));
  const n = sorted.length;
  const { promote, demote } = zoneSizes(n, tier);
  return sorted.map((m, i) => {
    const position = i + 1;
    let result: LeagueOutcome = 'stayed';
    if (position <= promote && m.weeklyXp > 0) result = 'promoted';
    else if (position > n - demote) result = 'demoted';
    const newTier = result === 'promoted' ? tier + 1 : result === 'demoted' ? tier - 1 : tier;
    return { userId: m.userId, position, weeklyXp: m.weeklyXp, result, newTier };
  });
}

export interface GroupCandidate {
  userId: string;
  tier: number;
  /** Ähnlichkeitswert, z. B. Gesamtscore – ähnliche Nutzer landen in derselben Gruppe. */
  score: number;
}

export interface PlannedGroup {
  tier: number;
  groupNo: number;
  userIds: string[];
}

/** Bildet für jede Stufe möglichst gleich große Gruppen (≤ 30) aus ähnlich starken Nutzern. */
export function formGroups(users: GroupCandidate[]): PlannedGroup[] {
  const byTier = new Map<number, GroupCandidate[]>();
  for (const u of users) {
    const t = Math.max(1, Math.min(LEAGUE_TIERS, u.tier));
    if (!byTier.has(t)) byTier.set(t, []);
    byTier.get(t)!.push(u);
  }
  const out: PlannedGroup[] = [];
  for (const tier of [...byTier.keys()].sort((a, b) => a - b)) {
    const list = byTier.get(tier)!.sort((a, b) => b.score - a.score || (a.userId < b.userId ? -1 : 1));
    const groups = Math.ceil(list.length / GROUP_SIZE);
    const base = Math.floor(list.length / groups);
    let extra = list.length % groups;
    let idx = 0;
    for (let g = 0; g < groups; g++) {
      const size = base + (extra-- > 0 ? 1 : 0);
      out.push({ tier, groupNo: g + 1, userIds: list.slice(idx, idx + size).map((u) => u.userId) });
      idx += size;
    }
  }
  return out;
}

/** Montag der Ligawoche (Berliner Zeit) als YYYY-MM-DD. */
export function weekStart(now: Date): DateStr {
  const d = localDate(now, LEAGUE_TZ);
  return addDays(d, 1 - isoWeekday(d));
}

/** Berliner Uhrzeit als Minuten seit Mitternacht. */
function berlinMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: LEAGUE_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/**
 * true, wenn die Ligawoche abgeschlossen werden soll: Sonntag ab 23:59 Berliner Zeit.
 * Der Cron läuft sonntags um 21:59 und 22:59 UTC (Sommer- bzw. Winterzeit),
 * diese Funktion entscheidet, welcher Lauf zählt.
 */
export function isWeekCloseTime(now: Date): boolean {
  const d = localDate(now, LEAGUE_TZ);
  return isoWeekday(d) === 7 && berlinMinutes(now) >= 23 * 60 + 59;
}

/** Sekunden bis Sonntag 23:59 Berliner Zeit (für den Countdown in der App). */
export function secondsUntilWeekClose(now: Date): number {
  const d = localDate(now, LEAGUE_TZ);
  const daysLeft = 7 - isoWeekday(d);
  const minsLeft = daysLeft * 1440 + (23 * 60 + 59) - berlinMinutes(now);
  return Math.max(0, minsLeft * 60 - now.getUTCSeconds());
}
