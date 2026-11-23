/** Datumsstrings im Format YYYY-MM-DD (lokale Zeit). */
export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * Wie viele Tage dürfen zwischen zwei Workouts liegen, ohne dass der Streak reißt?
 * Ruhetage brechen den Streak nicht: 3×/Woche → 3 Tage, 5×/Woche → 2 Tage.
 */
export const maxGapDays = (trainingDaysPerWeek: number): number =>
  Math.floor(7 / Math.max(1, Math.min(7, trainingDaysPerWeek))) + 1;

export interface StreakState {
  current: number;
  longest: number;
  lastWorkoutDate: string | null;
}

/** Aktualisiert den Streak nach einem abgeschlossenen Workout am Tag `today`. */
export function registerWorkout(state: StreakState, today: string, trainingDaysPerWeek: number): StreakState {
  if (state.lastWorkoutDate === today) return state; // Mehrere Workouts am selben Tag zählen einmal
  const alive =
    state.lastWorkoutDate !== null && daysBetween(state.lastWorkoutDate, today) <= maxGapDays(trainingDaysPerWeek);
  const current = alive ? state.current + 1 : 1;
  return { current, longest: Math.max(state.longest, current), lastWorkoutDate: today };
}

/** Streak, der in der UI angezeigt wird: bereits gerissene Streaks zeigen 0. */
export function displayStreak(state: StreakState, today: string, trainingDaysPerWeek: number): number {
  if (state.lastWorkoutDate === null) return 0;
  return daysBetween(state.lastWorkoutDate, today) <= maxGapDays(trainingDaysPerWeek) ? state.current : 0;
}
