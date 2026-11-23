import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Athlete, Gender } from '@/lib/ranking';
import { StreakState, toDateKey } from '@/lib/streak';
import { levelFromXp } from '@/lib/xp';
import { LoggedSet, Workout, WorkoutResult, finishWorkout } from '@/lib/workout';

export type Goal = 'muscle' | 'strength' | 'lose' | 'fit';

export interface Profile {
  name: string;
  gender: Gender;
  age: number;
  bodyweightKg: number;
  goal: Goal;
  trainingDays: number;
}

export interface DraftSet extends LoggedSet {
  key: string;
  done: boolean;
}

export interface Draft {
  startedAt: number;
  sets: DraftSet[];
}

interface State {
  profile: Profile | null;
  history: Workout[];
  streak: StreakState;
  xp: number;
  draft: Draft | null;
  lastResult: WorkoutResult | null;
  hydrated: boolean;

  completeOnboarding: (profile: Profile, checkIn: LoggedSet[]) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  startWorkout: () => void;
  addSet: (exerciseId: string) => void;
  updateSet: (key: string, patch: Partial<Pick<DraftSet, 'weightKg' | 'reps' | 'durationS'>>) => void;
  toggleSet: (key: string) => void;
  removeSet: (key: string) => void;
  discardWorkout: () => void;
  finishActiveWorkout: () => WorkoutResult | null;
  reset: () => void;
}

const emptyStreak: StreakState = { current: 0, longest: 0, lastWorkoutDate: null };
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const toAthlete = (p: Profile): Athlete => ({ gender: p.gender, age: p.age, bodyweightKg: p.bodyweightKg });

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: null,
      history: [],
      streak: emptyStreak,
      xp: 0,
      draft: null,
      lastResult: null,
      hydrated: false,

      completeOnboarding: (profile, checkIn) => {
        const now = Date.now();
        const history: Workout[] = checkIn.length
          ? [{ id: uid(), date: toDateKey(new Date(now)), startedAt: now, endedAt: now, sets: checkIn, volumeKg: 0, xp: 0 }]
          : [];
        set({ profile, history, streak: emptyStreak, xp: 0, draft: null, lastResult: null });
      },

      updateProfile: (patch) => {
        const { profile } = get();
        if (profile) set({ profile: { ...profile, ...patch } });
      },

      startWorkout: () => {
        if (!get().draft) set({ draft: { startedAt: Date.now(), sets: [] } });
      },

      addSet: (exerciseId) => {
        const { draft, history } = get();
        if (!draft) return;
        // Vorbelegung mit dem letzten Satz dieser Übung (aktuelles Workout, sonst Historie)
        const prevInDraft = [...draft.sets].reverse().find((s) => s.exerciseId === exerciseId);
        const prevInHistory = [...history].reverse().flatMap((w) => [...w.sets].reverse()).find((s) => s.exerciseId === exerciseId);
        const prev = prevInDraft ?? prevInHistory;
        const newSet: DraftSet = {
          key: uid(),
          exerciseId,
          weightKg: prev?.weightKg ?? 0,
          reps: prev?.reps ?? 0,
          durationS: prev?.durationS,
          done: false,
        };
        set({ draft: { ...draft, sets: [...draft.sets, newSet] } });
      },

      updateSet: (key, patch) => {
        const { draft } = get();
        if (!draft) return;
        set({ draft: { ...draft, sets: draft.sets.map((s) => (s.key === key ? { ...s, ...patch } : s)) } });
      },

      toggleSet: (key) => {
        const { draft } = get();
        if (!draft) return;
        set({ draft: { ...draft, sets: draft.sets.map((s) => (s.key === key ? { ...s, done: !s.done } : s)) } });
      },

      removeSet: (key) => {
        const { draft } = get();
        if (!draft) return;
        set({ draft: { ...draft, sets: draft.sets.filter((s) => s.key !== key) } });
      },

      discardWorkout: () => set({ draft: null }),

      finishActiveWorkout: () => {
        const { draft, profile, history, streak, xp } = get();
        if (!draft || !profile) return null;
        const now = Date.now();
        const doneSets: LoggedSet[] = draft.sets
          .filter((s) => s.done)
          .map(({ exerciseId, weightKg, reps, durationS }) => ({ exerciseId, weightKg, reps, durationS }));
        const result = finishWorkout({
          athlete: toAthlete(profile),
          history,
          sets: doneSets,
          streak,
          trainingDays: profile.trainingDays,
          today: toDateKey(new Date(now)),
          startedAt: draft.startedAt,
          endedAt: now,
          id: uid(),
        });
        if (result.workout.sets.length === 0) return null;
        set({
          history: [...history, result.workout],
          streak: result.streak,
          xp: xp + result.workout.xp,
          draft: null,
          lastResult: result,
        });
        return result;
      },

      reset: () => set({ profile: null, history: [], streak: emptyStreak, xp: 0, draft: null, lastResult: null }),
    }),
    {
      name: 'ascend-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, history: s.history, streak: s.streak, xp: s.xp, draft: s.draft, lastResult: s.lastResult }),
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

export const useLevel = () => levelFromXp(useStore((s) => s.xp));
