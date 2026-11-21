// Lokale Auswertung eines Workouts – sofort, auch offline.
// Der Server (finish-workout) rechnet nach dem Sync verbindlich nach; die Logik ist dieselbe.
import { bestScore, epley1RM, scoreToRank, type ScoreContext } from '../supabase/functions/_shared/core/ranking.ts';
import { exerciseBySlug } from './standards.ts';
import { workoutXp, type WorkoutXp } from '../supabase/functions/_shared/core/xp.ts';

export interface SetEntry { id: string; weightKg: number | null; reps: number | null; durationS: number | null; done: boolean }
export interface WorkoutExercise { slug: string; sets: SetEntry[] }
export interface PersonalBest { score: number; oneRm: number | null; reps: number | null; durationS: number | null }

export interface ExerciseResult {
  slug: string;
  completedSets: number;
  volumeKg: number;
  scoreBefore: number | null;
  scoreAfter: number | null;
  stepBefore: number | null;
  stepAfter: number | null;
  isPr: boolean;
}

export interface WorkoutSummary {
  durationS: number;
  completedSets: number;
  volumeKg: number;
  prs: string[];
  rankUps: number;
  exercises: ExerciseResult[];
  xp: WorkoutXp;
  /** neue Bestwerte zum Speichern */
  bests: Record<string, PersonalBest>;
}

export function isSetDone(s: SetEntry): boolean {
  return s.done && ((s.reps ?? 0) > 0 || (s.durationS ?? 0) > 0);
}

export function summarize(
  exercises: WorkoutExercise[],
  startedAt: number,
  endedAt: number,
  bests: Record<string, PersonalBest>,
  ctx: ScoreContext,
  streak = 0,
): WorkoutSummary {
  const results: ExerciseResult[] = [];
  const newBests: Record<string, PersonalBest> = {};
  let volume = 0, sets = 0, rankUps = 0;

  for (const we of exercises) {
    const ex = exerciseBySlug(we.slug);
    const done = we.sets.filter(isSetDone);
    if (!ex || done.length === 0) continue;
    const vol = ex.equipment === 'bodyweight' ? 0 : done.reduce((a, s) => a + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
    const input = done.map((s) => ({ weightKg: s.weightKg, reps: s.reps, durationS: s.durationS }));
    const score = bestScore(ex, input, ctx);
    const prev = bests[we.slug] ?? null;
    const oneRm = ex.rankingType === 'weight_ratio' ? Math.max(0, ...done.map((s) => epley1RM(s.weightKg, s.reps) ?? 0)) || null : null;
    const reps = Math.max(0, ...done.map((s) => s.reps ?? 0)) || null;
    const dur = Math.max(0, ...done.map((s) => s.durationS ?? 0)) || null;

    const isPr = score != null && (prev == null || score > prev.score + 1e-9);
    const after = isPr ? score : prev?.score ?? score;
    const stepBefore = prev ? scoreToRank(prev.score).step : null;
    const stepAfter = after != null ? scoreToRank(after).step : null;
    if (stepAfter != null) rankUps += Math.max(0, stepAfter - (stepBefore ?? -1)) * (stepBefore == null ? 0 : 1);
    if (isPr) {
      newBests[we.slug] = { score: score!, oneRm, reps, durationS: dur };
    }
    volume += vol;
    sets += done.length;
    results.push({ slug: we.slug, completedSets: done.length, volumeKg: Math.round(vol), scoreBefore: prev?.score ?? null, scoreAfter: after, stepBefore, stepAfter, isPr: isPr && prev != null });
  }

  // Erster Eintrag einer Übung zählt als Bestwert, aber nicht als PR-XP.
  const realPrs = results.filter((r) => r.isPr).map((r) => r.slug);
  return {
    durationS: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    completedSets: sets,
    volumeKg: Math.round(volume),
    prs: realPrs,
    rankUps,
    exercises: results,
    xp: workoutXp({ completedSets: sets, prs: realPrs.length, rankUps, streak }),
    bests: newBests,
  };
}

export function formatDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
