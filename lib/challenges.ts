// Wochen-Challenges: werden aus der Workout-Historie der aktuellen Woche (Mo–So) berechnet,
// sind dadurch auf allen Geräten gleich und brauchen keinen eigenen Server-Speicher.
import { computeStats, type HistoryWorkout } from './profileStats.ts';

export interface Challenge { id: string; target: number; value: number; done: boolean; unit: 'workouts' | 'sets' | 'kg' | 'prs' | 'days' }

export function weekStartMs(now = new Date()): number {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function weeklyChallenges(history: HistoryWorkout[], plannedDays: number, now = new Date()): Challenge[] {
  const ws = weekStartMs(now);
  const week = history.filter((h) => h.endedAt >= ws);
  const before = history.filter((h) => h.endedAt < ws && h.endedAt >= ws - 28 * 86_400_000);
  const s = computeStats(week);
  // Volumen-Ziel: 10 % über dem Wochenschnitt der letzten 4 Wochen, mindestens 2 t
  const avgVol = before.reduce((a, h) => a + h.summary.volumeKg, 0) / 4;
  const volTarget = Math.max(2000, Math.round((avgVol * 1.1) / 500) * 500);
  const days = new Set(week.map((h) => new Date(h.endedAt).toDateString())).size;
  const mk = (id: string, unit: Challenge['unit'], value: number, target: number): Challenge => ({ id, unit, value, target, done: value >= target });
  return [
    mk('plan', 'workouts', week.length, Math.max(2, plannedDays)),
    mk('sets', 'sets', s.setsTotal, 40),
    mk('volume', 'kg', s.totalVolumeKg, volTarget),
    mk('pr', 'prs', s.prs, 1),
  ];
}
