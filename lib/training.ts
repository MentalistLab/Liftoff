// Plan-Ziele, progressive Gewichtsvorschläge und lokaler Streak – reine Logik, testbar.
import { startingWeight, suggestNext, type ProgressionSuggestion } from '../supabase/functions/_shared/core/progression.ts';
import { EMPTY_STREAK, syncStreak, type StreakEvent, type StreakState } from '../supabase/functions/_shared/core/streak.ts';
import { exerciseBySlug } from './standards.ts';
import { isSetDone, type PersonalBest, type WorkoutExercise } from './workoutSummary.ts';

export { EMPTY_STREAK };
export type { StreakEvent, StreakState };

/** Vorgabe aus dem Plan für eine Übung. */
export interface ExerciseTarget { sets: number; repsMin?: number; repsMax?: number; durationS?: number; weightKg?: number | null }

/** Gemerkte Vorgabe fürs nächste Mal (nach Progressionsregel). */
export interface SavedTarget { weightKg: number | null; repsMin: number; repsMax: number; noteDe: string; noteEn: string }

export function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const LOWER = new Set(['legs', 'glutes']);
const isLower = (slug: string) => {
  const e = exerciseBySlug(slug);
  return !!e && (LOWER.has(e.primaryMuscle) || slug === 'deadlift');
};

/** Gewicht für den Start einer Plan-Übung: gemerkte Progression → aus Bestwert berechnet → nichts. */
export function plannedWeight(slug: string, target: ExerciseTarget, saved: Record<string, SavedTarget>, bests: Record<string, PersonalBest>): number | null {
  const ex = exerciseBySlug(slug);
  if (!ex || ex.equipment === 'bodyweight' || ex.rankingType !== 'weight_ratio') return null;
  if (saved[slug]?.weightKg != null) return saved[slug].weightKg;
  const oneRm = bests[slug]?.oneRm;
  if (oneRm && target.repsMax) return startingWeight(oneRm, target.repsMax) || null;
  return null;
}

/** Nach einem Plan-Workout: Vorschläge für alle Übungen mit Wdh.-Bereich. */
export function nextTargets(exercises: WorkoutExercise[]): Record<string, SavedTarget & { suggestion: ProgressionSuggestion }> {
  const out: Record<string, SavedTarget & { suggestion: ProgressionSuggestion }> = {};
  for (const e of exercises) {
    const t = e.target;
    if (!t?.repsMin || !t.repsMax) continue;
    const done = e.sets.filter(isSetDone);
    if (!done.length) continue;
    const s = suggestNext(
      { sets: t.sets, repsMin: t.repsMin, repsMax: t.repsMax, weightKg: t.weightKg ?? done[0].weightKg ?? null, lowerBody: isLower(e.slug) },
      done.map((x) => ({ weightKg: x.weightKg, reps: x.reps ?? 0 })),
    );
    out[e.slug] = { weightKg: s.weightKg, repsMin: s.repsMin, repsMax: s.repsMax, noteDe: s.noteDe, noteEn: s.noteEn, suggestion: s };
  }
  return out;
}

/** Streak lokal fortschreiben (gleiche Regeln wie der Server: nur geplante Tage zählen). */
export function updateStreak(prev: StreakState, plannedWeekdays: number[], trainedToday: boolean, now = new Date()) {
  return syncStreak(prev, localDateStr(now), plannedWeekdays, trainedToday);
}
