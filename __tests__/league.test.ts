import { closeGroup, formGroups, isWeekCloseTime, secondsUntilWeekClose, weekStart, zoneSizes } from '../lib/league.ts';

const members = (n: number, xpOf = (i: number) => (n - i) * 100) =>
  Array.from({ length: n }, (_, i) => ({ userId: `u${String(i).padStart(2, '0')}`, weeklyXp: xpOf(i) }));

describe('Liga-Auswertung', () => {
  it('Top 7 auf, letzte 5 ab bei 30 Spielern', () => {
    const r = closeGroup(members(30), 5);
    expect(r.filter((x) => x.result === 'promoted')).toHaveLength(7);
    expect(r.filter((x) => x.result === 'demoted')).toHaveLength(5);
    expect(r[0]).toMatchObject({ position: 1, result: 'promoted', newTier: 6 });
    expect(r[29]).toMatchObject({ position: 30, result: 'demoted', newTier: 4 });
  });
  it('kein Abstieg aus Stufe 1, kein Aufstieg über Stufe 10', () => {
    expect(closeGroup(members(30), 1).some((x) => x.result === 'demoted')).toBe(false);
    expect(closeGroup(members(30), 10).some((x) => x.result === 'promoted')).toBe(false);
  });
  it('mit 0 XP steigt niemand auf', () => {
    const r = closeGroup(members(30, () => 0), 3);
    expect(r.some((x) => x.result === 'promoted')).toBe(false);
  });
  it('kleine Gruppen haben kleinere Zonen', () => {
    expect(zoneSizes(12, 4)).toEqual({ promote: 3, demote: 2 });
    expect(zoneSizes(1, 4)).toEqual({ promote: 0, demote: 0 });
  });
  it('Gleichstand wird deterministisch aufgelöst', () => {
    const r = closeGroup([{ userId: 'b', weeklyXp: 10 }, { userId: 'a', weeklyXp: 10 }], 3);
    expect(r.map((x) => x.userId)).toEqual(['a', 'b']);
  });
});

describe('Gruppenbildung', () => {
  it('höchstens 30 pro Gruppe, gleichmäßig verteilt, nach Stärke sortiert', () => {
    const users = Array.from({ length: 65 }, (_, i) => ({ userId: `u${i}`, tier: 2, score: i }));
    const g = formGroups(users);
    expect(g).toHaveLength(3);
    expect(g.map((x) => x.userIds.length).sort()).toEqual([21, 22, 22]);
    expect(g[0].userIds[0]).toBe('u64');
  });
  it('trennt nach Stufen', () => {
    const g = formGroups([{ userId: 'a', tier: 1, score: 1 }, { userId: 'b', tier: 3, score: 1 }]);
    expect(g.map((x) => x.tier)).toEqual([1, 3]);
  });
});

describe('Ligawoche (Europe/Berlin)', () => {
  it('Wochenstart ist Montag', () => {
    expect(weekStart(new Date('2026-11-20T21:00:00Z'))).toBe('2026-11-16');
    // Sonntag 23:30 Berlin (Winterzeit = UTC+1) gehört noch zur alten Woche
    expect(weekStart(new Date('2026-11-22T22:30:00Z'))).toBe('2026-11-16');
    // Montag 00:30 Berlin
    expect(weekStart(new Date('2026-11-22T23:30:00Z'))).toBe('2026-11-23');
  });
  it('Abschluss Sonntag 23:59 – Winter- und Sommerzeit', () => {
    expect(isWeekCloseTime(new Date('2026-11-22T22:59:00Z'))).toBe(true);
    expect(isWeekCloseTime(new Date('2026-11-22T21:59:00Z'))).toBe(false);
    expect(isWeekCloseTime(new Date('2026-07-19T21:59:00Z'))).toBe(true);
    expect(isWeekCloseTime(new Date('2026-07-19T20:59:00Z'))).toBe(false);
  });
  it('Countdown', () => {
    expect(secondsUntilWeekClose(new Date('2026-11-22T22:58:00Z'))).toBe(60);
    expect(secondsUntilWeekClose(new Date('2026-11-21T22:59:00Z'))).toBe(86400);
  });
});
