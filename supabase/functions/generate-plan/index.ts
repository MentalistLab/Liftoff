// generate-plan: erstellt mit Claude einen Wochenplan aus Ziel, Erfahrung, Equipment,
// Trainingstagen und den aktuellen Rängen. Der API-Key liegt nur als Supabase-Secret
// (ANTHROPIC_API_KEY) auf dem Server. Die Antwort wird mit zod geprüft.

import { z } from 'npm:zod@3.23.8';
import { handler, HttpError, json, must, requireUser, serviceClient } from '../_shared/http.ts';
import { startingWeight } from '../_shared/core/progression.ts';
import { localDate, addDays } from '../_shared/core/streak.ts';
import { MUSCLE_NAMES, type Muscle } from '../_shared/core/standards.ts';
import { rankLabel, scoreToRank } from '../_shared/core/ranking.ts';

const Body = z.object({ force: z.boolean().optional() });

const ExerciseEntry = z.object({
  slug: z.string(),
  sets: z.number().int().min(1).max(8),
  repsMin: z.number().int().min(1).max(50).nullable().optional(),
  repsMax: z.number().int().min(1).max(50).nullable().optional(),
  durationS: z.number().int().min(10).max(600).nullable().optional(),
  restS: z.number().int().min(30).max(300),
  notes: z.string().max(200).optional(),
}).refine((e) => (e.repsMin != null && e.repsMax != null && e.repsMin <= e.repsMax) || e.durationS != null, {
  message: 'Jede Übung braucht repsMin ≤ repsMax oder durationS',
});

const PlanSchema = z.object({
  title: z.string().min(3).max(60),
  summary: z.string().max(500),
  days: z.array(z.object({
    weekday: z.number().int().min(1).max(7),
    title: z.string().min(2).max(40),
    exercises: z.array(ExerciseEntry).min(3).max(9),
  })).min(1).max(7),
});
type Plan = z.infer<typeof PlanSchema>;

// JSON-Schema für das Tool, das Claude ausfüllen muss (spiegelt PlanSchema)
const PLAN_TOOL = {
  name: 'submit_plan',
  description: 'Gibt den fertigen Wochen-Trainingsplan zurück.',
  input_schema: {
    type: 'object',
    required: ['title', 'summary', 'days'],
    properties: {
      title: { type: 'string', description: 'Kurzer Plantitel, max. 60 Zeichen' },
      summary: { type: 'string', description: '1–3 Sätze: Aufbau und Fokus des Plans' },
      days: {
        type: 'array',
        items: {
          type: 'object',
          required: ['weekday', 'title', 'exercises'],
          properties: {
            weekday: { type: 'integer', minimum: 1, maximum: 7, description: '1 = Montag … 7 = Sonntag' },
            title: { type: 'string', description: 'z. B. „Push · Brust & Schultern“' },
            exercises: {
              type: 'array', minItems: 3, maxItems: 9,
              items: {
                type: 'object',
                required: ['slug', 'sets', 'restS'],
                properties: {
                  slug: { type: 'string', description: 'Exakt ein slug aus der Übungsliste' },
                  sets: { type: 'integer', minimum: 1, maximum: 8 },
                  repsMin: { type: 'integer', minimum: 1, maximum: 50 },
                  repsMax: { type: 'integer', minimum: 1, maximum: 50 },
                  durationS: { type: 'integer', minimum: 10, maximum: 600, description: 'Nur für Halte-Übungen statt Wiederholungen' },
                  restS: { type: 'integer', minimum: 30, maximum: 300 },
                  notes: { type: 'string', description: 'Kurzer Technik- oder Tempo-Hinweis, max. 200 Zeichen' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const EQUIPMENT_BY_LOCATION: Record<string, string[]> = {
  gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell'],
  home_dumbbells: ['dumbbell', 'bodyweight', 'kettlebell'],
  bodyweight: ['bodyweight'],
};
const GOAL_DE: Record<string, string> = { muscle: 'Muskelaufbau', strength: 'Kraft', fat_loss: 'Abnehmen (Kraft erhalten)', fitness: 'Fit bleiben' };
const EXP_DE: Record<string, string> = { beginner: 'Anfänger', intermediate: 'Fortgeschritten', advanced: 'Profi' };
const DAY_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

async function askClaude(system: string, user: string): Promise<unknown> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new HttpError(500, 'config', 'ANTHROPIC_API_KEY fehlt');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'submit_plan' },
    }),
  });
  if (!res.ok) {
    console.error('Claude API', res.status, await res.text());
    throw new HttpError(502, 'ai_unavailable', 'Der Plan-Generator ist gerade nicht erreichbar.');
  }
  const data = await res.json() as { content: { type: string; input?: unknown }[] };
  const tool = data.content.find((c) => c.type === 'tool_use');
  if (!tool) throw new HttpError(502, 'ai_invalid', 'Keine Plan-Antwort erhalten.');
  return tool.input;
}

function checkPlan(plan: Plan, allowed: Set<string>, days: number[]): string[] {
  const errors: string[] = [];
  const wd = plan.days.map((d) => d.weekday).sort();
  if (JSON.stringify(wd) !== JSON.stringify([...days].sort())) errors.push(`Die Wochentage müssen genau ${days.join(', ')} sein (einer pro Tag).`);
  for (const d of plan.days) for (const e of d.exercises) if (!allowed.has(e.slug)) errors.push(`Unbekannter slug „${e.slug}“.`);
  return errors;
}

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  const body = Body.parse(await req.json().catch(() => ({})));
  const db = serviceClient();

  const profile = must(await db.from('profiles').select('gender, birth_year, bodyweight_kg, experience, goal, location, training_days, timezone, language').eq('id', user.id).single(), 'profile') as Record<string, unknown>;
  const today = localDate(new Date(), (profile.timezone as string) || 'Europe/Berlin');

  // Alle 4 Wochen neu generierbar
  const active = must(await db.from('training_plans').select('id, valid_until').eq('user_id', user.id).eq('is_active', true).eq('source', 'ai'), 'active plan') as { id: string; valid_until: string | null }[];
  if (active[0]?.valid_until && active[0].valid_until > today && !body.force) {
    throw new HttpError(409, 'plan_locked', `Neuer Plan ab ${active[0].valid_until} möglich.`);
  }

  const days = ((profile.training_days as number[]) ?? [1, 3, 5]).slice().sort();
  const equipment = EQUIPMENT_BY_LOCATION[(profile.location as string) ?? 'gym'] ?? EQUIPMENT_BY_LOCATION.gym;
  const exercises = must(await db.from('exercises').select('id, slug, name_de, primary_muscle, secondary_muscles, equipment, ranking_type').in('equipment', equipment), 'exercises') as
    { id: string; slug: string; name_de: string; primary_muscle: Muscle; secondary_muscles: Muscle[]; equipment: string; ranking_type: string }[];
  if (exercises.length < 3) throw new HttpError(500, 'no_exercises', 'Übungskatalog ist leer – seed.sql ausführen.');
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));

  const muscles = must(await db.from('muscle_ranks').select('muscle, score').eq('user_id', user.id), 'muscle ranks') as { muscle: Muscle; score: number }[];
  const prs = new Map((must(await db.from('personal_records').select('exercise_id, best_1rm').eq('user_id', user.id), 'prs') as { exercise_id: string; best_1rm: number | null }[]).map((p) => [p.exercise_id, p.best_1rm]));

  const age = profile.birth_year ? new Date().getUTCFullYear() - Number(profile.birth_year) : null;
  const rankText = muscles.length
    ? muscles.sort((a, b) => a.score - b.score).map((m) => `${MUSCLE_NAMES[m.muscle].de}: ${rankLabel(scoreToRank(Number(m.score)))} (${m.score})`).join(', ')
    : 'noch keine Ränge';

  const system = [
    'Du bist ein erfahrener Kraft- und Athletiktrainer und erstellst Wochenpläne für die Fitness-App „Ascend“.',
    'Regeln:',
    '- Nutze ausschließlich Übungen aus der gegebenen Liste (Feld slug exakt übernehmen).',
    '- Genau ein Trainingstag pro angegebenem Wochentag, keine weiteren Tage.',
    '- 4–7 Übungen pro Tag, Grundübungen zuerst, insgesamt ausgewogen über alle Muskelgruppen pro Woche.',
    '- Schwächere Muskelgruppen (niedrige Ränge) etwas mehr Volumen geben, ohne die Balance zu verlieren.',
    '- Wiederholungsbereiche passend zum Ziel: Kraft 3–6, Muskelaufbau 6–12, Abnehmen/Fit 8–15. Anfänger: eher 2–3 Sätze, sicher und einfach.',
    '- Halte-Übungen (z. B. Unterarmstütz) mit durationS statt Wiederholungen.',
    '- Pausen: schwere Grundübungen 120–180 s, Isolation 60–90 s.',
    '- Notizen kurz, konkret und auf Deutsch.',
    '- Antworte nur über das Tool submit_plan.',
  ].join('\n');

  const userMsg = [
    `Ziel: ${GOAL_DE[(profile.goal as string) ?? 'fitness']}`,
    `Erfahrung: ${EXP_DE[(profile.experience as string) ?? 'beginner']}`,
    `Geschlecht: ${profile.gender ?? 'keine Angabe'}${age ? `, Alter: ${age}` : ''}${profile.bodyweight_kg ? `, Körpergewicht: ${profile.bodyweight_kg} kg` : ''}`,
    `Trainingstage: ${days.map((d) => `${DAY_DE[d - 1]} (${d})`).join(', ')}`,
    `Aktuelle Muskelränge (schwächste zuerst): ${rankText}`,
    '',
    'Verfügbare Übungen (slug | Name | Hauptmuskel | Equipment):',
    ...exercises.map((e) => `${e.slug} | ${e.name_de} | ${e.primary_muscle} | ${e.equipment}`),
  ].join('\n');

  // Anfrage + eine Korrekturrunde, falls die Antwort nicht passt
  let plan: Plan | null = null;
  let feedback = '';
  for (let attempt = 0; attempt < 2 && !plan; attempt++) {
    const raw = await askClaude(system, feedback ? `${userMsg}\n\nDein letzter Plan war ungültig:\n${feedback}\nBitte korrigieren.` : userMsg);
    const parsed = PlanSchema.safeParse(raw);
    if (!parsed.success) { feedback = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'); continue; }
    const errors = checkPlan(parsed.data, new Set(bySlug.keys()), days);
    if (errors.length) { feedback = errors.join('\n'); continue; }
    plan = parsed.data;
  }
  if (!plan) throw new HttpError(502, 'ai_invalid', 'Der generierte Plan war ungültig. Bitte nochmal versuchen.');

  // Speichern: alten Plan deaktivieren, neuen anlegen
  must(await db.from('training_plans').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true), 'deactivate');
  const created = must(await db.from('training_plans').insert({
    user_id: user.id, title: plan.title, source: 'ai', is_active: true, valid_until: addDays(today, 28),
    input: { goal: profile.goal, experience: profile.experience, location: profile.location, days, summary: plan.summary },
  }).select('id').single(), 'plan') as { id: string };

  for (const [i, day] of plan.days.sort((a, b) => a.weekday - b.weekday).entries()) {
    const d = must(await db.from('plan_days').insert({ plan_id: created.id, weekday: day.weekday, title: day.title, position: i }).select('id').single(), 'day') as { id: string };
    must(await db.from('plan_exercises').insert(day.exercises.map((e, pos) => {
      const ex = bySlug.get(e.slug)!;
      const oneRm = prs.get(ex.id);
      return {
        plan_day_id: d.id, exercise_id: ex.id, position: pos, sets: e.sets,
        reps_min: e.durationS ? null : e.repsMin, reps_max: e.durationS ? null : e.repsMax, duration_s: e.durationS ?? null,
        rest_s: e.restS, notes: e.notes ?? null,
        target_weight_kg: oneRm && e.repsMax && ex.ranking_type === 'weight_ratio' ? startingWeight(Number(oneRm), e.repsMax) : null,
      };
    })), 'plan exercises');
  }

  return json({ planId: created.id, validUntil: addDays(today, 28), plan });
}));
