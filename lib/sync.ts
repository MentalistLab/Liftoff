// Offline-Sync: abgeschlossene Workouts hochladen und serverseitig auswerten lassen.
// Idempotent über client_id (unique) und finalized_at (409 = schon ausgewertet).
import i18n from './i18n';
import { mergeHistory, type ServerWorkoutRow } from './history';
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
    try { await syncWorkout(w); } catch { break; }
  }
  try { await pullFromServer(); } catch { /* offline */ }
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

/**
 * Geräteübergreifend: abgeschlossene Workouts, XP und Streak vom Server holen und mit dem Gerät zusammenführen.
 * So sieht man auf Handy und iPad dieselbe Historie, dieselben Diagramme und dieselben Zielgewichte.
 */
export async function pullFromServer(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const uid = session.user.id;
  const [p, w] = await Promise.all([
    supabase.from('profiles').select('xp, gender, bodyweight_kg, height_cm, birth_year, experience, goal, location, training_days, current_streak, longest_streak, streak_freezes, last_trained_date, streak_evaluated_date').eq('id', uid).single(),
    supabase.from('workouts')
      .select('id, client_id, started_at, ended_at, notes, workout_sets(id, set_index, weight_kg, reps, duration_s, completed, exercises(slug))')
      .eq('user_id', uid).not('finalized_at', 'is', null).order('ended_at', { ascending: false }).limit(200),
  ]);
  if (p.error || w.error) return false;
  const prof = p.data;
  const ob = useOnboarding.getState();
  const ctx = {
    gender: (prof.gender ?? ob.gender ?? 'none') as 'male' | 'female' | 'none',
    bodyweightKg: Number(prof.bodyweight_kg ?? ob.bodyweightKg),
    age: prof.birth_year ? new Date().getFullYear() - prof.birth_year : ob.age,
  };
  const st = useWorkout.getState();
  const merged = mergeHistory(w.data as unknown as ServerWorkoutRow[], st.history, ctx, i18n.t('train.freeTitle'));
  useWorkout.setState({
    history: merged.history as typeof st.history,
    bests: merged.bests,
    lastSets: { ...st.lastSets, ...merged.lastSets },
    // Server ist maßgeblich für XP und Streak; noch nicht hochgeladene Workouts lokal draufrechnen
    xp: Math.max(prof.xp ?? 0, 0) + st.history.filter((h) => !h.synced).reduce((a, h) => a + h.summary.xp.total, 0),
    streak: {
      current: prof.current_streak ?? 0, longest: prof.longest_streak ?? 0, freezes: prof.streak_freezes ?? 0,
      lastTrainedDate: prof.last_trained_date ?? null, lastEvaluatedDate: prof.streak_evaluated_date ?? null,
    },
  });
  // Zweites Gerät: Profil-Angaben (Plan, Trainingstage, Körperdaten) vom Server übernehmen
  if (!ob.result) {
    useOnboarding.setState({
      ...(prof.goal ? { goal: prof.goal } : {}), ...(prof.experience ? { experience: prof.experience } : {}),
      ...(prof.location ? { location: prof.location } : {}), ...(prof.gender ? { gender: prof.gender } : {}),
      ...(prof.bodyweight_kg ? { bodyweightKg: Number(prof.bodyweight_kg) } : {}), ...(prof.height_cm ? { heightCm: Number(prof.height_cm) } : {}),
      ...(prof.birth_year ? { age: new Date().getFullYear() - prof.birth_year } : {}),
      ...(prof.training_days?.length ? { trainingDays: prof.training_days } : {}),
      serverSynced: true,
    });
  }
  // Onboarding gilt auf einem zweiten Gerät als erledigt, sobald man angemeldet ist
  if (!useOnboarding.getState().completed) useOnboarding.setState({ completed: true });
  return true;
}
