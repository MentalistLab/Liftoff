import { formatDuration, summarize, type WorkoutExercise } from '../lib/workoutSummary.ts';

const ctx = { gender: 'male' as const, bodyweightKg: 80, age: 30 };
const set = (weightKg: number | null, reps: number, done = true) => ({ id: Math.random().toString(), weightKg, reps, durationS: null, done });

describe('Workout-Zusammenfassung', () => {
  const ex: WorkoutExercise[] = [
    { slug: 'bench_press', sets: [set(80, 5), set(80, 5), set(90, 3, false)] },
    { slug: 'push_up', sets: [set(null, 25)] },
  ];

  test('zählt nur abgehakte Sätze, Volumen nur mit Gewicht', () => {
    const s = summarize(ex, 0, 3_600_000, {}, ctx);
    expect(s.completedSets).toBe(3);
    expect(s.volumeKg).toBe(800);
    expect(s.durationS).toBe(3600);
    expect(s.xp.total).toBe(3 * 10 + 50);
  });

  test('erster Eintrag ist Bestwert, aber kein PR', () => {
    const s = summarize(ex, 0, 1, {}, ctx);
    expect(s.prs).toEqual([]);
    expect(Object.keys(s.bests).sort()).toEqual(['bench_press', 'push_up']);
  });

  test('besser als vorher → PR, XP und ggf. Rang-Aufstieg', () => {
    const first = summarize(ex, 0, 1, {}, ctx);
    const stronger: WorkoutExercise[] = [{ slug: 'bench_press', sets: [set(110, 5)] }];
    const s = summarize(stronger, 0, 1, first.bests, ctx);
    expect(s.prs).toEqual(['bench_press']);
    expect(s.exercises[0].stepAfter!).toBeGreaterThan(s.exercises[0].stepBefore!);
    expect(s.rankUps).toBeGreaterThan(0);
    expect(s.xp.breakdown.prs).toBe(100);
  });

  test('schwächer als Bestwert → kein PR, Rang bleibt', () => {
    const first = summarize(ex, 0, 1, {}, ctx);
    const s = summarize([{ slug: 'bench_press', sets: [set(60, 5)] }], 0, 1, first.bests, ctx);
    expect(s.prs).toEqual([]);
    expect(s.exercises[0].stepAfter).toBe(s.exercises[0].stepBefore);
  });

  test('Dauer formatieren', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
