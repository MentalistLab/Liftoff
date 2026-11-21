// Beim App-Start: Streak auswerten und unbestätigte Liga-Ergebnisse anzeigen.
import { supabase, supabaseConfigured } from './supabase';
import { useCelebrations, type Celebration } from '../stores/celebrations';
import { useOnboarding } from '../stores/onboarding';
import { useWorkout } from '../stores/workout';

export async function runStartupChecks(): Promise<void> {
  const cel: Celebration[] = [];
  const ob = useOnboarding.getState();
  if (ob.completed) {
    for (const e of useWorkout.getState().checkStreak(ob.trainingDays)) if (e.type === 'broken') cel.push({ kind: 'streak_lost', lost: e.lost });
  }
  if (supabaseConfigured) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('league_members')
          .select('league_id, final_position, result, leagues(tier)')
          .eq('user_id', session.user.id).eq('result_seen', false).not('result', 'is', null)
          .order('week_start', { ascending: false }).limit(1);
        const row = data?.[0] as unknown as { league_id: string; final_position: number | null; result: 'promoted' | 'stayed' | 'demoted'; leagues: { tier: number } } | undefined;
        if (row) {
          const tier = Math.max(1, Math.min(10, row.leagues.tier + (row.result === 'promoted' ? 1 : row.result === 'demoted' ? -1 : 0)));
          cel.push({ kind: 'league', result: row.result, position: row.final_position, tier });
          await supabase.from('league_members').update({ result_seen: true }).eq('league_id', row.league_id).eq('user_id', session.user.id);
        }
      }
    } catch { /* offline – beim nächsten Start */ }
  }
  if (cel.length) useCelebrations.getState().push(...cel);
}
