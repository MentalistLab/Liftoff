import { roundTo, startingWeight, suggestNext } from '../lib/progression.ts';

const t = { sets: 3, repsMin: 6, repsMax: 8, weightKg: 80, lowerBody: false };

describe('Progressive Overload', () => {
  it('alle Sätze oben → +2,5 kg (Oberkörper)', () => {
    const s = suggestNext(t, [{ weightKg: 80, reps: 8 }, { weightKg: 80, reps: 8 }, { weightKg: 80, reps: 9 }]);
    expect(s).toMatchObject({ action: 'increase_weight', weightKg: 82.5 });
  });
  it('Unterkörper → +5 kg', () => {
    const s = suggestNext({ ...t, lowerBody: true, weightKg: 100 }, [{ weightKg: 100, reps: 8 }, { weightKg: 100, reps: 8 }, { weightKg: 100, reps: 8 }]);
    expect(s.weightKg).toBe(105);
  });
  it('am Limit (RPE 10) → halten', () => {
    const s = suggestNext(t, [{ weightKg: 80, reps: 8, rpe: 10 }, { weightKg: 80, reps: 8, rpe: 10 }, { weightKg: 80, reps: 8, rpe: 9.5 }]);
    expect(s.action).toBe('hold');
  });
  it('zu wenige Sätze → halten', () => {
    expect(suggestNext(t, [{ weightKg: 80, reps: 8 }, { weightKg: 80, reps: 8 }]).action).toBe('hold');
  });
  it('Hälfte unter dem Bereich → 5 % Deload', () => {
    const s = suggestNext(t, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 4 }, { weightKg: 80, reps: 6 }]);
    expect(s).toMatchObject({ action: 'deload', weightKg: 75 });
  });
  it('Körpergewichtsübung → mehr Wiederholungen', () => {
    const s = suggestNext({ ...t, weightKg: null }, [{ weightKg: null, reps: 8 }, { weightKg: null, reps: 8 }, { weightKg: null, reps: 8 }]);
    expect(s).toMatchObject({ action: 'increase_reps', repsMin: 7, repsMax: 9 });
  });
  it('keine Daten → halten', () => expect(suggestNext(t, []).action).toBe('hold'));
  it('Startgewicht aus 1RM', () => {
    expect(roundTo(81.3)).toBe(82.5);
    expect(startingWeight(100, 8)).toBe(70);
  });
});
