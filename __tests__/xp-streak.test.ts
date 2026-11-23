import { maxGapDays, registerWorkout, displayStreak, daysBetween } from '@/lib/streak';
import { levelFromXp, streakMultiplier, workoutXp, xpForLevel } from '@/lib/xp';

describe('XP', () => {
  it('berechnet Workout-XP ohne Streak', () => {
    expect(workoutXp({ completedSets: 10, prs: 1, rankUps: 1, streak: 0 })).toBe(10 * 10 + 50 + 100 + 250);
  });
  it('Streak-Multiplikator ist auf ×1,5 begrenzt', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(4)).toBeCloseTo(1.2);
    expect(streakMultiplier(100)).toBe(1.5);
  });
  it('Level-Kurve 100 × n^1,5', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(4)).toBe(800);
  });
  it('levelFromXp', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: 100 });
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100 + 283 + 10)).toMatchObject({ level: 3, current: 10 });
  });
});

describe('Streak', () => {
  const start = { current: 0, longest: 0, lastWorkoutDate: null };
  it('startet bei 1', () => expect(registerWorkout(start, '2026-01-05', 3).current).toBe(1));
  it('Ruhetage brechen den Streak nicht', () => {
    let s = registerWorkout(start, '2026-01-05', 3);
    s = registerWorkout(s, '2026-01-08', 3); // 3 Tage Abstand bei 3×/Woche
    expect(s.current).toBe(2);
  });
  it('zu langer Abstand setzt zurück, longest bleibt', () => {
    let s = registerWorkout(start, '2026-01-05', 3);
    s = registerWorkout(s, '2026-01-06', 3);
    s = registerWorkout(s, '2026-01-20', 3);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
  it('zweites Workout am selben Tag zählt nicht doppelt', () => {
    const s = registerWorkout(start, '2026-01-05', 3);
    expect(registerWorkout(s, '2026-01-05', 3)).toBe(s);
  });
  it('maxGapDays', () => {
    expect(maxGapDays(3)).toBe(3);
    expect(maxGapDays(5)).toBe(2);
    expect(maxGapDays(2)).toBe(4);
  });
  it('displayStreak zeigt 0 für gerissene Streaks', () => {
    const s = registerWorkout(start, '2026-01-05', 3);
    expect(displayStreak(s, '2026-01-07', 3)).toBe(1);
    expect(displayStreak(s, '2026-01-20', 3)).toBe(0);
  });
  it('daysBetween über Monatsgrenzen', () => expect(daysBetween('2026-01-30', '2026-02-02')).toBe(3));
});
