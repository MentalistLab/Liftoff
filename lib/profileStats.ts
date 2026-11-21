// Statistiken, Abzeichen-Fortschritt und Verlaufsdaten aus der lokalen Workout-Historie.
import { BADGES, type BadgeStats } from '../supabase/functions/_shared/core/badges.ts';
import { epley1RM } from '../supabase/functions/_shared/core/ranking.ts';
import { exerciseBySlug } from '../supabase/functions/_shared/core/standards.ts';
import { isSetDone, type WorkoutExercise, type WorkoutSummary } from './workoutSummary.ts';

export interface HistoryWorkout { startedAt: number; endedAt: number; exercises: WorkoutExercise[]; summary: WorkoutSummary }

const DAY = 86_400_000;
const dayKey = (t: number) => { const d = new Date(t); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY; };

/** Längste Folge von Kalendertagen mit Training (vereinfachte Streak; Server rechnet mit Trainingstagen). */
export function longestDayStreak(history: HistoryWorkout[]): number {
  const days = [...new Set(history.map((h) => dayKey(h.endedAt)))].sort((a, b) => a - b);
  let best = 0, cur = 0, prev = NaN;
  for (const d of days) { cur = d === prev + 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}

export function computeStats(history: HistoryWorkout[], extra: Partial<BadgeStats> = {}): BadgeStats {
  let sets = 0, volume = 0, maxW = 0, prs = 0, ups = 0;
  for (const h of history) {
    sets += h.summary.completedSets; volume += h.summary.volumeKg; prs += h.summary.prs.length; ups += h.summary.rankUps;
    for (const e of h.exercises) {
      const bw = exerciseBySlug(e.slug)?.equipment === 'bodyweight';
      for (const s of e.sets) if (!bw && isSetDone(s)) maxW = Math.max(maxW, s.weightKg ?? 0);
    }
  }
  return {
    workouts: history.length, setsTotal: sets, totalVolumeKg: volume, longestStreak: longestDayStreak(history), maxWeightKg: maxW,
    prs, rankUps: ups, highestTier: 0, friends: 0, leaguePromotions: 0, bestLeagueTier: 1, reactionsGiven: 0, ...extra,
  };
}

export function earnedBadgeIds(stats: BadgeStats): Set<string> {
  return new Set(BADGES.filter((b) => b.check(stats)).map((b) => b.id));
}

/** Volumen der letzten n Wochen (Montag als Wochenstart), älteste zuerst. */
export function weeklyVolume(history: HistoryWorkout[], weeks = 8, now = Date.now()): { weekStart: number; volumeKg: number }[] {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const starts = Array.from({ length: weeks }, (_, i) => d.getTime() - (weeks - 1 - i) * 7 * DAY);
  return starts.map((ws) => ({
    weekStart: ws,
    volumeKg: history.filter((h) => h.endedAt >= ws && h.endedAt < ws + 7 * DAY).reduce((a, h) => a + h.summary.volumeKg, 0),
  }));
}

/** Bestes geschätztes 1RM je Workout für eine Übung, chronologisch. */
export function oneRmSeries(history: HistoryWorkout[], slug: string): { t: number; value: number }[] {
  const out: { t: number; value: number }[] = [];
  for (const h of [...history].sort((a, b) => a.endedAt - b.endedAt)) {
    let best = 0;
    for (const e of h.exercises) if (e.slug === slug) for (const s of e.sets) if (isSetDone(s)) best = Math.max(best, epley1RM(s.weightKg, s.reps) ?? 0);
    if (best > 0) out.push({ t: h.endedAt, value: Math.round(best * 10) / 10 });
  }
  return out;
}

/** Übungen, für die es mindestens einen gewerteten Gewichtssatz gibt. */
export function trackedLifts(history: HistoryWorkout[]): string[] {
  const s = new Set<string>();
  for (const h of history) for (const e of h.exercises) if (exerciseBySlug(e.slug)?.rankingType === 'weight_ratio' && e.sets.some(isSetDone)) s.add(e.slug);
  return [...s];
}
