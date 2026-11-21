// Erster Rang direkt nach dem Onboarding – aus den angegebenen Bestwerten,
// fehlende Werte werden aus der Erfahrung geschätzt.
import { bestScore, fallbackPercentile, muscleScore, overallScore, type MuscleContribution } from '../supabase/functions/_shared/core/ranking.ts';
import { exerciseBySlug, MUSCLES, ONBOARDING_LIFTS, type Gender, type Muscle } from '../supabase/functions/_shared/core/standards.ts';

export type Experience = 'beginner' | 'intermediate' | 'advanced';

/** Eingabe pro Übung: Gewicht × Wdh. (Hantelübungen) oder nur Wdh. (Körpergewicht). null = „Weiß ich nicht“. */
export interface LiftInput { weightKg?: number | null; reps?: number | null }

export interface OnboardingRankInput {
  gender: Gender;
  age: number | null;
  bodyweightKg: number;
  experience: Experience;
  lifts: Partial<Record<string, LiftInput | null>>;
}

export interface OnboardingRankResult {
  muscleScores: Partial<Record<Muscle, number>>;
  overall: number;
  percentile: number;
  /** Stärkste Muskelgruppen, absteigend. */
  top: Muscle[];
  /** Welche Übungen geschätzt wurden. */
  estimated: string[];
}

/** Konservative Schätzung, wenn jemand einen Wert nicht kennt. */
export const EXPERIENCE_SCORE: Record<Experience, number> = { beginner: 22, intermediate: 42, advanced: 62 };

export function computeOnboardingRanks(input: OnboardingRankInput): OnboardingRankResult {
  const ctx = { gender: input.gender, bodyweightKg: input.bodyweightKg, age: input.age };
  const contributions: Record<Muscle, MuscleContribution[]> = Object.fromEntries(MUSCLES.map((m) => [m, []])) as never;
  const estimated: string[] = [];

  for (const slug of ONBOARDING_LIFTS) {
    const ex = exerciseBySlug(slug);
    if (!ex) continue;
    const lift = input.lifts[slug];
    let score = lift ? bestScore(ex, [{ weightKg: lift.weightKg ?? null, reps: lift.reps ?? null }], ctx) : null;
    if (score == null) {
      score = EXPERIENCE_SCORE[input.experience];
      estimated.push(slug);
    }
    contributions[ex.primaryMuscle].push({ score, role: 'primary' });
    for (const m of ex.secondaryMuscles) contributions[m].push({ score, role: 'secondary' });
  }

  const muscleScores: Partial<Record<Muscle, number>> = {};
  for (const m of MUSCLES) {
    const s = muscleScore(contributions[m]);
    if (s != null) muscleScores[m] = s;
  }
  const overall = overallScore(muscleScores) ?? EXPERIENCE_SCORE[input.experience];
  const top = (Object.keys(muscleScores) as Muscle[]).sort((a, b) => muscleScores[b]! - muscleScores[a]!).slice(0, 3);
  return { muscleScores, overall, percentile: fallbackPercentile(overall), top, estimated };
}
