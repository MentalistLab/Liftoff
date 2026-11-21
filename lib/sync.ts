// Offline-Sync: abgeschlossene Workouts hochladen und serverseitig auswerten lassen.
// Idempotent über client_id (unique) und finalized_at (409 = schon ausgewertet).
import { supabase, supabaseConfigured } from './supabase';
import { useOnboarding } from '../stores/onboarding';
import { useSettings } from '../stores/settings';
import { useCelebrations } from '../stores/celebrations';
import { useWorkout, type FinishedWorkout, type ServerResult } from '../stores/workout';

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function syncWorkout(w: FinishedWorkout): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const slugs = [...new Set(w.exercises.map((e) => e.slug))];
  const { data: exRows, error: exErr } = await supabase.from('exercises').select('id, slug').in('slug', slugs);
  if (exErr) throw exErr;
  const idBySlug = new Map(exRows.map((r) => [r.slug as string, r.id as string]));

  // Workout anlegen oder vorhandenes (gleiche client_id) wiederverwenden
  let workoutId: string;
  const existing = await supabase.from('workouts').select('id').eq('client_id', w.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    workoutId = existing.data.id;
  } else {
    const ins = await supabase.from('workouts').insert({
      client_id: w.id, started_at: new Date(w.startedAt).toISOString(), ended_at: new Date(w.endedAt).toISOString(), notes: w.notes || null,
    }).select('id').single();
    if (ins.error) throw ins.error;
    workoutId = ins.data.id;
    // set_index ist je Übung fortlaufend (0–99), auch wenn eine Übung zweimal vorkommt
    const counter = new Map<string, number>();
    const rows = w.exercises.flatMap((e) => {
      const exercise_id = idBySlug.get(e.slug);
      if (!exercise_id) return [];
      return e.sets.map((s) => ({
        workout_id: workoutId, exercise_id, set_index: Math.min(99, counter.set(exercise_id, (counter.get(exercise_id) ?? -1) + 1).get(exercise_id)!),
        weight_kg: s.weightKg, reps: s.reps, duration_s: s.durationS, completed: s.done,
      }));
    });
    if (rows.length) {
      const r = await supabase.from('workout_sets').insert(rows);
      if (r.error) throw r.error;
    }
  }

  const fin = await supabase.functions.invoke('finish-workout', { body: { workoutId, today: localDate(new Date(w.endedAt)) } });
  const status = (fin.error as { context?: { status?: number } } | null)?.context?.status;
  if (fin.error && status !== 409) throw fin.error;
  const server = fin.error ? undefined : (fin.data as ServerResult);
  useWorkout.getState().markSynced(w.id, server);
  // Abzeichen, die nur der Server kennt (z. B. Freunde, Liga), nachträglich feiern
  if (server?.badges?.length) {
    const local = new Set(w.summary.newBadges ?? []);
    const extra = server.badges.filter((id) => !local.has(id));
    if (extra.length) useCelebrations.getState().push(...extra.map((id) => ({ kind: 'badge' as const, id })));
  }
  return true;
}

/** Beim App-Start: alles Ausstehende nachreichen. Fehler bleiben still – nächster Versuch beim nächsten Start. */
export async function syncPending(): Promise<void> {
  try { await syncOnboarding(); } catch { /* nächster Start */ }
  for (const w of useWorkout.getState().history.filter((h) => !h.synced)) {
    try { await syncWorkout(w); } catch { return; }
  }
}

/**
 * Onboarding-Daten einmalig ins Server-Profil übernehmen und den ersten Rang speichern.
 * Läuft nach Registrierung/Anmeldung und beim App-Start; überschreibt nichts, was schon auf dem Server steht.
 */
export async function syncOnboarding(): Promise<void> {
  if (!supabaseConfigured) return;
  const { data: { session } } = await supabase.auth.getSession();
  const ob = useOnboarding.getState();
  if (!session || !ob.result || ob.serverSynced) return;
  const uid = session.user.id;
  const { data: p, error } = await supabase.from('profiles').select('bodyweight_kg').eq('id', uid).single();
  if (error) return;
  if (p.bodyweight_kg == null) {
    const { language, unitSystem } = useSettings.getState();
    const up = await supabase.from('profiles').update({
      gender: ob.gender ?? 'none', birth_year: new Date().getFullYear() - ob.age, bodyweight_kg: ob.bodyweightKg,
      height_cm: ob.heightCm, experience: ob.experience, goal: ob.goal, location: ob.location,
      training_days: ob.trainingDays, language, unit_system: unitSystem,
    }).eq('id', uid);
    if (up.error) return;
  }
  const r = await supabase.functions.invoke('onboarding-ranks', { body: { lifts: ob.lifts } });
  const status = (r.error as { context?: { status?: number } } | null)?.context?.status;
  if (!r.error || status === 409) useOnboarding.setState({ serverSynced: true });
}
