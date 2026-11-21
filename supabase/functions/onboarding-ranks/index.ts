// onboarding-ranks: speichert den ersten Rang aus dem Onboarding – einmalig, solange noch keine Ränge existieren.
// Echt angegebene Bestwerte werden zu Übungsrängen (zählen für Bestenlisten), geschätzte nur in Muskel-/Gesamtrang.
import { z } from 'npm:zod@3.23.8';
import { handler, HttpError, json, must, requireUser, serviceClient } from '../_shared/http.ts';
import { computeOnboardingRanks } from '../_shared/core/onboarding.ts';
import type { Experience } from '../_shared/core/planner.ts';
import { bestScore, fallbackPercentile, scoreToRank } from '../_shared/core/ranking.ts';
import { exerciseBySlug, ONBOARDING_LIFTS, type Gender } from '../_shared/core/standards.ts';

const Lift = z.object({
  weightKg: z.number().min(0).max(500).nullable().optional(),
  reps: z.number().int().min(1).max(200).nullable().optional(),
}).nullable();
const Body = z.object({ lifts: z.record(z.enum(ONBOARDING_LIFTS as [string, ...string[]]), Lift) });

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const body = Body.parse(await req.json());
  const db = serviceClient();

  const existing = must(await db.from('muscle_ranks').select('muscle').eq('user_id', user.id).limit(1), 'existing') as unknown[];
  const existingEx = must(await db.from('exercise_ranks').select('exercise_id').eq('user_id', user.id).limit(1), 'existing ex') as unknown[];
  if (existing.length || existingEx.length) throw new HttpError(409, 'already_ranked');

  const p = must(await db.from('profiles').select('gender, birth_year, bodyweight_kg, experience').eq('id', user.id).single(), 'profile') as
    { gender: Gender; birth_year: number | null; bodyweight_kg: number | null; experience: Experience | null };
  if (!p.bodyweight_kg) throw new HttpError(400, 'profile_incomplete');
  const age = p.birth_year ? new Date().getUTCFullYear() - p.birth_year : null;
  const ctx = { gender: p.gender ?? 'none', bodyweightKg: Number(p.bodyweight_kg), age };

  const result = computeOnboardingRanks({ ...ctx, experience: p.experience ?? 'beginner', lifts: body.lifts });

  // Übungsränge nur für echte Angaben
  const slugs = ONBOARDING_LIFTS.filter((s) => !result.estimated.includes(s));
  if (slugs.length) {
    const ids = must(await db.from('exercises').select('id, slug').in('slug', slugs), 'exercises') as { id: string; slug: string }[];
    const rows = ids.flatMap(({ id, slug }) => {
      const ex = exerciseBySlug(slug)!;
      const l = body.lifts[slug]!;
      const score = bestScore(ex, [{ weightKg: l.weightKg ?? null, reps: l.reps ?? null }], ctx);
      if (score == null) return [];
      const r = scoreToRank(score);
      return [{ user_id: user.id, exercise_id: id, score, tier: r.tier, division: r.division, step: r.step, percentile: fallbackPercentile(score) }];
    });
    if (rows.length) must(await db.from('exercise_ranks').insert(rows), 'exercise ranks');
  }

  const muscleRows = Object.entries(result.muscleScores).map(([muscle, score]) => {
    const r = scoreToRank(score!);
    return { user_id: user.id, muscle, score, tier: r.tier, division: r.division, step: r.step, percentile: fallbackPercentile(score!) };
  });
  if (muscleRows.length) must(await db.from('muscle_ranks').insert(muscleRows), 'muscle ranks');

  const overall = scoreToRank(result.overall);
  must(await db.from('profiles').update({ overall_score: result.overall, overall_rank: overall.step }).eq('id', user.id), 'profile');

  return json({ ...result, overallRank: overall });
}));
