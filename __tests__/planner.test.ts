import { generatePlan, splitFor, weakestMuscles, prescribe, type PlannerExercise } from '../lib/planner.ts';
import { CORE_EXERCISES } from '../lib/standards.ts';

const all: PlannerExercise[] = CORE_EXERCISES.map((e) => ({
  slug: e.slug, primaryMuscle: e.primaryMuscle, secondaryMuscles: e.secondaryMuscles, equipment: e.equipment, rankingType: e.rankingType,
}));
const bodyweight = all.filter((e) => e.equipment === 'bodyweight');
const slugs = new Set(all.map((e) => e.slug));

function valid(plan: ReturnType<typeof generatePlan>, days: number[]) {
  expect(plan.days.map((d) => d.weekday)).toEqual(days);
  expect(plan.title.length).toBeLessThanOrEqual(60);
  expect(plan.summary.length).toBeLessThanOrEqual(500);
  for (const d of plan.days) {
    expect(d.title.length).toBeLessThanOrEqual(40);
    expect(d.exercises.length).toBeGreaterThanOrEqual(3);
    expect(d.exercises.length).toBeLessThanOrEqual(9);
    expect(new Set(d.exercises.map((e) => e.slug)).size).toBe(d.exercises.length);
    for (const e of d.exercises) {
      expect(slugs.has(e.slug)).toBe(true);
      expect(e.sets).toBeGreaterThanOrEqual(1);
      expect(e.sets).toBeLessThanOrEqual(8);
      expect(e.restS).toBeGreaterThanOrEqual(30);
      expect(e.restS).toBeLessThanOrEqual(300);
      if (e.durationS == null) expect(e.repsMin! <= e.repsMax!).toBe(true);
    }
  }
}

describe('Plan-Generator (ohne KI)', () => {
  it('Split je nach Tagen und Erfahrung', () => {
    expect(splitFor(3, 'beginner').kinds).toEqual(['full', 'full', 'full']);
    expect(splitFor(3, 'advanced').kinds).toEqual(['push', 'pull', 'legs']);
    expect(splitFor(4, 'intermediate').kinds).toEqual(['upper', 'lower', 'upper', 'lower']);
    expect(splitFor(7, 'advanced').kinds).toHaveLength(7);
  });

  it('gültiger Plan für 1 bis 7 Tage, jede Erfahrung', () => {
    for (const exp of ['beginner', 'intermediate', 'advanced'] as const) {
      for (let n = 1; n <= 7; n++) {
        const days = [1, 2, 3, 4, 5, 6, 7].slice(0, n);
        valid(generatePlan({ goal: 'muscle', experience: exp, days, exercises: all }), days);
      }
    }
  });

  it('Wochentage werden sortiert und Duplikate entfernt', () => {
    const plan = generatePlan({ goal: 'fitness', experience: 'beginner', days: [5, 1, 3, 3], exercises: all });
    expect(plan.days.map((d) => d.weekday)).toEqual([1, 3, 5]);
  });

  it('Grundübungen zuerst, Unterarmstütz am Ende', () => {
    const plan = generatePlan({ goal: 'strength', experience: 'intermediate', days: [1, 3, 5], exercises: all });
    const push = plan.days[0];
    expect(push.title).toMatch(/Push/);
    expect(push.exercises[0].slug).toBe('bench_press');
    const legs = plan.days[2];
    if (legs.exercises.some((e) => e.slug === 'plank')) expect(legs.exercises.at(-1)!.slug).toBe('plank');
  });

  it('Ganzkörper A/B wechseln Übungen ab', () => {
    const plan = generatePlan({ goal: 'muscle', experience: 'beginner', days: [2, 5], exercises: all });
    expect(plan.days.map((d) => d.title)).toEqual(['Ganzkörper A', 'Ganzkörper B']);
    const a = plan.days[0].exercises.map((e) => e.slug);
    const b = plan.days[1].exercises.map((e) => e.slug);
    expect(a).not.toEqual(b);
  });

  it('Wiederholungsbereiche passend zum Ziel', () => {
    const bench = all.find((e) => e.slug === 'bench_press')!;
    expect(prescribe(bench, 'strength', 'advanced', false, true)).toMatchObject({ repsMin: 3, repsMax: 6, sets: 5, restS: 180 });
    expect(prescribe(bench, 'muscle', 'intermediate', false, false)).toMatchObject({ repsMin: 6, repsMax: 10, sets: 3 });
    expect(prescribe(bench, 'fat_loss', 'beginner', false, false)).toMatchObject({ repsMin: 10, repsMax: 15, restS: 90 });
    const plank = all.find((e) => e.slug === 'plank')!;
    expect(prescribe(plank, 'muscle', 'advanced', false, false)).toMatchObject({ durationS: 60 });
  });

  it('schwächste Muskeln bekommen mehr Volumen', () => {
    const scores = { chest: 60, back: 55, shoulders: 50, biceps: 20, triceps: 45, legs: 58, glutes: 52, core: 30 };
    expect(weakestMuscles(scores)).toEqual(['biceps', 'core']);
    const plan = generatePlan({ goal: 'muscle', experience: 'intermediate', days: [1, 3, 5], exercises: all, muscleScores: scores });
    expect(plan.summary).toMatch(/Bizeps/);
    const curl = plan.days.flatMap((d) => d.exercises).find((e) => e.slug === 'barbell_curl')!;
    expect(curl.sets).toBe(4);
    expect(curl.notes).toMatch(/Schwachstelle/);
  });

  it('ohne Ränge kein Extra-Volumen', () => {
    expect(weakestMuscles({})).toEqual([]);
    expect(weakestMuscles({ chest: 10 })).toEqual([]);
  });

  it('nur Körpergewicht: trotzdem mindestens 3 Übungen pro Tag', () => {
    const days = [1, 2, 4, 5];
    const plan = generatePlan({ goal: 'fitness', experience: 'beginner', days, exercises: bodyweight });
    for (const d of plan.days) {
      expect(d.exercises.length).toBeGreaterThanOrEqual(3);
      for (const e of d.exercises) expect(bodyweight.some((b) => b.slug === e.slug)).toBe(true);
    }
  });

  it('deterministisch: gleiche Eingabe → gleicher Plan', () => {
    const input = { goal: 'muscle' as const, experience: 'advanced' as const, days: [1, 2, 4, 5, 6], exercises: all };
    expect(generatePlan(input)).toEqual(generatePlan(input));
  });
});
