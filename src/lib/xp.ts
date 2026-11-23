export const XP_PER_SET = 10;
export const XP_PER_WORKOUT = 50;
export const XP_PER_PR = 100;
export const XP_PER_RANK_UP = 250;

/** Streak-Multiplikator: +5 % pro Streak-Tag, max. ×1,5 */
export const streakMultiplier = (streak: number): number => Math.min(1.5, 1 + Math.max(0, streak) * 0.05);

export interface XpInput {
  completedSets: number;
  prs: number;
  rankUps: number;
  streak: number;
}

export function workoutXp({ completedSets, prs, rankUps, streak }: XpInput): number {
  const base = completedSets * XP_PER_SET + XP_PER_WORKOUT + prs * XP_PER_PR + rankUps * XP_PER_RANK_UP;
  return Math.round(base * streakMultiplier(streak));
}

/** XP, die von Level n zu Level n+1 nötig sind: 100 × n^1.5 */
export const xpForLevel = (n: number): number => Math.round(100 * Math.pow(n, 1.5));

export interface LevelInfo {
  level: number;
  /** XP innerhalb des aktuellen Levels */
  current: number;
  /** XP, die für das nächste Level nötig sind */
  needed: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}
