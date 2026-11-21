import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Goal } from '../lib/planner';
import type { Experience, LiftInput, OnboardingRankResult } from '../lib/onboardingRanks';
import type { Gender } from '../lib/standards';

export type Location = 'gym' | 'home_dumbbells' | 'bodyweight';

export interface OnboardingData {
  goal: Goal | null;
  experience: Experience | null;
  gender: Gender | null;
  age: number;
  bodyweightKg: number;
  heightCm: number;
  location: Location | null;
  trainingDays: number[]; // 1 = Mo … 7 = So
  lifts: Partial<Record<string, LiftInput | null>>;
}

interface OnboardingState extends OnboardingData {
  result: OnboardingRankResult | null;
  completed: boolean;
  set: (patch: Partial<OnboardingData>) => void;
  setLift: (slug: string, lift: LiftInput | null) => void;
  setResult: (r: OnboardingRankResult) => void;
  complete: () => void;
  reset: () => void;
}

const initial: OnboardingData = {
  goal: null, experience: null, gender: null, age: 28, bodyweightKg: 75, heightCm: 178,
  location: null, trainingDays: [1, 3, 5], lifts: {},
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initial,
      result: null,
      completed: false,
      set: (patch) => set(patch),
      setLift: (slug, lift) => set((s) => ({ lifts: { ...s.lifts, [slug]: lift } })),
      setResult: (result) => set({ result }),
      complete: () => set({ completed: true }),
      reset: () => set({ ...initial, result: null, completed: false }),
    }),
    { name: 'ascend-onboarding', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
