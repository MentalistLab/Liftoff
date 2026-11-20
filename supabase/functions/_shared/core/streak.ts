// Streaks: Es zählen nur geplante Trainingstage. Ruhetage brechen den Streak nie.
// Training an einem Ruhetag zählt trotzdem als Streak-Tag.
// Pro 7 Streak-Tage gibt es einen Streak-Freeze (max. 3), der einen verpassten
// geplanten Tag automatisch überbrückt.

export const MAX_FREEZES = 3;
export const FREEZE_EVERY = 7;

/** Datum im Format YYYY-MM-DD (lokaler Kalendertag des Nutzers). */
export type DateStr = string;

export interface StreakState {
  current: number;
  longest: number;
  freezes: number;
  /** Letzter Tag, an dem trainiert wurde. */
  lastTrainedDate: DateStr | null;
  /** Letzter abgeschlossener Tag, der schon ausgewertet wurde. */
  lastEvaluatedDate: DateStr | null;
}

export type StreakEvent =
  | { type: 'extended'; date: DateStr; current: number }
  | { type: 'freeze_earned'; date: DateStr; freezes: number }
  | { type: 'freeze_used'; date: DateStr; freezes: number }
  | { type: 'broken'; date: DateStr; lost: number };

export const EMPTY_STREAK: StreakState = { current: 0, longest: 0, freezes: 0, lastTrainedDate: null, lastEvaluatedDate: null };

export function addDays(d: DateStr, n: number): DateStr {
  const [y, m, day] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, day + n));
  return t.toISOString().slice(0, 10);
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export function isoWeekday(d: DateStr): number {
  const [y, m, day] = d.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function isPlannedDay(d: DateStr, plannedWeekdays: number[]): boolean {
  return plannedWeekdays.includes(isoWeekday(d));
}

/**
 * Bringt den Streak auf den Stand von `today`:
 * 1. Wertet alle abgeschlossenen Tage seit dem letzten Mal aus (verpasste geplante
 *    Tage verbrauchen einen Freeze oder brechen den Streak).
 * 2. Wenn heute trainiert wurde, zählt der heutige Tag (einmal pro Tag).
 */
export function syncStreak(
  prev: StreakState,
  today: DateStr,
  plannedWeekdays: number[],
  trainedToday = false,
): { state: StreakState; events: StreakEvent[] } {
  const s: StreakState = { ...prev };
  const events: StreakEvent[] = [];
  const yesterday = addDays(today, -1);

  let d = s.lastEvaluatedDate ? addDays(s.lastEvaluatedDate, 1) : s.lastTrainedDate ? addDays(s.lastTrainedDate, 1) : null;
  // Sicherheitsgrenze: höchstens 400 Tage nachholen
  let guard = 0;
  while (d && d <= yesterday && guard++ < 400) {
    const trained = s.lastTrainedDate === d;
    if (!trained && isPlannedDay(d, plannedWeekdays) && s.current > 0) {
      if (s.freezes > 0) {
        s.freezes -= 1;
        events.push({ type: 'freeze_used', date: d, freezes: s.freezes });
      } else {
        events.push({ type: 'broken', date: d, lost: s.current });
        s.current = 0;
      }
    }
    d = addDays(d, 1);
  }
  if (yesterday >= (s.lastEvaluatedDate ?? '')) s.lastEvaluatedDate = yesterday;

  if (trainedToday && s.lastTrainedDate !== today) {
    s.current += 1;
    s.lastTrainedDate = today;
    s.longest = Math.max(s.longest, s.current);
    events.push({ type: 'extended', date: today, current: s.current });
    if (s.current % FREEZE_EVERY === 0 && s.freezes < MAX_FREEZES) {
      s.freezes += 1;
      events.push({ type: 'freeze_earned', date: today, freezes: s.freezes });
    }
  }
  return { state: s, events };
}

/** Lokales Datum (YYYY-MM-DD) in einer Zeitzone, z. B. 'Europe/Berlin'. */
export function localDate(now: Date, timeZone: string): DateStr {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
