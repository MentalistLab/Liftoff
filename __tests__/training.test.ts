import { EMPTY_STREAK, localDateStr, nextTargets, plannedWeight, updateStreak } from '../lib/training.ts';

const set = (w: number | null, r: number) => ({ id: String(Math.random()), weightKg: w, reps: r, durationS: null, done: true });

describe('Training', () => {
  test('Datum lokal', () => expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05'));

  test('Startgewicht: gemerkte Progression vor Bestwert, Körpergewicht ohne Gewicht', () => {
    const t = { sets: 3, repsMin: 6, repsMax: 10 };
    expect(plannedWeight('bench_press', t, { bench_press: { weightKg: 72.5, repsMin: 6, repsMax: 10, noteDe: '', noteEn: '' } }, {})).toBe(72.5);
    expect(plannedWeight('bench_press', t, {}, { bench_press: { score: 50, oneRm: 100, reps: 5, durationS: null } })).toBe(67.5);
    expect(plannedWeight('push_up', t, {}, {})).toBeNull();
    expect(plannedWeight('bench_press', t, {}, {})).toBeNull();
  });

  test('Alle Sätze oben im Bereich → mehr Gewicht (Unterkörper +5)', () => {
    const r = nextTargets([
      { slug: 'bench_press', target: { sets: 2, repsMin: 6, repsMax: 10, weightKg: 60 }, sets: [set(60, 10), set(60, 10)] },
      { slug: 'back_squat', target: { sets: 2, repsMin: 5, repsMax: 8, weightKg: 80 }, sets: [set(80, 8), set(80, 8)] },
      { slug: 'push_up', sets: [set(null, 20)] },
    ]);
    expect(r.bench_press.weightKg).toBe(62.5);
    expect(r.back_squat.weightKg).toBe(85);
    expect(r.push_up).toBeUndefined();
  });

  test('Streak: Trainingstag zählt, verpasster geplanter Tag bricht', () => {
    const mon = new Date(2026, 10, 16, 18), wed = new Date(2026, 10, 18, 18), fri = new Date(2026, 10, 20, 18);
    let s = updateStreak(EMPTY_STREAK, [1, 3, 5], true, mon).state;
    s = updateStreak(s, [1, 3, 5], true, wed).state;
    expect(s.current).toBe(2);
    const r = updateStreak(s, [1, 3, 5], false, new Date(2026, 10, 23, 10)); // Fr verpasst
    expect(r.state.current).toBe(0);
    expect(r.events.some((e) => e.type === 'broken')).toBe(true);
    expect(updateStreak(s, [1, 3, 5], true, fri).state.current).toBe(3);
  });
});
