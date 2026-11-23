import { getExercise } from '@/data/exercises';
import {
  ageFactor,
  estimate1RM,
  exerciseRank,
  genderFactor,
  overallScore,
  rankFromScore,
  rankName,
  scoreForValue,
} from '@/lib/ranking';

const male80 = { gender: 'male' as const, age: 25, bodyweightKg: 80 };

describe('estimate1RM (Epley)', () => {
  it('gibt bei 1 Wdh. das Gewicht zurück', () => expect(estimate1RM(100, 1)).toBe(100));
  it('berechnet 100 kg × 10 ≈ 133,3 kg', () => expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1));
  it('deckelt bei 12 Wdh.', () => expect(estimate1RM(100, 30)).toBeCloseTo(estimate1RM(100, 12)));
  it('liefert 0 bei ungültigen Werten', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(50, 0)).toBe(0);
  });
});

describe('rankFromScore', () => {
  it('0 Punkte = Eisen I', () => expect(rankName(rankFromScore(0))).toBe('Eisen I'));
  it('12,5 Punkte = Bronze I', () => expect(rankName(rankFromScore(12.5))).toBe('Bronze I'));
  it('100 Punkte = Titan III', () => expect(rankName(rankFromScore(100))).toBe('Titan III'));
  it('teilt jede Stufe in drei Divisionen', () => {
    expect(rankFromScore(12.5 + 4.3).division).toBe(2);
    expect(rankFromScore(12.5 + 8.5).division).toBe(3);
  });
  it('begrenzt Werte außerhalb von 0–100', () => {
    expect(rankFromScore(-5).score).toBe(0);
    expect(rankFromScore(500).tier).toBe(8);
  });
});

describe('scoreForValue', () => {
  const std = getExercise('bench')!.standards;
  it('ist monoton steigend', () => {
    let last = -1;
    for (let v = 0; v <= 3; v += 0.05) {
      const s = scoreForValue(v, std);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });
  it('trifft Stufenanfänge exakt', () => {
    expect(scoreForValue(0.5, std)).toBeCloseTo(12.5);
    expect(scoreForValue(1.0, std)).toBeCloseTo(37.5);
  });
  it('gibt 100 oberhalb des Maximums', () => expect(scoreForValue(5, std)).toBe(100));
});

describe('exerciseRank', () => {
  const bench = getExercise('bench')!;
  it('Bankdrücken 1× Körpergewicht (Mann) = Gold I', () => {
    expect(rankName(exerciseRank(bench, { weightKg: 80, reps: 1 }, male80))).toBe('Gold I');
  });
  it('Frauen werden mit niedrigeren Normen bewertet', () => {
    const woman = { ...male80, gender: 'female' as const };
    const m = exerciseRank(bench, { weightKg: 60, reps: 1 }, male80).score;
    const f = exerciseRank(bench, { weightKg: 60, reps: 1 }, woman).score;
    expect(f).toBeGreaterThan(m);
  });
  it('Klimmzüge zählen nach Wiederholungen', () => {
    const r = exerciseRank(getExercise('pullup')!, { weightKg: 0, reps: 8 }, male80);
    expect(rankName(r)).toBe('Gold I');
  });
  it('Plank zählt nach Sekunden', () => {
    const r = exerciseRank(getExercise('plank')!, { weightKg: 0, reps: 0, durationS: 75 }, male80);
    expect(rankName(r)).toBe('Gold I');
  });
});

describe('Faktoren', () => {
  it('Altersfaktor sinkt ab 35 und hat eine Untergrenze', () => {
    expect(ageFactor(30)).toBe(1);
    expect(ageFactor(55)).toBeCloseTo(0.84);
    expect(ageFactor(90)).toBe(0.6);
  });
  it('Geschlechtsfaktor „divers“ liegt dazwischen', () => {
    expect(genderFactor('other', 'weight_ratio')).toBeLessThan(1);
    expect(genderFactor('other', 'weight_ratio')).toBeGreaterThan(genderFactor('female', 'weight_ratio'));
  });
});

describe('overallScore', () => {
  it('ist null ohne Daten', () => expect(overallScore({})).toBeNull());
  it('mittelt die besten zwei Übungen pro Muskel, dann alle Muskeln', () => {
    // chest: bench 60, pushup 20 → 40 · back: row 30 → 30  ⇒ Ø 35
    expect(overallScore({ bench: 60, pushup: 20, row: 30 })).toBeCloseTo(35);
  });
});
