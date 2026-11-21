// finish-workout: schließt ein Workout ab und berechnet serverseitig
// 1RM, PRs, Übungs-/Muskel-/Gesamtrang, Streak, XP, Abzeichen, Feed und Progression.
// Die App ruft das nach „Workout beenden“ auf (auch nach Offline-Sync).

import { z } from 'npm:zod@3.23.8';
import { handler, HttpError, json, must, requireUser, serviceClient } from '../_shared/http.ts';
import {
  bestScore, epley1RM, fallbackPercentile, muscleScore, overallScore, rankLabel, rankUps, scoreToRank, weightClass,
  type MuscleContribution,
} from '../_shared/core/ranking.ts';
import { MUSCLES, type Gender, type Muscle, type RankingType, type Standards } from '../_shared/core/standards.ts';
import { localDate, syncStreak, addDays, type StreakState } from '../_shared/core/streak.ts';
import { levelFromXp, workoutXp } from '../_shared/core/xp.ts';
import { newlyEarnedBadges, BADGES } from '../_shared/core/badges.ts';
import { suggestNext } from '../_shared/core/progression.ts';

const Body = z.object({
  workoutId: z.string().uuid(),
  /** lokales Datum des Geräts (YYYY-MM-DD) – für Streaks über Zeitzonen hinweg */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

interface ExerciseRow {
  id: string; slug: string; name_de: string; name_en: string;
  primary_muscle: Muscle; secondary_muscles: Muscle[];
  ranking_type: RankingType; standards: Standards; is_ranked: boolean; is_bodyweight: boolean;
}
interface SetRow {
  id: string; exercise_id: string; set_index: number; weight_kg: number | null; reps: number | null;
  duration_s: number | null; rpe: number | null; is_warmup: boolean; completed: boolean; exercises: ExerciseRow;
}
interface PrRow { exercise_id: string; best_1rm: number | null; best_reps: number | null; best_duration_s: number | null; best_score: number | null }
interface RankRow { exercise_id: string; score: number }

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
const LOWER_BODY: Muscle[] = ['legs', 'glutes'];

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const body = Body.parse(await req.json());
  const db = serviceClient();

  // 1) Workout atomar „beanspruchen“ – doppelte Aufrufe bekommen 409 statt doppelter XP.
  const claimed = must(
    await db.from('workouts').update({ finalized_at: new Date().toISOString() })
      .eq('id', body.workoutId).eq('user_id', user.id).is('finalized_at', null)
      .select('id, plan_day_id, started_at, ended_at'),
    'workout',
  ) as { id: string; plan_day_id: string | null; started_at: string; ended_at: string | null }[];
  if (!claimed.length) {
    const exists = must(await db.from('workouts').select('id').eq('id', body.workoutId).eq('user_id', user.id), 'workout') as unknown[];
    throw new HttpError(exists.length ? 409 : 404, exists.length ? 'already_finalized' : 'not_found');
  }
  const workout = claimed[0];
  let xpBooked = false;

  try {
    const profile = must(await db.from('profiles').select(
      'gender, birth_year, bodyweight_kg, timezone, training_days, language, xp, current_streak, longest_streak, streak_freezes, last_trained_date, streak_evaluated_date',
    ).eq('id', user.id).single(), 'profile') as Record<string, unknown>;

    const sets = must(await db.from('workout_sets').select(
      'id, exercise_id, set_index, weight_kg, reps, duration_s, rpe, is_warmup, completed, exercises(id, slug, name_de, name_en, primary_muscle, secondary_muscles, ranking_type, standards, is_ranked, is_bodyweight)',
    ).eq('workout_id', workout.id), 'sets') as unknown as SetRow[];

    const done = sets
      .map((s) => ({ ...s, weight_kg: num(s.weight_kg), reps: num(s.reps), duration_s: num(s.duration_s), rpe: num(s.rpe) }))
      .filter((s) => s.completed && !s.is_warmup && ((s.reps ?? 0) > 0 || (s.duration_s ?? 0) > 0));

    const gender = (profile.gender as Gender) ?? 'none';
    const bodyweight = num(profile.bodyweight_kg) ?? 75;
    const birthYear = num(profile.birth_year);
    const ctx = { gender, bodyweightKg: bodyweight, age: birthYear ? new Date().getUTCFullYear() - birthYear : null };

    // 2) geschätztes 1RM je Satz speichern, Volumen berechnen
    let volume = 0;
    await Promise.all(done.map((s) => {
      const added = s.exercises.is_bodyweight ? 0 : s.weight_kg ?? 0;
      if (added > 0 && s.reps) volume += added * s.reps;
      const est = s.exercises.ranking_type === 'weight_ratio' ? epley1RM(s.weight_kg, s.reps) : null;
      return est ? db.from('workout_sets').update({ estimated_1rm: Math.round(est * 100) / 100 }).eq('id', s.id) : Promise.resolve();
    }));

    // 3) pro Übung: Score, PR, Rang
    const byExercise = new Map<string, typeof done>();
    for (const s of done) {
      if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
      byExercise.get(s.exercise_id)!.push(s);
    }
    const exIds = [...byExercise.keys()];
    const prevPrs = new Map((must(await db.from('personal_records').select('exercise_id, best_1rm, best_reps, best_duration_s, best_score').eq('user_id', user.id).in('exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000']), 'prs') as PrRow[]).map((r) => [r.exercise_id, r]));
    const prevRanks = new Map((must(await db.from('exercise_ranks').select('exercise_id, score').eq('user_id', user.id).in('exercise_id', exIds.length ? exIds : ['00000000-0000-0000-0000-000000000000']), 'ranks') as RankRow[]).map((r) => [r.exercise_id, num(r.score)!]));
    const wClass = weightClass(gender, bodyweight);

    const exerciseResults: Record<string, unknown>[] = [];
    const prUpserts: Record<string, unknown>[] = [];
    const rankUpserts: Record<string, unknown>[] = [];
    const feed: { user_id: string; type: string; payload: Record<string, unknown> }[] = [];
    let prCount = 0;
    let rankUpTotal = 0;

    for (const [exId, exSets] of byExercise) {
      const ex = exSets[0].exercises;
      const score = ex.is_ranked ? bestScore({ rankingType: ex.ranking_type, standards: ex.standards }, exSets.map((s) => ({ weightKg: s.weight_kg, reps: s.reps, durationS: s.duration_s })), ctx) : null;
      const best1rm = Math.max(0, ...exSets.map((s) => (ex.ranking_type === 'weight_ratio' ? epley1RM(s.weight_kg, s.reps) ?? 0 : 0)));
      const bestReps = Math.max(0, ...exSets.map((s) => s.reps ?? 0));
      const bestDur = Math.max(0, ...exSets.map((s) => s.duration_s ?? 0));

      const prev = prevPrs.get(exId);
      const isPr = !!prev && (
        (ex.ranking_type === 'weight_ratio' && best1rm > (num(prev.best_1rm) ?? 0) + 0.01) ||
        (ex.ranking_type === 'reps' && bestReps > (num(prev.best_reps) ?? 0)) ||
        (ex.ranking_type === 'time' && bestDur > (num(prev.best_duration_s) ?? 0))
      );
      if (isPr) prCount++;
      prUpserts.push({
        user_id: user.id, exercise_id: exId,
        best_1rm: Math.max(best1rm, num(prev?.best_1rm) ?? 0) || null,
        best_reps: Math.max(bestReps, num(prev?.best_reps) ?? 0) || null,
        best_duration_s: Math.max(bestDur, num(prev?.best_duration_s) ?? 0) || null,
        best_score: Math.max(score ?? 0, num(prev?.best_score) ?? 0) || null,
        ...(isPr || !prev ? { achieved_at: new Date().toISOString() } : {}),
      });
      if (isPr) feed.push({ user_id: user.id, type: 'pr', payload: { exerciseSlug: ex.slug, nameDe: ex.name_de, nameEn: ex.name_en, oneRm: best1rm || null, reps: bestReps || null, durationS: bestDur || null } });

      const prevScore = prevRanks.get(exId);
      let ups = 0;
      let rankInfo: Record<string, unknown> | null = null;
      if (score !== null && (prevScore === undefined || score > prevScore)) {
        ups = rankUps(prevScore ?? null, score);
        const r = scoreToRank(score);
        const pct = must(await db.rpc('get_percentile', { p_exercise_id: exId, p_score: score, p_gender: gender, p_weight_class: wClass }), 'percentile') as number | null;
        rankUpserts.push({ user_id: user.id, exercise_id: exId, score, tier: r.tier, division: r.division, step: r.step, percentile: pct ?? fallbackPercentile(score), updated_at: new Date().toISOString() });
        rankInfo = { ...r, label: rankLabel(r), percentile: pct ?? fallbackPercentile(score) };
        if (ups > 0) {
          rankUpTotal += ups;
          feed.push({ user_id: user.id, type: 'rank_up', payload: { exerciseSlug: ex.slug, nameDe: ex.name_de, nameEn: ex.name_en, from: rankLabel(scoreToRank(prevScore!)), to: rankLabel(r), tier: r.tier, division: r.division } });
        }
      }
      exerciseResults.push({
        exerciseId: exId, slug: ex.slug, score, isPr, rankUps: ups, best1rm: best1rm || null,
        rank: rankInfo ?? (prevScore !== undefined ? { ...scoreToRank(prevScore), label: rankLabel(scoreToRank(prevScore)) } : null),
        previousRank: prevScore !== undefined ? rankLabel(scoreToRank(prevScore)) : null,
      });
    }
    if (prUpserts.length) must(await db.from('personal_records').upsert(prUpserts), 'pr upsert');
    if (rankUpserts.length) must(await db.from('exercise_ranks').upsert(rankUpserts), 'rank upsert');

    // 4) Muskel- und Gesamtrang aus allen Übungsrängen neu berechnen
    const allRanks = must(await db.from('exercise_ranks').select('score, exercises(primary_muscle, secondary_muscles)').eq('user_id', user.id), 'all ranks') as unknown as
      { score: number; exercises: { primary_muscle: Muscle; secondary_muscles: Muscle[] } }[];
    const contrib = new Map<Muscle, MuscleContribution[]>();
    for (const r of allRanks) {
      const add = (m: Muscle, role: MuscleContribution['role']) => {
        if (!contrib.has(m)) contrib.set(m, []);
        contrib.get(m)!.push({ score: num(r.score)!, role });
      };
      add(r.exercises.primary_muscle, 'primary');
      for (const m of r.exercises.secondary_muscles ?? []) add(m, 'secondary');
    }
    const muscleScores: Partial<Record<Muscle, number | null>> = {};
    const muscleUpserts: Record<string, unknown>[] = [];
    for (const m of MUSCLES) {
      const s = muscleScore(contrib.get(m) ?? []);
      muscleScores[m] = s;
      if (s !== null) {
        const r = scoreToRank(s);
        muscleUpserts.push({ user_id: user.id, muscle: m, score: s, tier: r.tier, division: r.division, step: r.step, percentile: fallbackPercentile(s), updated_at: new Date().toISOString() });
      }
    }
    if (muscleUpserts.length) must(await db.from('muscle_ranks').upsert(muscleUpserts), 'muscle upsert');
    const overall = overallScore(muscleScores);

    // 5) Streak (Datum vom Gerät, aber höchstens ±1 Tag von der Serverzeit)
    const tz = (profile.timezone as string) || 'Europe/Berlin';
    const serverToday = localDate(new Date(), tz);
    const today = body.today && body.today >= addDays(serverToday, -1) && body.today <= addDays(serverToday, 1) ? body.today : serverToday;
    const streakBefore: StreakState = {
      current: num(profile.current_streak) ?? 0, longest: num(profile.longest_streak) ?? 0, freezes: num(profile.streak_freezes) ?? 0,
      lastTrainedDate: (profile.last_trained_date as string) ?? null, lastEvaluatedDate: (profile.streak_evaluated_date as string) ?? null,
    };
    const streak = done.length > 0 ? syncStreak(streakBefore, today, (profile.training_days as number[]) ?? [1, 3, 5], true) : { state: streakBefore, events: [] };

    // 6) XP buchen (Trigger aktualisiert Profil-XP und Liga-Wochen-XP)
    const xp = workoutXp({ completedSets: done.length, prs: prCount, rankUps: rankUpTotal, streak: streak.state.current });
    if (xp.total > 0) {
      must(await db.from('xp_events').insert({ user_id: user.id, amount: xp.total, reason: 'workout', ref_id: workout.id }), 'xp');
      xpBooked = true;
    }
    const level = levelFromXp((num(profile.xp) ?? 0) + xp.total);
    const overallRank = overall !== null ? scoreToRank(overall) : null;

    must(await db.from('profiles').update({
      level: level.level,
      current_streak: streak.state.current, longest_streak: streak.state.longest, streak_freezes: streak.state.freezes,
      last_trained_date: streak.state.lastTrainedDate, streak_evaluated_date: streak.state.lastEvaluatedDate,
      overall_score: overall, overall_rank: overallRank?.step ?? null,
    }).eq('id', user.id), 'profile update');

    const startedAt = new Date(workout.started_at);
    const endedAt = workout.ended_at ? new Date(workout.ended_at) : new Date();
    must(await db.from('workouts').update({ total_volume: Math.round(volume * 10) / 10, xp_earned: xp.total, ended_at: endedAt.toISOString() }).eq('id', workout.id), 'workout update');

    // 7) Feed
    if (done.length) {
      feed.unshift({ user_id: user.id, type: 'workout', payload: { workoutId: workout.id, sets: done.length, exercises: byExercise.size, volumeKg: Math.round(volume), durationMin: Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)), xp: xp.total } });
    }

    // 8) Abzeichen
    const statsRow = (must(await db.rpc('get_badge_stats', { p_user: user.id }), 'badge stats') as Record<string, number>[])[0];
    const have = (must(await db.from('user_badges').select('badge_id').eq('user_id', user.id), 'badges') as { badge_id: string }[]).map((b) => b.badge_id);
    const newBadges = statsRow ? newlyEarnedBadges({
      workouts: Number(statsRow.workouts), setsTotal: Number(statsRow.sets_total), totalVolumeKg: Number(statsRow.total_volume_kg),
      longestStreak: Number(statsRow.longest_streak), maxWeightKg: Number(statsRow.max_weight_kg), prs: Number(statsRow.prs) + prCount,
      rankUps: Number(statsRow.rank_ups) + feed.filter((f) => f.type === 'rank_up').length, highestTier: Number(statsRow.highest_tier),
      friends: Number(statsRow.friends), leaguePromotions: Number(statsRow.league_promotions), bestLeagueTier: Number(statsRow.best_league_tier),
      reactionsGiven: Number(statsRow.reactions_given),
    }, have) : [];
    if (newBadges.length) {
      must(await db.from('user_badges').insert(newBadges.map((id) => ({ user_id: user.id, badge_id: id }))), 'badge insert');
      for (const id of newBadges) {
        const b = BADGES.find((x) => x.id === id)!;
        feed.push({ user_id: user.id, type: 'badge', payload: { badgeId: id, nameDe: b.nameDe, nameEn: b.nameEn } });
      }
    }
    if (feed.length) must(await db.from('feed_events').insert(feed), 'feed');

    // 9) Progressive Overload für den Plantag
    const progression: Record<string, unknown>[] = [];
    if (workout.plan_day_id) {
      const planEx = must(await db.from('plan_exercises').select('id, exercise_id, sets, reps_min, reps_max, target_weight_kg').eq('plan_day_id', workout.plan_day_id), 'plan') as
        { id: string; exercise_id: string; sets: number; reps_min: number | null; reps_max: number | null; target_weight_kg: number | null }[];
      for (const pe of planEx) {
        const exSets = byExercise.get(pe.exercise_id);
        if (!exSets || pe.reps_min == null || pe.reps_max == null) continue;
        const ex = exSets[0].exercises;
        const sug = suggestNext(
          { sets: pe.sets, repsMin: pe.reps_min, repsMax: pe.reps_max, weightKg: num(pe.target_weight_kg), lowerBody: LOWER_BODY.includes(ex.primary_muscle) || ex.slug === 'deadlift' },
          exSets.map((s) => ({ weightKg: s.weight_kg, reps: s.reps ?? 0, rpe: s.rpe })),
        );
        must(await db.from('plan_exercises').update({
          target_weight_kg: sug.weightKg, reps_min: sug.repsMin, reps_max: sug.repsMax,
          notes: profile.language === 'en' ? sug.noteEn : sug.noteDe,
        }).eq('id', pe.id), 'progression');
        progression.push({ exerciseId: pe.exercise_id, slug: ex.slug, ...sug });
      }
    }

    return json({
      workoutId: workout.id,
      volumeKg: Math.round(volume),
      xp,
      level,
      streak: { ...streak.state, events: streak.events },
      exercises: exerciseResults,
      overall: overall !== null ? { score: overall, ...overallRank, label: rankLabel(overallRank!) } : null,
      badges: newBadges,
      progression,
    });
  } catch (e) {
    // Ohne gebuchte XP darf das Workout erneut abgeschlossen werden.
    if (!xpBooked) await db.from('workouts').update({ finalized_at: null }).eq('id', workout.id);
    throw e;
  }
}));
