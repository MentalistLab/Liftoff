import { EXERCISES, Exercise, MUSCLES, Muscle } from '@/data/exercises';

export type Gender = 'male' | 'female' | 'other';

export const TIER_NAMES = ['Eisen', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Meister', 'Titan'] as const;
export const TIER_COUNT = TIER_NAMES.length; // 8
export const DIVISIONS = 3;
const POINTS_PER_TIER = 100 / TIER_COUNT; // 12.5

export interface Rank {
  /** 0–100 */
  score: number;
  /** 1–8 (Eisen … Titan) */
  tier: number;
  /** 1–3 (I … III) */
  division: number;
}

export interface Athlete {
  gender: Gender;
  /** Alter in Jahren */
  age: number;
  bodyweightKg: number;
}

/** Epley-Formel; ab 12 Wiederholungen wird gedeckelt, da die Schätzung sonst ungenau wird. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 12) / 30);
}

/** Frauen haben im Schnitt niedrigere absolute Kraftwerte → Normen werden skaliert. */
export function genderFactor(gender: Gender, type: Exercise['type']): number {
  if (gender === 'male') return 1;
  const f = type === 'weight_ratio' ? 0.65 : type === 'reps' ? 0.7 : 0.9;
  return gender === 'female' ? f : (1 + f) / 2;
}

/** Ab 35 sinken die Normen um 0,8 % pro Jahr (min. 60 %); Jugendliche unter 18 ebenfalls leicht. */
export function ageFactor(age: number): number {
  if (age < 18) return 0.9;
  if (age <= 35) return 1;
  return Math.max(0.6, 1 - (age - 35) * 0.008);
}

/** Wandelt eine Leistung (1RM-Verhältnis, Wdh. oder Sekunden) in einen Score 0–100 um. */
export function scoreForValue(value: number, standards: readonly number[], factor = 1): number {
  const th = standards.map((s) => s * factor);
  if (value <= 0) return 0;
  const last = th.length - 1; // Index 8 = 100 Punkte
  if (value >= th[last]) return 100;
  for (let i = 0; i < last; i++) {
    if (value < th[i + 1]) {
      const span = th[i + 1] - th[i];
      const frac = span > 0 ? (value - th[i]) / span : 0;
      return (i + frac) * POINTS_PER_TIER;
    }
  }
  return 100;
}

export function rankFromScore(score: number): Rank {
  const s = Math.min(100, Math.max(0, score));
  const tier = Math.min(TIER_COUNT, Math.floor(s / POINTS_PER_TIER) + 1);
  const within = s - (tier - 1) * POINTS_PER_TIER;
  const division = Math.min(DIVISIONS, Math.floor(within / (POINTS_PER_TIER / DIVISIONS)) + 1);
  return { score: s, tier, division };
}

/** Eindeutiger Index 0–23 (zum Vergleichen von Rängen). */
export const rankIndex = (r: Rank): number => (r.tier - 1) * DIVISIONS + (r.division - 1);

export function rankName(r: Rank): string {
  return `${TIER_NAMES[r.tier - 1]} ${['I', 'II', 'III'][r.division - 1]}`;
}

/** Leistungswert, der mit den Normen verglichen wird. */
export function performanceValue(
  ex: Exercise,
  set: { weightKg: number; reps: number; durationS?: number },
  bodyweightKg: number,
): number {
  if (ex.type === 'time') return set.durationS ?? 0;
  if (ex.type === 'reps') return set.reps;
  return bodyweightKg > 0 ? estimate1RM(set.weightKg, set.reps) / bodyweightKg : 0;
}

export function exerciseRank(
  ex: Exercise,
  set: { weightKg: number; reps: number; durationS?: number },
  athlete: Athlete,
): Rank {
  const value = performanceValue(ex, set, athlete.bodyweightKg);
  const factor = genderFactor(athlete.gender, ex.type) * ageFactor(athlete.age);
  return rankFromScore(scoreForValue(value, ex.standards, factor));
}

/** Muskel-Score = Durchschnitt der besten zwei Übungen der Muskelgruppe. */
export function muscleScore(muscle: Muscle, exerciseScores: Record<string, number>): number | null {
  const scores = EXERCISES.filter((e) => e.muscle === muscle && exerciseScores[e.id] !== undefined)
    .map((e) => exerciseScores[e.id])
    .sort((a, b) => b - a)
    .slice(0, 2);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Gesamt-Score = Durchschnitt aller Muskelgruppen mit Daten. */
export function overallScore(exerciseScores: Record<string, number>): number | null {
  const scores = MUSCLES.map((m) => muscleScore(m, exerciseScores)).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
