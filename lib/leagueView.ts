// Darstellungslogik für Liga und Bestenlisten (ohne React, testbar).
import { secondsUntilWeekClose, weekStart, zoneSizes } from '../supabase/functions/_shared/core/league.ts';

export type Zone = 'promote' | 'stay' | 'demote';

/** Zone eines Platzes (1-basiert) in einer Gruppe. Mit 0 Wochen-XP steigt niemand auf. */
export function zoneFor(place: number, groupSize: number, tier: number, weeklyXp = 1): Zone {
  const { promote, demote } = zoneSizes(groupSize, tier);
  if (place <= promote && weeklyXp > 0) return 'promote';
  if (place > groupSize - demote) return 'demote';
  return 'stay';
}

/** „2 T 5 Std“, „5 Std 12 Min“, „12 Min“ */
export function formatCountdown(totalS: number, lang: 'de' | 'en' = 'de'): string {
  const s = Math.max(0, Math.floor(totalS));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const u = lang === 'de' ? { d: 'T', h: 'Std', m: 'Min' } : { d: 'd', h: 'h', m: 'm' };
  if (d > 0) return `${d} ${u.d} ${h} ${u.h}`;
  if (h > 0) return `${h} ${u.h} ${m} ${u.m}`;
  return `${m} ${u.m}`;
}

export function leagueCountdown(now = new Date()): number {
  return secondsUntilWeekClose(now);
}

export function currentWeekStart(now = new Date()): string {
  return weekStart(now);
}

/** Rangstufe 0–23 → Stufe/Division */
export function stepToRank(step: number | null | undefined): { tier: number; division: number } | null {
  if (step == null) return null;
  return { tier: Math.floor(step / 3) + 1, division: (step % 3) + 1 };
}
