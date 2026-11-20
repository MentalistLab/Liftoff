// XP und Level.

export const XP = {
  perSet: 10,
  perWorkout: 50,
  perPR: 100,
  perRankUp: 250,
  maxStreakMultiplier: 1.5,
};

/** Streak-Multiplikator: +5 % pro Streak-Tag, maximal ×1,5 (ab 10 Tagen). */
export function streakMultiplier(streak: number): number {
  return Math.min(XP.maxStreakMultiplier, 1 + Math.max(0, streak) * 0.05);
}

export interface WorkoutXpInput {
  completedSets: number;
  prs: number;
  rankUps: number;
  streak: number;
}

export interface WorkoutXp {
  base: number;
  multiplier: number;
  total: number;
  breakdown: { sets: number; workout: number; prs: number; rankUps: number };
}

export function workoutXp(i: WorkoutXpInput): WorkoutXp {
  const sets = Math.max(0, i.completedSets) * XP.perSet;
  const workout = i.completedSets > 0 ? XP.perWorkout : 0;
  const prs = Math.max(0, i.prs) * XP.perPR;
  const ups = Math.max(0, i.rankUps) * XP.perRankUp;
  const base = sets + workout + prs + ups;
  const multiplier = streakMultiplier(i.streak);
  return { base, multiplier, total: Math.round(base * multiplier), breakdown: { sets, workout, prs, rankUps: ups } };
}

/** XP, die man in Level n sammeln muss, um Level n + 1 zu erreichen: 100 × n^1,5. */
export function xpForLevel(n: number): number {
  return Math.round(100 * Math.pow(Math.max(1, n), 1.5));
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp));
  while (rest >= xpForLevel(level) && level < 999) {
    rest -= xpForLevel(level);
    level++;
  }
  const need = xpForLevel(level);
  return { level, xpIntoLevel: rest, xpForNext: need, progress: Math.round((rest / need) * 1000) / 1000 };
}

/** Gesamt-XP, die man für ein Level braucht (Summe aller vorherigen Level). */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let n = 1; n < level; n++) sum += xpForLevel(n);
  return sum;
}
