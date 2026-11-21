// Kraftnormen für die Rangberechnung.
// Jede Norm hat 5 Schwellen: Anfänger, Novize, Fortgeschritten, Stark, Elite.
// weight_ratio = geschätztes 1RM ÷ Körpergewicht, reps = Wiederholungen, time = Sekunden.
// Die komplette Übungsliste (≥ 80) kommt als Seed in Phase 3 – hier stehen die
// Übungen, die das Onboarding und die Tests brauchen.

export type Gender = 'male' | 'female' | 'none';
export type RankingType = 'weight_ratio' | 'reps' | 'time';
export type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'glutes' | 'core';

export interface Standards {
  male: number[];
  female: number[];
}

export interface ExerciseDef {
  slug: string;
  nameDe: string;
  nameEn: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell';
  rankingType: RankingType;
  standards: Standards;
}

export const MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core'];

export const MUSCLE_NAMES: Record<Muscle, { de: string; en: string }> = {
  chest: { de: 'Brust', en: 'Chest' },
  back: { de: 'Rücken', en: 'Back' },
  shoulders: { de: 'Schultern', en: 'Shoulders' },
  biceps: { de: 'Bizeps', en: 'Biceps' },
  triceps: { de: 'Trizeps', en: 'Triceps' },
  legs: { de: 'Beine', en: 'Legs' },
  glutes: { de: 'Gesäß', en: 'Glutes' },
  core: { de: 'Core', en: 'Core' },
};

export const CORE_EXERCISES: ExerciseDef[] = [
  { slug: 'bench_press', nameDe: 'Bankdrücken', nameEn: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [0.5, 0.75, 1.0, 1.5, 2.0], female: [0.25, 0.5, 0.75, 1.0, 1.5] } },
  { slug: 'back_squat', nameDe: 'Kniebeuge', nameEn: 'Back Squat', primaryMuscle: 'legs', secondaryMuscles: ['glutes', 'core'], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [0.75, 1.25, 1.5, 2.25, 2.75], female: [0.5, 0.75, 1.25, 1.5, 2.0] } },
  { slug: 'deadlift', nameDe: 'Kreuzheben', nameEn: 'Deadlift', primaryMuscle: 'back', secondaryMuscles: ['glutes', 'legs', 'core'], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 1.0, 1.25, 1.75, 2.5] } },
  { slug: 'overhead_press', nameDe: 'Schulterdrücken', nameEn: 'Overhead Press', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [0.35, 0.55, 0.8, 1.05, 1.35], female: [0.2, 0.35, 0.5, 0.75, 1.0] } },
  { slug: 'barbell_row', nameDe: 'Langhantelrudern', nameEn: 'Barbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [0.5, 0.75, 1.0, 1.5, 1.75], female: [0.25, 0.4, 0.65, 0.9, 1.2] } },
  { slug: 'hip_thrust', nameDe: 'Hip Thrust', nameEn: 'Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['legs'], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [0.5, 1.0, 1.5, 2.25, 3.0], female: [0.5, 1.0, 1.5, 2.0, 2.75] } },
  { slug: 'barbell_curl', nameDe: 'Langhantel-Curl', nameEn: 'Barbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'barbell', rankingType: 'weight_ratio', standards: { male: [0.2, 0.4, 0.6, 0.85, 1.15], female: [0.1, 0.2, 0.4, 0.6, 0.85] } },
  { slug: 'pull_up', nameDe: 'Klimmzüge', nameEn: 'Pull-up', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: 'bodyweight', rankingType: 'reps', standards: { male: [1, 5, 12, 20, 30], female: [0, 1, 5, 12, 20] } },
  { slug: 'push_up', nameDe: 'Liegestütze', nameEn: 'Push-up', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: 'bodyweight', rankingType: 'reps', standards: { male: [5, 15, 30, 45, 60], female: [2, 8, 18, 30, 45] } },
  { slug: 'dip', nameDe: 'Dips', nameEn: 'Dip', primaryMuscle: 'triceps', secondaryMuscles: ['chest', 'shoulders'], equipment: 'bodyweight', rankingType: 'reps', standards: { male: [2, 8, 16, 28, 40], female: [0, 3, 8, 16, 25] } },
  { slug: 'plank', nameDe: 'Unterarmstütz', nameEn: 'Plank', primaryMuscle: 'core', secondaryMuscles: [], equipment: 'bodyweight', rankingType: 'time', standards: { male: [20, 45, 90, 150, 240], female: [20, 45, 90, 150, 240] } },
];

export const ONBOARDING_LIFTS = ['bench_press', 'back_squat', 'deadlift', 'pull_up', 'push_up'];

// Register: Kernübungen sind immer da; catalog.ts registriert den erweiterten Katalog (App + Seed).
const REGISTRY = new Map<string, ExerciseDef>(CORE_EXERCISES.map((e) => [e.slug, e]));

export function registerExercises(list: ExerciseDef[]): void {
  for (const e of list) REGISTRY.set(e.slug, e);
}

export function exerciseBySlug(slug: string): ExerciseDef | undefined {
  return REGISTRY.get(slug);
}
