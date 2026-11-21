import { computeOnboardingRanks, EXPERIENCE_SCORE } from '../lib/onboardingRanks.ts';

const base = { gender: 'male' as const, age: 28, bodyweightKg: 80, experience: 'intermediate' as const };

describe('Onboarding-Rang', () => {
  test('ohne Angaben: alles aus Erfahrung geschätzt', () => {
    const r = computeOnboardingRanks({ ...base, lifts: {} });
    expect(r.estimated).toHaveLength(5);
    expect(r.muscleScores.chest).toBeCloseTo(EXPERIENCE_SCORE.intermediate, 0);
    expect(r.percentile).toBeGreaterThan(0);
  });

  test('starkes Bankdrücken hebt die Brust nach vorne', () => {
    const r = computeOnboardingRanks({ ...base, lifts: { bench_press: { weightKg: 120, reps: 5 } } });
    expect(r.top[0]).toBe('chest');
    expect(r.muscleScores.chest!).toBeGreaterThan(60);
    expect(r.estimated).not.toContain('bench_press');
  });

  test('alle Muskelgruppen bekommen einen Wert', () => {
    const r = computeOnboardingRanks({ ...base, lifts: { pull_up: { reps: 10 }, push_up: { reps: 30 } } });
    expect(Object.keys(r.muscleScores).sort()).toEqual(['back', 'biceps', 'chest', 'core', 'glutes', 'legs', 'shoulders', 'triceps']);
    expect(r.top).toHaveLength(3);
  });

  test('Anfänger < Profi bei gleicher Unkenntnis', () => {
    const a = computeOnboardingRanks({ ...base, experience: 'beginner', lifts: {} });
    const b = computeOnboardingRanks({ ...base, experience: 'advanced', lifts: {} });
    expect(a.overall).toBeLessThan(b.overall);
  });
});
