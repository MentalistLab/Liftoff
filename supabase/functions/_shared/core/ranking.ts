// Rang-Algorithmus von Ascend.
// Reines TypeScript ohne Abhängigkeiten: läuft in der App (Expo), in Jest und in
// Supabase Edge Functions (Deno). Deshalb Imports mit .ts-Endung.

import type { Gender, Muscle, RankingType, Standards } from './standards.ts';

/** Score, der beim Erreichen der 5 Normschwellen vergeben wird. */
export const LEVEL_SCORES = [15, 35, 55, 78, 95];

export const TIER_NAMES = {
  de: ['Eisen', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Meister', 'Titan'],
  en: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Titan'],
};
export const TIER_COLORS = ['#7A7F8C', '#B8733D', '#C9D1DC', '#F5C451', '#4FD1C5', '#5AB8FF', '#B05CFF', '#FF4D6D'];
export const DIVISION_LABELS = ['I', 'II', 'III'];

/** Gewichtung der Muskelgruppen für den Gesamtrang. */
export const MUSCLE_WEIGHTS: Record<Muscle, number> = {
  legs: 1.3, back: 1.2, chest: 1.1, shoulders: 1.0, glutes: 0.9, core: 0.7, biceps: 0.6, triceps: 0.6,
};

export interface Rank {
  /** 1 = Eisen … 8 = Titan */
  tier: number;
  /** 1 = I (Einstieg) … 3 = III (kurz vor der nächsten Stufe) */
  division: number;
  /** 0 … 23, fortlaufende Rangstufe */
  step: number;
  /** Fortschritt zur nächsten Rangstufe, 0 … 1 */
  progress: number;
}

export interface SetInput {
  weightKg?: number | null;
  reps?: number | null;
  durationS?: number | null;
}

export interface ScoreContext {
  gender: Gender;
  bodyweightKg: number;
  age?: number | null;
}

export interface RankableExercise {
  rankingType: RankingType;
  standards: Standards;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Geschätztes 1RM nach Epley: w × (1 + reps/30).
 * Über 12 Wiederholungen wird die Formel ungenau – wir rechnen dann konservativ mit 12.
 */
export function epley1RM(weightKg: number | null | undefined, reps: number | null | undefined): number | null {
  if (!weightKg || weightKg <= 0 || !reps || reps < 1) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 12) / 30);
}

/**
 * Altersfaktor: Jugendliche und Masters bekommen einen Bonus,
 * damit der Vergleich fair bleibt. 23–39 Jahre = 1,0.
 */
export function ageFactor(age?: number | null): number {
  if (!age || age <= 0) return 1;
  if (age < 14) return 1.15;
  if (age <= 17) return 1 + (18 - age) * 0.03;
  if (age <= 22) return 1 + (23 - age) * 0.005;
  if (age <= 39) return 1;
  return Math.min(1.6, 1 + (age - 39) * 0.012 + Math.max(0, age - 55) * 0.008);
}

/** Schwellen passend zum Geschlecht; „keine Angabe“ = Mittelwert beider Normen. */
export function thresholdsFor(standards: Standards, gender: Gender): number[] {
  if (gender === 'male') return standards.male;
  if (gender === 'female') return standards.female;
  return standards.male.map((m, i) => (m + standards.female[i]) / 2);
}

/**
 * Wandelt einen Leistungswert in einen Score 0–100 um.
 * Zwischen den Schwellen linear, oberhalb von Elite flacht die Kurve bis 100 ab.
 */
export function valueToScore(value: number, thresholds: number[]): number {
  if (!(value > 0)) return 0;
  const xs = [0, ...thresholds];
  const ys = [0, ...LEVEL_SCORES];
  for (let i = 0; i < xs.length - 1; i++) {
    if (value <= xs[i + 1]) {
      const span = xs[i + 1] - xs[i];
      if (span <= 0) continue;
      return round1(ys[i] + ((value - xs[i]) / span) * (ys[i + 1] - ys[i]));
    }
  }
  const t3 = xs[xs.length - 2];
  const t4 = xs[xs.length - 1];
  const scale = Math.max(1e-6, t4 - t3);
  return round1(Math.min(100, 95 + 5 * (1 - Math.exp(-(value - t4) / scale))));
}

/**
 * Leistungswert eines Satzes in der Einheit der Norm.
 * - weight_ratio: (1RM × Altersfaktor) ÷ Körpergewicht
 * - reps: Wiederholungen; mit Zusatzgewicht in gleichwertige Wiederholungen umgerechnet
 * - time: Sekunden
 */
export function performanceValue(ex: RankableExercise, set: SetInput, ctx: ScoreContext): number | null {
  const af = ageFactor(ctx.age);
  if (ex.rankingType === 'weight_ratio') {
    const oneRm = epley1RM(set.weightKg, set.reps);
    if (oneRm === null || !(ctx.bodyweightKg > 0)) return null;
    return (oneRm * af) / ctx.bodyweightKg;
  }
  if (ex.rankingType === 'reps') {
    const reps = set.reps ?? 0;
    if (!(reps > 0)) return null;
    const added = set.weightKg ?? 0;
    if (added !== 0 && ctx.bodyweightKg > 0 && ctx.bodyweightKg + added > 0) {
      const oneRm = epley1RM(ctx.bodyweightKg + added, reps);
      if (oneRm === null) return null;
      const eqReps = Math.max(0, 30 * (oneRm / ctx.bodyweightKg - 1));
      return eqReps * af;
    }
    return reps * af;
  }
  const s = set.durationS ?? 0;
  return s > 0 ? s * af : null;
}

/** Score 0–100 für einen einzelnen Satz (null, wenn der Satz nicht bewertbar ist). */
export function scoreSet(ex: RankableExercise, set: SetInput, ctx: ScoreContext): number | null {
  const v = performanceValue(ex, set, ctx);
  if (v === null) return null;
  return valueToScore(v, thresholdsFor(ex.standards, ctx.gender));
}

/** Bester Score aus mehreren Sätzen einer Übung. */
export function bestScore(ex: RankableExercise, sets: SetInput[], ctx: ScoreContext): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const sc = scoreSet(ex, s, ctx);
    if (sc !== null && (best === null || sc > best)) best = sc;
  }
  return best;
}

/** Score → Stufe × Division (24 Rangstufen). */
export function scoreToRank(score: number): Rank {
  const clamped = Math.max(0, Math.min(100, score));
  const exact = (clamped * 24) / 100;
  const step = Math.min(23, Math.floor(exact));
  const progress = clamped >= 100 ? 1 : Math.max(0, Math.min(1, exact - step));
  return { tier: Math.floor(step / 3) + 1, division: (step % 3) + 1, step, progress: Math.round(progress * 1000) / 1000 };
}

/** Minimaler Score für eine Rangstufe (0 … 23). */
export function scoreForStep(step: number): number {
  // aufrunden, damit der Score sicher in der Stufe landet
  return Math.ceil(((Math.max(0, Math.min(23, step)) * 100) / 24) * 10 - 1e-9) / 10;
}

export function rankLabel(rank: Pick<Rank, 'tier' | 'division'>, lang: 'de' | 'en' = 'de'): string {
  return `${TIER_NAMES[lang][rank.tier - 1]} ${DIVISION_LABELS[rank.division - 1]}`;
}

/** Wie viele Rangstufen zwischen zwei Scores aufgestiegen wurde (für XP). */
export function rankUps(before: number | null | undefined, after: number): number {
  const a = before == null ? -1 : scoreToRank(before).step;
  const b = scoreToRank(after).step;
  return before == null ? 0 : Math.max(0, b - a);
}

export interface MuscleContribution {
  score: number;
  role: 'primary' | 'secondary';
}

/**
 * Muskelrang: gewichteter Schnitt der besten 3 Übungen der Muskelgruppe (50/30/20 %).
 * Übungen, die den Muskel nur sekundär trainieren, zählen mit 85 % ihres Scores.
 */
export function muscleScore(contributions: MuscleContribution[]): number | null {
  const vals = contributions
    .map((c) => (c.role === 'primary' ? c.score : c.score * 0.85))
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
    .slice(0, 3);
  if (vals.length === 0) return null;
  const w = [0.5, 0.3, 0.2].slice(0, vals.length);
  const sum = w.reduce((a, b) => a + b, 0);
  return round1(vals.reduce((acc, v, i) => acc + v * w[i], 0) / sum);
}

/**
 * Gesamtrang: gewichteter Schnitt aller Muskelgruppen mit Daten.
 * Wer nur wenige Muskelgruppen trainiert, bekommt einen Abschlag (max. −30 %),
 * damit eine einzelne starke Übung nicht den Gesamtrang bestimmt.
 */
export function overallScore(muscles: Partial<Record<Muscle, number | null>>): number | null {
  let wSum = 0;
  let acc = 0;
  let total = 0;
  for (const m of Object.keys(MUSCLE_WEIGHTS) as Muscle[]) {
    total += MUSCLE_WEIGHTS[m];
    const s = muscles[m];
    if (s != null) {
      acc += s * MUSCLE_WEIGHTS[m];
      wSum += MUSCLE_WEIGHTS[m];
    }
  }
  if (wSum === 0) return null;
  const coverage = wSum / total;
  return round1((acc / wSum) * (0.7 + 0.3 * coverage));
}

function erf(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

/**
 * Perzentil-Schätzung aus den Normtabellen, solange es zu wenige echte Nutzer
 * in der Gewichtsklasse gibt (die echte Berechnung macht die RPC get_percentile).
 */
export function fallbackPercentile(score: number): number {
  const z = (score - 45) / 18;
  return Math.max(1, Math.min(99, Math.round(50 * (1 + erf(z / Math.SQRT2)))));
}

const CLASSES = { male: [59, 66, 74, 83, 93, 105, 120], female: [47, 52, 57, 63, 69, 76, 84] };

/** Gewichtsklasse für Leaderboards, z. B. „74–83 kg“. */
export function weightClass(gender: Gender, bodyweightKg: number): string {
  const c = gender === 'female' ? CLASSES.female : CLASSES.male;
  if (bodyweightKg <= c[0]) return `≤${c[0]} kg`;
  for (let i = 1; i < c.length; i++) if (bodyweightKg <= c[i]) return `${c[i - 1]}–${c[i]} kg`;
  return `${c[c.length - 1]}+ kg`;
}
