import { mergeHistory, type ServerWorkoutRow } from '../lib/history.ts';

const ctx = { gender: 'male' as const, bodyweightKg: 80, age: 30 };
const row = (id: string, client: string | null, day: number, kg: number): ServerWorkoutRow => ({
  id, client_id: client, started_at: new Date(2026, 10, day, 17).toISOString(), ended_at: new Date(2026, 10, day, 18).toISOString(), notes: null,
  workout_sets: [{ id: id + 's', set_index: 0, weight_kg: kg, reps: 5, duration_s: null, completed: true, exercises: { slug: 'bench_press' } }],
});

describe('Historie über Geräte', () => {
  test('Server-Workouts kommen dazu, lokale bleiben, keine Duplikate', () => {
    const first = mergeHistory([row('a', 'c1', 10, 80)], [], ctx, 'Workout');
    const local = first.history.map((h) => ({ ...h, synced: false }));
    const r = mergeHistory([row('a', 'c1', 10, 80), row('b', null, 12, 90)], local, ctx, 'Workout');
    expect(r.history.map((h) => h.id)).toEqual(['b', 'c1']);
    expect(r.history.every((h) => h.synced)).toBe(true);
  });
  test('Bestwerte und PR chronologisch neu berechnet', () => {
    const r = mergeHistory([row('b', null, 12, 90), row('a', null, 10, 80)], [], ctx, 'Workout');
    expect(r.history[0].summary.prs).toEqual(['bench_press']);
    expect(r.bests.bench_press.oneRm).toBeCloseTo(105, 0);
    expect(r.lastSets.bench_press[0].weightKg).toBe(90);
  });
});
