import { useQuery } from '@tanstack/react-query';
import { DEMO_MUSCLE_SCORES, DEMO_PROFILE } from '../lib/demo';
import type { MuscleScores } from '../lib/muscleMapView';
import { overallScore } from '../lib/ranking';
import type { Gender, Muscle } from '../lib/standards';
import { supabase, supabaseConfigured } from '../lib/supabase';

export interface MyRanks {
  gender: Gender;
  scores: MuscleScores;
  overall: number | null;
  demo: boolean;
}

async function fetchMyRanks(): Promise<MyRanks> {
  const demo = (): MyRanks => ({
    gender: DEMO_PROFILE.gender, scores: DEMO_MUSCLE_SCORES, overall: overallScore(DEMO_MUSCLE_SCORES), demo: true,
  });
  if (!supabaseConfigured) return demo();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return demo();

  const uid = session.user.id;
  const [profile, ranks] = await Promise.all([
    supabase.from('profiles').select('gender').eq('id', uid).single(),
    supabase.from('muscle_ranks').select('muscle, score').eq('user_id', uid),
  ]);
  if (profile.error) throw profile.error;
  if (ranks.error) throw ranks.error;
  const scores: MuscleScores = {};
  for (const r of ranks.data) scores[r.muscle as Muscle] = Number(r.score);
  return { gender: profile.data.gender as Gender, scores, overall: overallScore(scores), demo: false };
}

export function useMyRanks() {
  return useQuery({ queryKey: ['my-ranks'], queryFn: fetchMyRanks });
}
