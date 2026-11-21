// Aktives Workout + lokale Historie. Persistiert in AsyncStorage → übersteht App-Neustart und Offline.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EMPTY_STREAK, nextTargets, plannedWeight, updateStreak, type ExerciseTarget, type SavedTarget, type StreakEvent, type StreakState } from '../lib/training';
import type { PersonalBest, SetEntry, WorkoutExercise, WorkoutSummary } from '../lib/workoutSummary';

/** Antwort von finish-workout (verbindliches Server-Ergebnis) – nur die Felder, die die App anzeigt. */
export interface ServerResult {
  xp: { total: number; multiplier: number };
  level: { level: number };
  streak: { current: number; longest: number; freezes: number };
  /** IDs neu freigeschalteter Abzeichen */
  badges: string[];
  overall: { label: string; tier: number; division: number } | null;
  exercises?: { slug: string; isPr?: boolean; rankUps?: number; rank?: { tier: number; division: number; label: string } | null }[];
}

export interface ActiveWorkout {
  id: string; // = client_id beim Sync
  title: string;
  planWeekday: number | null;
  startedAt: number;
  exercises: WorkoutExercise[];
  notes: string;
}

export interface FinishedWorkout extends ActiveWorkout { endedAt: number; summary: WorkoutSummary; synced: boolean; server?: ServerResult }

interface WorkoutState {
  active: ActiveWorkout | null;
  history: FinishedWorkout[];
  bests: Record<string, PersonalBest>;
  /** letzte Werte je Übung – Platzhalter in den Satz-Zeilen */
  lastSets: Record<string, { weightKg: number | null; reps: number | null; durationS: number | null }[]>;
  xp: number;
  restDefaultS: number;
  streak: StreakState;
  /** Progressions-Vorgaben je Übung fürs nächste Plan-Workout */
  targets: Record<string, SavedTarget>;

  start: (title: string, exercises: ({ slug: string } & ExerciseTarget)[], planWeekday?: number | null) => void;
  addExercise: (slug: string) => void;
  removeExercise: (index: number) => void;
  replaceExercise: (index: number, slug: string) => void;
  addSet: (exIndex: number) => void;
  removeSet: (exIndex: number, setId: string) => void;
  updateSet: (exIndex: number, setId: string, patch: Partial<SetEntry>) => void;
  setNotes: (notes: string) => void;
  discard: () => void;
  finish: (summary: WorkoutSummary, endedAt: number, plannedWeekdays: number[]) => { workout: FinishedWorkout; streakEvents: StreakEvent[] } | null;
  markSynced: (id: string, server?: ServerResult) => void;
  /** Beim App-Start: verpasste Trainingstage auswerten (Streak verloren / Freeze verbraucht) */
  checkStreak: (plannedWeekdays: number[]) => StreakEvent[];
}

const blankSet = (prev?: { weightKg: number | null; reps: number | null; durationS: number | null }): SetEntry => ({
  id: randomUUID(), weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null, durationS: prev?.durationS ?? null, done: false,
});

const mapEx = (s: WorkoutState, i: number, fn: (e: WorkoutExercise) => WorkoutExercise) =>
  s.active ? { active: { ...s.active, exercises: s.active.exercises.map((e, j) => (j === i ? fn(e) : e)) } } : {};

export const useWorkout = create<WorkoutState>()(
  persist(
    (set, get) => ({
      active: null, history: [], bests: {}, lastSets: {}, xp: 0, restDefaultS: 90, streak: EMPTY_STREAK, targets: {},

      start: (title, exercises, planWeekday = null) => set((s) => ({
        active: {
          id: randomUUID(), title, planWeekday, startedAt: Date.now(), notes: '',
          exercises: exercises.map(({ slug, ...t }) => {
            const saved = s.targets[slug];
            const weightKg = plannedWeight(slug, t, s.targets, s.bests);
            const target = t.sets ? { ...t, repsMin: saved?.repsMin ?? t.repsMin, repsMax: saved?.repsMax ?? t.repsMax, weightKg } : undefined;
            return {
              slug, target,
              sets: Array.from({ length: Math.max(1, t.sets || 3) }, (_, k) => {
                const last = s.lastSets[slug]?.[k] ?? s.lastSets[slug]?.at(-1);
                return { ...blankSet(), weightKg: weightKg ?? last?.weightKg ?? null };
              }),
            };
          }),
        },
      })),
      addExercise: (slug) => set((s) => s.active ? { active: { ...s.active, exercises: [...s.active.exercises, { slug, sets: [blankSet(), blankSet(), blankSet()] }] } } : {}),
      removeExercise: (i) => set((s) => s.active ? { active: { ...s.active, exercises: s.active.exercises.filter((_, j) => j !== i) } } : {}),
      replaceExercise: (i, slug) => set((s) => mapEx(s, i, (e) => ({ slug, sets: e.sets.map(() => blankSet()) }))),
      addSet: (i) => set((s) => mapEx(s, i, (e) => {
        const last = e.sets.at(-1);
        return { ...e, sets: [...e.sets, blankSet(last ? { weightKg: last.weightKg, reps: last.reps, durationS: last.durationS } : undefined)] };
      })),
      removeSet: (i, id) => set((s) => mapEx(s, i, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== id) }))),
      updateSet: (i, id, patch) => set((s) => mapEx(s, i, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))),
      setNotes: (notes) => set((s) => (s.active ? { active: { ...s.active, notes } } : {})),
      discard: () => set({ active: null }),

      finish: (summary, endedAt, plannedWeekdays) => {
        const a = get().active;
        if (!a) return null;
        const done: FinishedWorkout = { ...a, endedAt, summary, synced: false };
        const lastSets = { ...get().lastSets };
        for (const e of a.exercises) {
          const d = e.sets.filter((x) => x.done);
          if (d.length) lastSets[e.slug] = d.map(({ weightKg, reps, durationS }) => ({ weightKg, reps, durationS }));
        }
        const streak = updateStreak(get().streak, plannedWeekdays, summary.completedSets > 0, new Date(endedAt));
        const nt = nextTargets(a.exercises);
        const targets = { ...get().targets };
        for (const [slug, t] of Object.entries(nt)) targets[slug] = { weightKg: t.weightKg, repsMin: t.repsMin, repsMax: t.repsMax, noteDe: t.noteDe, noteEn: t.noteEn };
        set((s) => ({
          active: null,
          history: [done, ...s.history].slice(0, 200),
          bests: { ...s.bests, ...summary.bests },
          lastSets,
          xp: s.xp + summary.xp.total,
          streak: streak.state,
          targets,
        }));
        return { workout: done, streakEvents: streak.events };
      },
      markSynced: (id, server) => set((s) => ({ history: s.history.map((w) => (w.id === id ? { ...w, synced: true, server: server ?? w.server } : w)) })),
      checkStreak: (plannedWeekdays) => {
        const r = updateStreak(get().streak, plannedWeekdays, false);
        set({ streak: r.state });
        return r.events;
      },
    }),
    { name: 'ascend-workout', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
