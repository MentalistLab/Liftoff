import { formatCountdown, stepToRank, zoneFor } from '../lib/leagueView.ts';

describe('Liga-Ansicht', () => {
  test('30er-Gruppe: Top 7 auf, letzte 5 ab', () => {
    expect(zoneFor(1, 30, 3)).toBe('promote');
    expect(zoneFor(7, 30, 3)).toBe('promote');
    expect(zoneFor(8, 30, 3)).toBe('stay');
    expect(zoneFor(25, 30, 3)).toBe('stay');
    expect(zoneFor(26, 30, 3)).toBe('demote');
  });
  test('unterste Liga: kein Abstieg, oberste: kein Aufstieg', () => {
    expect(zoneFor(30, 30, 1)).toBe('stay');
    expect(zoneFor(1, 30, 10)).toBe('stay');
  });
  test('0 XP steigt nicht auf', () => {
    expect(zoneFor(1, 30, 3, 0)).toBe('stay');
  });
  test('Countdown', () => {
    expect(formatCountdown(2 * 86400 + 5 * 3600 + 60)).toBe('2 T 5 Std');
    expect(formatCountdown(3 * 3600 + 12 * 60, 'en')).toBe('3 h 12 m');
    expect(formatCountdown(59)).toBe('0 Min');
  });
  test('Rangstufe → Stufe/Division', () => {
    expect(stepToRank(0)).toEqual({ tier: 1, division: 1 });
    expect(stepToRank(23)).toEqual({ tier: 8, division: 3 });
    expect(stepToRank(null)).toBeNull();
  });
});
