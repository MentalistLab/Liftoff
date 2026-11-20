// Reine Darstellungslogik der Muskelkarte (ohne React) – testbar mit Jest.
import type { Gender, Muscle } from '../supabase/functions/_shared/core/standards.ts';
import { MUSCLES } from '../supabase/functions/_shared/core/standards.ts';
import { scoreToRank, TIER_COLORS } from '../supabase/functions/_shared/core/ranking.ts';
import { MUSCLE_MAP, MUSCLE_MAP_HEIGHT } from './muscleMap.ts';

export type MuscleMapView = 'both' | 'front' | 'back';
export type MuscleScores = Partial<Record<Muscle, number | null>>;

/** Größe der Quellbilder in assets/body. */
export const BODY_IMAGE_SIZE = { width: 1536, height: 1024 } as const;

/** Trennlinie zwischen Vorder- und Rückansicht im Quellbild (x). */
const SPLIT_X: Record<'male' | 'female', number> = { male: 415, female: 1165 };

/** Für die Grafik: „Keine Angabe“ nutzt die männliche Figur. */
export function figureFor(gender: Gender): 'male' | 'female' {
  return gender === 'female' ? 'female' : 'male';
}

/** viewBox-String für react-native-svg: Ausschnitt Vorder-, Rückseite oder beides. */
export function viewBoxFor(gender: Gender, view: MuscleMapView = 'both'): { x: number; y: number; width: number; height: number } {
  const fig = figureFor(gender);
  const [x0, y, w] = MUSCLE_MAP[fig].viewBox;
  const split = SPLIT_X[fig];
  const x = view === 'back' ? split : x0;
  const end = view === 'front' ? split : x0 + w;
  return { x, y, width: end - x, height: MUSCLE_MAP_HEIGHT };
}

export function viewBoxString(gender: Gender, view: MuscleMapView = 'both'): string {
  const v = viewBoxFor(gender, view);
  return `${v.x} ${v.y} ${v.width} ${v.height}`;
}

export interface MuscleFill {
  color: string | null;
  /** Deckkraft: Division I heller, III satter. */
  opacity: number;
  tier: number | null;
  division: number | null;
}

/** Farbe einer Muskelfläche aus dem Muskel-Score (0–100). Ohne Score: keine Füllung. */
export function muscleFill(score: number | null | undefined): MuscleFill {
  if (score == null || !Number.isFinite(score)) return { color: null, opacity: 0, tier: null, division: null };
  const rank = scoreToRank(score);
  return { color: TIER_COLORS[rank.tier - 1], opacity: 0.55 + rank.division * 0.12, tier: rank.tier, division: rank.division };
}

/** Pfade einer Figur in fester Reihenfolge (Rücken zuerst, damit kleine Flächen oben liegen). */
export function musclePaths(gender: Gender): { muscle: Muscle; d: string }[] {
  const paths = MUSCLE_MAP[figureFor(gender)].paths;
  const order: Muscle[] = ['back', 'legs', 'glutes', 'core', 'chest', 'shoulders', 'triceps', 'biceps'];
  return order.filter((m) => MUSCLES.includes(m)).map((muscle) => ({ muscle, d: paths[muscle] }));
}
