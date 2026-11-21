// Workout-Historie geräteübergreifend: Server-Workouts mit lokalen zusammenführen und
// Bestwerte/Zusammenfassungen chronologisch neu berechnen (gleiche Logik wie beim Abschließen).
import type { ScoreContext } from './ranking.ts';
import { summarize, type PersonalBest, type SetEntry, type WorkoutExercise, type WorkoutSummary } from './workoutSummary.ts';

export interface ServerWorkoutRow {
  id: string;
  client_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  workout_sets: { id: string; set_index: number; weight_kg: number | null; reps: number | null; duration_s: number | null; completed: boolean; exercises: { slug: string } | null }[];
}

export interface HistoryItem {
  id: string; title: string; planWeekday: number | null; startedAt: number; endedAt: number;
  exercises: WorkoutExercise[]; notes: string; summary: WorkoutSummary; synced: boolean; server?: unknown;
}

const num = (v: unknown) => (v == null ? null : Number(v));

/** Server-Zeile → Übungen in der ursprünglichen Reihenfolge (erste Satz-ID je Übung). */
export function exercisesFromServer(row: ServerWorkoutRow): WorkoutExercise[] {
  const bySlug = new Map<string, SetEntry[]>();
  const sorted = [...row.workout_sets].filter((s) => s.exercises?.slug).sort((a, b) => a.set_index - b.set_index);
  for (const s of sorted) {
    const slug = s.exercises!.slug;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push({ id: s.id, weightKg: num(s.weight_kg), reps: num(s.reps), durationS: num(s.duration_s), done: s.completed });
  }
  return [...bySlug].map(([slug, sets]) => ({ slug, sets }));
}

export function mergeHistory(server: ServerWorkoutRow[], local: HistoryItem[], ctx: ScoreContext, defaultTitle: string) {
  const byId = new Map<string, HistoryItem>();
  for (const l of local) byId.set(l.id, l);
  for (const r of server) {
    const id = r.client_id ?? r.id;
    if (byId.has(id)) { byId.set(id, { ...byId.get(id)!, synced: true }); continue; }
    const startedAt = new Date(r.started_at).getTime();
    byId.set(id, {
      id, title: defaultTitle, planWeekday: null, startedAt, endedAt: r.ended_at ? new Date(r.ended_at).getTime() : startedAt,
      exercises: exercisesFromServer(r), notes: r.notes ?? '', synced: true,
      summary: undefined as unknown as WorkoutSummary,
    });
  }
  // chronologisch neu auswerten → Bestwerte, PRs und Rang-Fortschritt stimmen auf jedem Gerät
  const ordered = [...byId.values()].sort((a, b) => a.endedAt - b.endedAt);
  let bests: Record<string, PersonalBest> = {};
  const lastSets: Record<string, { weightKg: number | null; reps: number | null; durationS: number | null }[]> = {};
  for (const w of ordered) {
    const s = summarize(w.exercises, w.startedAt, w.endedAt, bests, ctx);
    w.summary = w.summary ? { ...s, xp: w.summary.xp, newBadges: w.summary.newBadges } : s;
    bests = { ...bests, ...s.bests };
    for (const e of w.exercises) {
      const d = e.sets.filter((x) => x.done);
      if (d.length) lastSets[e.slug] = d.map(({ weightKg, reps, durationS }) => ({ weightKg, reps, durationS }));
    }
  }
  return { history: ordered.reverse().slice(0, 200), bests, lastSets };
}
