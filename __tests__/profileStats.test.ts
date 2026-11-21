import { computeStats, earnedBadgeIds, longestDayStreak, oneRmSeries, weeklyVolume, type HistoryWorkout } from '../lib/profileStats.ts';

const D = 86_400_000;
const base = new Date(2026, 10, 16, 18).getTime(); // Montag
const w = (dayOffset: number, weight: number, reps: number, vol: number): HistoryWorkout => ({
  startedAt: base + dayOffset * D - 3_600_000, endedAt: base + dayOffset * D,
  exercises: [{ slug: 'bench_press', sets: [{ id: 'a', weightKg: weight, reps, durationS: null, done: true }] }],
  summary: { durationS: 3600, completedSets: 1, volumeKg: vol, prs: [], rankUps: 0, exercises: [], xp: { base: 0, multiplier: 1, total: 60, breakdown: { sets: 10, workout: 50, prs: 0, rankUps: 0 } }, bests: {} },
});

describe('Profil-Statistik', () => {
  const h = [w(0, 80, 5, 400), w(1, 85, 5, 425), w(2, 90, 3, 270), w(5, 100, 1, 100)];

  test('Summen, Höchstgewicht, Streak', () => {
    const s = computeStats(h);
    expect(s.workouts).toBe(4);
    expect(s.totalVolumeKg).toBe(1195);
    expect(s.maxWeightKg).toBe(100);
    expect(s.longestStreak).toBe(3);
    expect(longestDayStreak([])).toBe(0);
  });

  test('Abzeichen: erstes Workout ja, 100-kg-Club je nach Definition', () => {
    const ids = earnedBadgeIds(computeStats(h));
    expect(ids.has('first_workout')).toBe(true);
    expect(ids.has('workouts_10')).toBe(false);
  });

  test('Wochenvolumen, letzte Woche zuletzt', () => {
    const v = weeklyVolume(h, 3, base + 6 * D);
    expect(v).toHaveLength(3);
    expect(v[2].volumeKg).toBe(1195);
    expect(v[0].volumeKg).toBe(0);
  });

  test('1RM-Verlauf chronologisch', () => {
    const s = oneRmSeries([...h].reverse(), 'bench_press');
    expect(s.map((x) => x.value)).toEqual([93.3, 99.2, 99, 100]);
  });
});
