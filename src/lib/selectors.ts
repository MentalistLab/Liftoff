import { MUSCLES } from '@/data/exercises';
import { Athlete, Rank, overallScore, rankFromScore } from '@/lib/ranking';
import { LoggedSet, Workout, bestScores, muscleScores } from '@/lib/workout';

export function computeRanksFromSets(sets: LoggedSet[], athlete: Athlete) {
  const exercises = bestScores(sets, athlete);
  const muscles = muscleScores(exercises);
  const o = overallScore(exercises);
  return {
    exercises,
    muscles: MUSCLES.map((m) => ({ muscle: m, rank: muscles[m] === undefined ? null : rankFromScore(muscles[m]!) })),
    overall: o === null ? null : (rankFromScore(o) as Rank),
  };
}

export const computeRanks = (history: Workout[], athlete: Athlete) =>
  computeRanksFromSets(history.flatMap((w) => w.sets), athlete);
