import { levelFromXp, streakMultiplier, totalXpForLevel, workoutXp, xpForLevel } from '../lib/xp.ts';
import { addDays, EMPTY_STREAK, isoWeekday, syncStreak, type StreakState } from '../lib/streak.ts';
import { BADGES, newlyEarnedBadges, type BadgeStats } from '../lib/badges.ts';

describe('XP', () => {
  it('Satz 10, Workout 50, PR 100, Rang-Aufstieg 250', () => {
    const x = workoutXp({ completedSets: 12, prs: 2, rankUps: 1, streak: 0 });
    expect(x.base).toBe(120 + 50 + 200 + 250);
    expect(x.total).toBe(x.base);
  });
  it('ohne Sätze kein Workout-Bonus', () => expect(workoutXp({ completedSets: 0, prs: 0, rankUps: 0, streak: 5 }).total).toBe(0));
  it('Streak-Multiplikator bis ×1,5', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(4)).toBeCloseTo(1.2, 5);
    expect(streakMultiplier(10)).toBe(1.5);
    expect(streakMultiplier(200)).toBe(1.5);
    expect(workoutXp({ completedSets: 10, prs: 0, rankUps: 0, streak: 10 }).total).toBe(225);
  });
});

describe('Level', () => {
  it('xpForLevel = 100 × n^1,5', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(4)).toBe(800);
    expect(xpForLevel(14)).toBe(5238);
  });
  it('Level aus Gesamt-XP', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: 100 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toMatchObject({ level: 2, xpIntoLevel: 0 });
    const l = levelFromXp(totalXpForLevel(14) + 3420);
    expect(l).toMatchObject({ level: 14, xpIntoLevel: 3420, xpForNext: 5238 });
  });
});

describe('Streak', () => {
  // 2026-11-16 ist ein Montag. Geplant: Mo, Mi, Fr.
  const plan = [1, 3, 5];
  const mon = '2026-11-16';
  it('Hilfsfunktionen für Daten', () => {
    expect(isoWeekday(mon)).toBe(1);
    expect(isoWeekday('2026-11-22')).toBe(7);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('zählt Trainingstage, Ruhetage brechen nichts', () => {
    let s: StreakState = EMPTY_STREAK;
    s = syncStreak(s, mon, plan, true).state; // Mo
    s = syncStreak(s, addDays(mon, 2), plan, true).state; // Mi (Di Ruhetag)
    s = syncStreak(s, addDays(mon, 4), plan, true).state; // Fr
    expect(s.current).toBe(3);
    // Sa + So Ruhetage, nächster Mo trainiert
    s = syncStreak(s, addDays(mon, 7), plan, true).state;
    expect(s.current).toBe(4);
  });
  it('zählt pro Tag nur einmal', () => {
    let s = syncStreak(EMPTY_STREAK, mon, plan, true).state;
    s = syncStreak(s, mon, plan, true).state;
    expect(s.current).toBe(1);
  });
  it('Training am Ruhetag zählt mit', () => {
    let s = syncStreak(EMPTY_STREAK, mon, plan, true).state;
    s = syncStreak(s, addDays(mon, 1), plan, true).state; // Di
    expect(s.current).toBe(2);
  });
  it('verpasster geplanter Tag bricht den Streak', () => {
    let s = syncStreak(EMPTY_STREAK, mon, plan, true).state;
    const r = syncStreak(s, addDays(mon, 3), plan, false); // Do: Mi wurde verpasst
    expect(r.state.current).toBe(0);
    expect(r.events.some((e) => e.type === 'broken')).toBe(true);
    s = syncStreak(r.state, addDays(mon, 4), plan, true).state;
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });
  it('alle 7 Tage ein Freeze, der einen verpassten Tag rettet', () => {
    let s: StreakState = EMPTY_STREAK;
    let d = mon;
    for (let i = 0; i < 7; i++) {
      s = syncStreak(s, d, [1, 2, 3, 4, 5, 6, 7], true).state;
      d = addDays(d, 1);
    }
    expect(s.current).toBe(7);
    expect(s.freezes).toBe(1);
    // nächster Tag verpasst, übernächster trainiert
    const r = syncStreak(s, addDays(d, 1), [1, 2, 3, 4, 5, 6, 7], true);
    expect(r.events.map((e) => e.type)).toContain('freeze_used');
    expect(r.state.current).toBe(8);
    expect(r.state.freezes).toBe(0);
  });
  it('höchstens 3 Freezes', () => {
    let s: StreakState = EMPTY_STREAK;
    let d = mon;
    for (let i = 0; i < 35; i++) {
      s = syncStreak(s, d, [1, 2, 3, 4, 5, 6, 7], true).state;
      d = addDays(d, 1);
    }
    expect(s.freezes).toBe(3);
  });
});

describe('Abzeichen', () => {
  const zero: BadgeStats = { workouts: 0, setsTotal: 0, totalVolumeKg: 0, longestStreak: 0, maxWeightKg: 0, prs: 0, rankUps: 0, highestTier: 0, friends: 0, leaguePromotions: 0, bestLeagueTier: 1, reactionsGiven: 0 };
  it('mindestens 30 Abzeichen mit eindeutigen IDs', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
  it('vergibt nur neue Abzeichen', () => {
    const s = { ...zero, workouts: 1, maxWeightKg: 105, highestTier: 4 };
    const got = newlyEarnedBadges(s, ['first_workout']);
    expect(got).toEqual(expect.arrayContaining(['club_60', 'club_100', 'rank_bronze', 'rank_silver', 'rank_gold']));
    expect(got).not.toContain('first_workout');
    expect(got).not.toContain('club_140');
    expect(got).not.toContain('rank_platinum');
  });
  it('ein frischer Account hat keine Abzeichen', () => expect(newlyEarnedBadges(zero, [])).toEqual([]));
});
