// Progressive Overload: Vorschlag für das nächste Mal nach einem Workout.
// Regel (Doppel-Progression):
// - alle geplanten Sätze am oberen Ende des Wdh.-Bereichs (und nicht am Limit) → mehr Gewicht
// - die Hälfte der Sätze unter dem unteren Ende → 5 % leichter (Deload)
// - sonst Gewicht halten und Wiederholungen aufbauen

export interface ProgressionTarget {
  sets: number;
  repsMin: number;
  repsMax: number;
  weightKg: number | null;
  /** Beine/Gesäß/Kreuzheben steigern in größeren Schritten */
  lowerBody: boolean;
}

export interface PerformedSet {
  weightKg: number | null;
  reps: number;
  rpe?: number | null;
}

export type ProgressionAction = 'increase_weight' | 'increase_reps' | 'hold' | 'deload';

export interface ProgressionSuggestion {
  action: ProgressionAction;
  weightKg: number | null;
  repsMin: number;
  repsMax: number;
  noteDe: string;
  noteEn: string;
}

export function roundTo(x: number, step = 2.5): number {
  return Math.round(x / step) * step;
}

/** Startgewicht für einen Wdh.-Bereich aus dem 1RM (90 % des rechnerischen Werts). */
export function startingWeight(oneRm: number, repsMax: number): number {
  return Math.max(0, roundTo((oneRm / (1 + Math.min(repsMax, 12) / 30)) * 0.9));
}

export function suggestNext(t: ProgressionTarget, performed: PerformedSet[]): ProgressionSuggestion {
  const working = performed.filter((s) => s.reps > 0);
  const hold = (de: string, en: string): ProgressionSuggestion => ({ action: 'hold', weightKg: t.weightKg, repsMin: t.repsMin, repsMax: t.repsMax, noteDe: de, noteEn: en });
  if (working.length === 0) return hold('Noch keine Daten – starte mit dem geplanten Gewicht.', 'No data yet – start with the planned weight.');

  const rpes = working.map((s) => s.rpe).filter((r): r is number => typeof r === 'number');
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 8;
  const allTop = working.length >= t.sets && working.every((s) => s.reps >= t.repsMax) && avgRpe <= 9;
  const fails = working.filter((s) => s.reps < t.repsMin).length;
  const weight = t.weightKg ?? (working.find((s) => s.weightKg != null)?.weightKg ?? null);

  if (allTop) {
    if (weight == null || weight <= 0) {
      return { action: 'increase_reps', weightKg: weight, repsMin: t.repsMin + 1, repsMax: t.repsMax + 1, noteDe: 'Stark! Nächstes Mal eine Wiederholung mehr.', noteEn: 'Strong! One more rep next time.' };
    }
    const inc = t.lowerBody ? 5 : 2.5;
    return { action: 'increase_weight', weightKg: weight + inc, repsMin: t.repsMin, repsMax: t.repsMax, noteDe: `Alle Sätze geschafft – nächstes Mal +${inc.toString().replace('.', ',')} kg.`, noteEn: `All sets done – add ${inc} kg next time.` };
  }
  if (fails >= Math.ceil(t.sets / 2) && weight != null && weight > 0) {
    return { action: 'deload', weightKg: roundTo(weight * 0.95), repsMin: t.repsMin, repsMax: t.repsMax, noteDe: 'Heute war schwer – nächstes Mal 5 % leichter und sauber durchziehen.', noteEn: 'Tough session – go 5% lighter next time.' };
  }
  return hold('Gewicht halten und Wiederholungen bis zum oberen Ende aufbauen.', 'Keep the weight and build reps to the top of the range.');
}
