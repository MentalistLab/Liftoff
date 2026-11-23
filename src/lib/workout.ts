import { EXERCISES, MUSCLES, Muscle, getExercise } from '@/data/exercises';
import {
  Athlete,
  Rank,
  estimate1RM,
  exerciseRank,
  muscleScore,
  overallScore,
  rankFromScore,
  rankIndex,
} from './ranking';
import { StreakState, registerWorkout } from './streak';
import { workoutXp } from './xp';

export interface LoggedSet {
  exerciseId: string;
  weightKg: number;
  reps: number;
  durationS?: number;
}

export interface Workout {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  startedAt: number;
  endedAt: number;
  sets: LoggedSet[];
  volumeKg: number;
  xp: number;
}

export interface RankUp {
  kind: 'exercise' | 'muscle' | 'overall';
  label: string;
  from: Rank;
  to: Rank;
}

export interface PersonalRecord {
  exerciseId: string;
  value: number;
  unit: 'kg' | 'reps' | 's';
}

export interface WorkoutResult {
  workout: Workout;
  prs: PersonalRecord[];
  rankUps: RankUp[];
  streak: StreakState;
  overallBefore: Rank | null;
  overallAfter: Rank | null;
}

/** Bester Score je Übung über alle Sätze. */
export function bestScores(sets: LoggedSet[], athlete: Athlete): Record<string, number> {
  const best: Record<string, number> = {};
  for (const s of sets) {
    const ex = getExercise(s.exerciseId);
    if (!ex) continue;
    const score = exerciseRank(ex, s, athlete).score;
    if (best[ex.id] === undefined || score > best[ex.id]) best[ex.id] = score;
  }
  return best;
}

export function muscleScores(scores: Record<string, number>): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const m of MUSCLES) {
    const s = muscleScore(m, scores);
    if (s !== null) out[m] = s;
  }
  return out;
}

/** Messwert pro Übung für Bestleistungen: 1RM (kg), Wiederholungen oder Sekunden. */
export function recordValue(s: LoggedSet): { value: number; unit: PersonalRecord['unit'] } {
  const ex = getExercise(s.exerciseId);
  if (ex?.type === 'time') return { value: s.durationS ?? 0, unit: 's' };
  if (ex?.type === 'reps') return { value: s.reps, unit: 'reps' };
  return { value: estimate1RM(s.weightKg, s.reps), unit: 'kg' };
}

function bestRecords(sets: LoggedSet[]): Record<string, PersonalRecord> {
  const out: Record<string, PersonalRecord> = {};
  for (const s of sets) {
    const { value, unit } = recordValue(s);
    if (!out[s.exerciseId] || value > out[s.exerciseId].value) out[s.exerciseId] = { exerciseId: s.exerciseId, value, unit };
  }
  return out;
}

export const isValidSet = (s: LoggedSet): boolean => {
  const ex = getExercise(s.exerciseId);
  if (!ex) return false;
  if (ex.type === 'time') return (s.durationS ?? 0) > 0;
  if (ex.type === 'reps') return s.reps > 0;
  return s.weightKg > 0 && s.reps > 0;
};

export interface FinishInput {
  athlete: Athlete;
  history: Workout[];
  sets: LoggedSet[];
  streak: StreakState;
  trainingDays: number;
  today: string;
  startedAt: number;
  endedAt: number;
  id: string;
}

export function finishWorkout(input: FinishInput): WorkoutResult {
  const { athlete, history, streak, trainingDays, today } = input;
  const sets = input.sets.filter(isValidSet);
  const previousSets = history.flatMap((w) => w.sets);

  // Ränge vorher / nachher
  const before = bestScores(previousSets, athlete);
  const after = bestScores([...previousSets, ...sets], athlete);

  const rankUps: RankUp[] = [];
  for (const ex of EXERCISES) {
    if (before[ex.id] === undefined || after[ex.id] === undefined) continue;
    const from = rankFromScore(before[ex.id]);
    const to = rankFromScore(after[ex.id]);
    if (rankIndex(to) > rankIndex(from)) rankUps.push({ kind: 'exercise', label: ex.name, from, to });
  }
  const mBefore = muscleScores(before);
  const mAfter = muscleScores(after);
  for (const m of MUSCLES) {
    if (mBefore[m] === undefined || mAfter[m] === undefined) continue;
    const from = rankFromScore(mBefore[m]!);
    const to = rankFromScore(mAfter[m]!);
    if (rankIndex(to) > rankIndex(from)) rankUps.push({ kind: 'muscle', label: m, from, to });
  }
  const oBefore = overallScore(before);
  const oAfter = overallScore(after);
  const overallBefore = oBefore === null ? null : rankFromScore(oBefore);
  const overallAfter = oAfter === null ? null : rankFromScore(oAfter);
  if (overallBefore && overallAfter && rankIndex(overallAfter) > rankIndex(overallBefore)) {
    rankUps.push({ kind: 'overall', label: 'overall', from: overallBefore, to: overallAfter });
  }

  // Bestleistungen (nur wenn es einen früheren Wert gibt)
  const prevBest = bestRecords(previousSets);
  const prs = Object.values(bestRecords(sets)).filter(
    (r) => prevBest[r.exerciseId] !== undefined && r.value > prevBest[r.exerciseId].value + 1e-9,
  );

  const newStreak = registerWorkout(streak, today, trainingDays);
  const paidRankUps = rankUps.filter((r) => r.kind !== 'exercise').length;
  const xp = workoutXp({ completedSets: sets.length, prs: prs.length, rankUps: paidRankUps, streak: newStreak.current });

  const workout: Workout = {
    id: input.id,
    date: today,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    sets,
    volumeKg: Math.round(sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0)),
    xp,
  };
  return { workout, prs, rankUps, streak: newStreak, overallBefore, overallAfter };
}
