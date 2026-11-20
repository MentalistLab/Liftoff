import {
  ageFactor, bestScore, epley1RM, fallbackPercentile, muscleScore, overallScore, performanceValue,
  rankLabel, rankUps, scoreForStep, scoreSet, scoreToRank, thresholdsFor, valueToScore, weightClass,
} from '../lib/ranking.ts';
import { CORE_EXERCISES, exerciseBySlug } from '../lib/standards.ts';

const bench = exerciseBySlug('bench_press')!;
const pullUp = exerciseBySlug('pull_up')!;
const plank = exerciseBySlug('plank')!;
const male80 = { gender: 'male' as const, bodyweightKg: 80, age: 28 };

describe('epley1RM', () => {
  it('rechnet nach Epley', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 2);
    expect(epley1RM(80, 10)).toBeCloseTo(106.667, 2);
  });
  it('1 Wiederholung = Gewicht', () => expect(epley1RM(140, 1)).toBe(140));
  it('deckelt bei 12 Wiederholungen', () => expect(epley1RM(50, 20)).toBeCloseTo(epley1RM(50, 12)!, 6));
  it('liefert null bei ungültigen Werten', () => {
    expect(epley1RM(0, 5)).toBeNull();
    expect(epley1RM(100, 0)).toBeNull();
    expect(epley1RM(null, 5)).toBeNull();
  });
});

describe('ageFactor', () => {
  it('ist 1 zwischen 23 und 39', () => {
    expect(ageFactor(23)).toBe(1);
    expect(ageFactor(39)).toBe(1);
  });
  it('gibt Jugendlichen und Masters einen Bonus', () => {
    expect(ageFactor(16)).toBeGreaterThan(1);
    expect(ageFactor(50)).toBeGreaterThan(1);
    expect(ageFactor(60)).toBeGreaterThan(ageFactor(50));
  });
  it('ist nach oben begrenzt', () => expect(ageFactor(95)).toBeLessThanOrEqual(1.6));
  it('ohne Alter = 1', () => expect(ageFactor(null)).toBe(1));
});

describe('valueToScore', () => {
  const t = [0.5, 0.75, 1.0, 1.5, 2.0];
  it('trifft die Schwellen exakt', () => {
    expect(valueToScore(0.5, t)).toBe(15);
    expect(valueToScore(1.0, t)).toBe(55);
    expect(valueToScore(2.0, t)).toBe(95);
  });
  it('interpoliert linear', () => expect(valueToScore(1.25, t)).toBeCloseTo(66.5, 1));
  it('flacht über Elite ab und bleibt ≤ 100', () => {
    expect(valueToScore(2.5, t)).toBeGreaterThan(95);
    expect(valueToScore(10, t)).toBeLessThanOrEqual(100);
  });
  it('0 oder negativ = 0', () => {
    expect(valueToScore(0, t)).toBe(0);
    expect(valueToScore(-1, t)).toBe(0);
  });
  it('kommt mit Schwelle 0 klar (z. B. Klimmzüge Frauen)', () => {
    expect(valueToScore(0.5, [0, 1, 5, 12, 20])).toBeCloseTo(25, 1);
  });
  it('ist monoton steigend', () => {
    let last = -1;
    for (let v = 0; v <= 3; v += 0.05) {
      const s = valueToScore(v, t);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });
});

describe('Satz-Scores', () => {
  it('Bankdrücken 80 kg × 5 bei 80 kg Körpergewicht ≈ Fortgeschritten+', () => {
    const s = scoreSet(bench, { weightKg: 80, reps: 5 }, male80)!;
    expect(s).toBeGreaterThan(55);
    expect(s).toBeLessThan(78);
  });
  it('Frauen-Normen sind niedriger, gleiche Leistung = höherer Score', () => {
    const m = scoreSet(bench, { weightKg: 50, reps: 5 }, { gender: 'male', bodyweightKg: 60 })!;
    const f = scoreSet(bench, { weightKg: 50, reps: 5 }, { gender: 'female', bodyweightKg: 60 })!;
    expect(f).toBeGreaterThan(m);
  });
  it('„keine Angabe“ liegt zwischen beiden', () => {
    const ctx = { bodyweightKg: 70 };
    const m = scoreSet(bench, { weightKg: 60, reps: 5 }, { ...ctx, gender: 'male' })!;
    const f = scoreSet(bench, { weightKg: 60, reps: 5 }, { ...ctx, gender: 'female' })!;
    const n = scoreSet(bench, { weightKg: 60, reps: 5 }, { ...ctx, gender: 'none' })!;
    expect(n).toBeGreaterThan(m);
    expect(n).toBeLessThan(f);
    expect(thresholdsFor(bench.standards, 'none')[0]).toBeCloseTo(0.375, 3);
  });
  it('Klimmzüge: Zusatzgewicht zählt als mehr Wiederholungen', () => {
    const plain = performanceValue(pullUp, { reps: 8 }, male80)!;
    const weighted = performanceValue(pullUp, { reps: 8, weightKg: 20 }, male80)!;
    expect(plain).toBe(8);
    expect(weighted).toBeGreaterThan(plain);
  });
  it('Plank wird nach Zeit bewertet', () => {
    expect(scoreSet(plank, { durationS: 90 }, male80)).toBe(55);
  });
  it('nicht bewertbare Sätze ergeben null', () => {
    expect(scoreSet(bench, { reps: 5 }, male80)).toBeNull();
    expect(scoreSet(pullUp, { reps: 0 }, male80)).toBeNull();
  });
  it('bestScore nimmt den besten Satz', () => {
    const best = bestScore(bench, [{ weightKg: 60, reps: 10 }, { weightKg: 90, reps: 3 }, { weightKg: 20 }], male80)!;
    expect(best).toBe(scoreSet(bench, { weightKg: 90, reps: 3 }, male80));
  });
  it('alle Kernübungen haben 5 aufsteigende Schwellen', () => {
    for (const ex of CORE_EXERCISES) {
      for (const g of ['male', 'female'] as const) {
        const t = ex.standards[g];
        expect(t).toHaveLength(5);
        for (let i = 1; i < 5; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
      }
    }
  });
});

describe('scoreToRank', () => {
  it('0 = Eisen I, 100 = Titan III', () => {
    expect(scoreToRank(0)).toMatchObject({ tier: 1, division: 1, step: 0 });
    expect(scoreToRank(100)).toMatchObject({ tier: 8, division: 3, step: 23, progress: 1 });
  });
  it('24 gleich große Stufen', () => {
    expect(scoreToRank(scoreForStep(3))).toMatchObject({ tier: 2, division: 1 });
    expect(scoreToRank(scoreForStep(11))).toMatchObject({ tier: 4, division: 3 });
    expect(scoreToRank(50)).toMatchObject({ tier: 5, division: 1, step: 12 });
  });
  it('Label', () => {
    expect(rankLabel({ tier: 4, division: 2 })).toBe('Gold II');
    expect(rankLabel({ tier: 6, division: 1 }, 'en')).toBe('Diamond I');
  });
  it('zählt Rang-Aufstiege, erster Rang zählt nicht', () => {
    expect(rankUps(null, 60)).toBe(0);
    expect(rankUps(40, 40)).toBe(0);
    expect(rankUps(40, 55)).toBe(scoreToRank(55).step - scoreToRank(40).step);
    expect(rankUps(60, 40)).toBe(0);
  });
});

describe('Muskel- und Gesamtrang', () => {
  it('Muskelrang gewichtet die besten 3 Übungen 50/30/20', () => {
    expect(muscleScore([{ score: 80, role: 'primary' }, { score: 60, role: 'primary' }, { score: 40, role: 'primary' }, { score: 10, role: 'primary' }])).toBe(66);
  });
  it('sekundäre Übungen zählen mit 85 %', () => {
    expect(muscleScore([{ score: 60, role: 'secondary' }])).toBe(51);
  });
  it('ohne Daten = null', () => expect(muscleScore([])).toBeNull());
  it('Gesamtrang bestraft fehlende Muskelgruppen', () => {
    const full = overallScore({ chest: 60, back: 60, shoulders: 60, biceps: 60, triceps: 60, legs: 60, glutes: 60, core: 60 })!;
    const partial = overallScore({ chest: 60 })!;
    expect(full).toBe(60);
    expect(partial).toBeLessThan(full);
    expect(partial).toBeGreaterThanOrEqual(60 * 0.7);
  });
  it('ohne Daten = null', () => expect(overallScore({})).toBeNull());
});

describe('Perzentil und Gewichtsklassen', () => {
  it('Perzentil steigt mit dem Score und bleibt in 1–99', () => {
    expect(fallbackPercentile(0)).toBeGreaterThanOrEqual(1);
    expect(fallbackPercentile(100)).toBeLessThanOrEqual(99);
    expect(fallbackPercentile(45)).toBe(50);
    expect(fallbackPercentile(70)).toBeGreaterThan(fallbackPercentile(50));
  });
  it('Gewichtsklassen', () => {
    expect(weightClass('male', 80)).toBe('74–83 kg');
    expect(weightClass('male', 50)).toBe('≤59 kg');
    expect(weightClass('female', 100)).toBe('84+ kg');
  });
});
