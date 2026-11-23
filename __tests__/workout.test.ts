import { finishWorkout, Workout } from '@/lib/workout';

const athlete = { gender: 'male' as const, age: 25, bodyweightKg: 80 };
const streak = { current: 0, longest: 0, lastWorkoutDate: null };
const base = { athlete, trainingDays: 3, streak, startedAt: 0, endedAt: 1000 };

describe('finishWorkout', () => {
  it('erstes Workout: kein PR, kein Rang-Aufstieg, XP = Sätze + Bonus', () => {
    const r = finishWorkout({
      ...base, id: 'w1', today: '2026-01-05', history: [],
      sets: [{ exerciseId: 'bench', weightKg: 60, reps: 8 }, { exerciseId: 'bench', weightKg: 60, reps: 8 }],
    });
    expect(r.prs).toHaveLength(0);
    expect(r.rankUps).toHaveLength(0);
    expect(r.workout.xp).toBe(Math.round((2 * 10 + 50) * 1.05));
    expect(r.workout.volumeKg).toBe(960);
    expect(r.streak.current).toBe(1);
    expect(r.overallAfter).not.toBeNull();
  });

  it('ignoriert ungültige Sätze', () => {
    const r = finishWorkout({
      ...base, id: 'w', today: '2026-01-05', history: [],
      sets: [{ exerciseId: 'bench', weightKg: 0, reps: 8 }, { exerciseId: 'unknown', weightKg: 10, reps: 1 }],
    });
    expect(r.workout.sets).toHaveLength(0);
  });

  it('erkennt PR und Rang-Aufstieg', () => {
    const prev: Workout = {
      id: 'w0', date: '2026-01-01', startedAt: 0, endedAt: 1, volumeKg: 0, xp: 0,
      sets: [{ exerciseId: 'bench', weightKg: 60, reps: 1 }], // 0,75 → Silber I
    };
    const r = finishWorkout({
      ...base, id: 'w1', today: '2026-01-03', history: [prev],
      sets: [{ exerciseId: 'bench', weightKg: 90, reps: 1 }], // 1,125 → Gold
    });
    expect(r.prs).toHaveLength(1);
    expect(r.prs[0].exerciseId).toBe('bench');
    expect(r.rankUps.some((u) => u.kind === 'exercise')).toBe(true);
    expect(r.rankUps.some((u) => u.kind === 'muscle')).toBe(true);
    expect(r.rankUps.some((u) => u.kind === 'overall')).toBe(true);
    // 1 Satz + 50 + 1 PR + 2 bezahlte Aufstiege (Muskel + Gesamt), Streak 1 → ×1,05
    expect(r.workout.xp).toBe(Math.round((10 + 50 + 100 + 500) * 1.05));
  });

  it('kein PR bei schlechterer Leistung', () => {
    const prev: Workout = {
      id: 'w0', date: '2026-01-01', startedAt: 0, endedAt: 1, volumeKg: 0, xp: 0,
      sets: [{ exerciseId: 'squat', weightKg: 100, reps: 5 }],
    };
    const r = finishWorkout({
      ...base, id: 'w1', today: '2026-01-03', history: [prev],
      sets: [{ exerciseId: 'squat', weightKg: 80, reps: 5 }],
    });
    expect(r.prs).toHaveLength(0);
    expect(r.rankUps).toHaveLength(0);
  });
});
