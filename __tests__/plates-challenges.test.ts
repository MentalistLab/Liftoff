import { platesFor } from '../lib/plates.ts';
import { weeklyChallenges } from '../lib/challenges.ts';

describe('Scheiben-Rechner', () => {
  test('100 kg = 20 + 20 pro Seite', () => expect(platesFor(100)).toEqual({ perSide: [25, 15], total: 100, remainder: 0 }));
  test('82,5 kg', () => expect(platesFor(82.5).perSide).toEqual([25, 5, 1.25]));
  test('nicht aufgehend → Rest', () => expect(platesFor(61).remainder).toBe(1));
  test('leichter als Stange', () => expect(platesFor(15)).toMatchObject({ perSide: [], total: 20 }));
});

describe('Wochen-Challenges', () => {
  const now = new Date(2026, 10, 20, 12); // Freitag
  const w = (day: number, sets: number, vol: number, prs = 0) => ({
    startedAt: new Date(2026, 10, day, 17).getTime(), endedAt: new Date(2026, 10, day, 18).getTime(), exercises: [],
    summary: { durationS: 3600, completedSets: sets, volumeKg: vol, prs: Array(prs).fill('x'), rankUps: 0, exercises: [], xp: { base: 0, multiplier: 1, total: 0, breakdown: { sets: 0, workout: 0, prs: 0, rankUps: 0 } }, bests: {} },
  });
  test('Fortschritt dieser Woche, Vorwochen zählen nicht', () => {
    const c = weeklyChallenges([w(17, 20, 3000, 1), w(19, 22, 3500), w(10, 30, 9000)], 3, now);
    const by = Object.fromEntries(c.map((x) => [x.id, x]));
    expect(by.plan).toMatchObject({ value: 2, target: 3, done: false });
    expect(by.sets).toMatchObject({ value: 42, done: true });
    expect(by.pr.done).toBe(true);
    expect(by.volume.target).toBeGreaterThanOrEqual(2000);
  });
});
