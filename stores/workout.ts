// Aktives Workout + lokale Historie. Persistiert in AsyncStorage → übersteht App-Neustart und Offline.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PersonalBest, SetEntry, WorkoutExercise, WorkoutSummary } from '../lib/workoutSummary';

export interface ActiveWorkout {
  id: string; // = client_id beim Sync
  title: string;
  planWeekday: number | null;
  startedAt: number;
  exercises: WorkoutExercise[];
  notes: string;
}

export interface FinishedWorkout extends ActiveWorkout { endedAt: number; summary: WorkoutSummary; synced: boolean }

interface WorkoutState {
  active: ActiveWorkout | null;
  history: FinishedWorkout[];
  bests: Record<string, PersonalBest>;
  /** letzte Werte je Übung – Platzhalter in den Satz-Zeilen */
  lastSets: Record<string, { weightKg: number | null; reps: number | null; durationS: number | null }[]>;
  xp: number;
  restDefaultS: number;

  start: (title: string, exercises: { slug: string; sets: number; reps?: number; durationS?: number }[], planWeekday?: number | null) => void;
  addExercise: (slug: string) => void;
  removeExercise: (index: number) => void;
  replaceExercise: (index: number, slug: string) => void;
  addSet: (exIndex: number) => void;
  removeSet: (exIndex: number, setId: string) => void;
  updateSet: (exIndex: number, setId: string, patch: Partial<SetEntry>) => void;
  setNotes: (notes: string) => void;
  discard: () => void;
  finish: (summary: WorkoutSummary, endedAt: number) => FinishedWorkout | null;
  markSynced: (id: string) => void;
}

const blankSet = (prev?: { weightKg: number | null; reps: number | null; durationS: number | null }): SetEntry => ({
  id: randomUUID(), weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null, durationS: prev?.durationS ?? null, done: false,
});

const mapEx = (s: WorkoutState, i: number, fn: (e: WorkoutExercise) => WorkoutExercise) =>
  s.active ? { active: { ...s.active, exercises: s.active.exercises.map((e, j) => (j === i ? fn(e) : e)) } } : {};

export const useWorkout = create<WorkoutState>()(
  persist(
    (set, get) => ({
      active: null, history: [], bests: {}, lastSets: {}, xp: 0, restDefaultS: 90,

      start: (title, exercises, planWeekday = null) => set((s) => ({
        active: {
          id: randomUUID(), title, planWeekday, startedAt: Date.now(), notes: '',
          exercises: exercises.map((e) => ({
            slug: e.slug,
            sets: Array.from({ length: e.sets }, (_, k) => {
              const last = s.lastSets[e.slug]?.[k] ?? s.lastSets[e.slug]?.at(-1);
              return { ...blankSet(), weightKg: last?.weightKg ?? null, reps: null, durationS: null };
            }),
          })),
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

      finish: (summary, endedAt) => {
        const a = get().active;
        if (!a) return null;
        const done: FinishedWorkout = { ...a, endedAt, summary, synced: false };
        const lastSets = { ...get().lastSets };
        for (const e of a.exercises) {
          const d = e.sets.filter((x) => x.done);
          if (d.length) lastSets[e.slug] = d.map(({ weightKg, reps, durationS }) => ({ weightKg, reps, durationS }));
        }
        set((s) => ({
          active: null,
          history: [done, ...s.history].slice(0, 200),
          bests: { ...s.bests, ...summary.bests },
          lastSets,
          xp: s.xp + summary.xp.total,
        }));
        return done;
      },
      markSynced: (id) => set((s) => ({ history: s.history.map((w) => (w.id === id ? { ...w, synced: true } : w)) })),
    }),
    { name: 'ascend-workout', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
