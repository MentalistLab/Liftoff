// Demo-Daten, solange kein Supabase-Projekt verbunden bzw. niemand angemeldet ist.
import type { Gender, Muscle } from './standards';

export const DEMO_PROFILE = {
  username: 'demo',
  displayName: 'Alex',
  gender: 'male' as Gender,
  xp: 2840,
  currentStreak: 9,
};

export const DEMO_MUSCLE_SCORES: Partial<Record<Muscle, number>> = {
  chest: 61, back: 54, shoulders: 47, biceps: 39, triceps: 44, legs: 68, glutes: 58, core: 33,
};
