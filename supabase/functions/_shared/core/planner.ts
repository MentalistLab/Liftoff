// Regelbasierter Plan-Generator – kostenlos, ohne KI, deterministisch.
// Baut aus Ziel, Erfahrung, Trainingstagen, verfügbaren Übungen und den Muskelrängen
// einen Wochenplan. Schwächste Muskeln bekommen etwas mehr Volumen.

import { MUSCLE_NAMES, type Muscle } from './standards.ts';

export type Goal = 'muscle' | 'strength' | 'fat_loss' | 'fitness';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface PlannerExercise {
  slug: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: string;
  rankingType: 'weight_ratio' | 'reps' | 'time';
}

export interface PlanExercise {
  slug: string;
  sets: number;
  repsMin?: number;
  repsMax?: number;
  durationS?: number;
  restS: number;
  notes?: string;
}
export interface PlanDay { weekday: number; title: string; exercises: PlanExercise[] }
export interface GeneratedPlan { title: string; summary: string; days: PlanDay[] }

export interface PlannerInput {
  goal: Goal;
  experience: Experience;
  days: number[]; // 1 = Montag … 7 = Sonntag
  exercises: PlannerExercise[];
  muscleScores?: Partial<Record<Muscle, number>>;
}

type DayKind = 'full' | 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'core';

const TEMPLATES: Record<DayKind, { title: string; slots: Muscle[] }> = {
  full: { title: 'Ganzkörper', slots: ['legs', 'chest', 'back', 'shoulders', 'glutes', 'core', 'biceps', 'triceps'] },
  push: { title: 'Push · Brust, Schultern, Trizeps', slots: ['chest', 'shoulders', 'triceps', 'chest', 'shoulders', 'triceps', 'core'] },
  pull: { title: 'Pull · Rücken & Bizeps', slots: ['back', 'back', 'biceps', 'back', 'biceps', 'core', 'shoulders'] },
  legs: { title: 'Beine & Gesäß', slots: ['legs', 'glutes', 'legs', 'glutes', 'core', 'legs', 'core'] },
  upper: { title: 'Oberkörper', slots: ['chest', 'back', 'shoulders', 'back', 'biceps', 'triceps', 'chest'] },
  lower: { title: 'Unterkörper & Core', slots: ['legs', 'glutes', 'legs', 'core', 'glutes', 'core', 'legs'] },
  core: { title: 'Core & Erholung', slots: ['core', 'core', 'glutes', 'back', 'core'] },
};

/** Welche Tagesarten bei wie vielen Trainingstagen. */
export function splitFor(dayCount: number, experience: Experience): { name: string; kinds: DayKind[] } {
  switch (Math.max(1, Math.min(7, dayCount))) {
    case 1: return { name: 'Ganzkörper', kinds: ['full'] };
    case 2: return { name: 'Ganzkörper', kinds: ['full', 'full'] };
    case 3: return experience === 'beginner'
      ? { name: 'Ganzkörper', kinds: ['full', 'full', 'full'] }
      : { name: 'Push/Pull/Beine', kinds: ['push', 'pull', 'legs'] };
    case 4: return { name: 'Oberkörper/Unterkörper', kinds: ['upper', 'lower', 'upper', 'lower'] };
    case 5: return { name: 'Push/Pull/Beine + Ober/Unter', kinds: ['push', 'pull', 'legs', 'upper', 'lower'] };
    case 6: return { name: 'Push/Pull/Beine ×2', kinds: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] };
    default: return { name: 'Push/Pull/Beine ×2 + Core', kinds: ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'core'] };
  }
}

const EXERCISES_PER_DAY: Record<Experience, number> = { beginner: 5, intermediate: 6, advanced: 7 };
const EQUIPMENT_ORDER = ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'bodyweight'];
const GOAL_LABEL: Record<Goal, string> = { muscle: 'Muskelaufbau', strength: 'Kraft', fat_loss: 'Abnehmen', fitness: 'Fitness' };
const LETTERS = ['A', 'B', 'C', 'D'];

const isCompound = (e: PlannerExercise) => e.secondaryMuscles.length >= 1;

/** Grundübungen zuerst, Halteübungen ans Ende. */
function priority(e: PlannerExercise): number {
  if (e.rankingType === 'time') return 100;
  const eq = EQUIPMENT_ORDER.indexOf(e.equipment);
  return (isCompound(e) ? 0 : 20) - e.secondaryMuscles.length * 2 + (eq < 0 ? 6 : eq);
}

/** Die 1–2 schwächsten Muskeln (nur wenn es Ränge gibt und sie klar hinten liegen). */
export function weakestMuscles(scores: Partial<Record<Muscle, number>> = {}): Muscle[] {
  const entries = (Object.entries(scores) as [Muscle, number][]).filter(([, s]) => Number.isFinite(s));
  if (entries.length < 3) return [];
  entries.sort((a, b) => a[1] - b[1]);
  const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
  return entries.slice(0, 2).filter(([, s]) => s < avg).map(([m]) => m);
}

export function prescribe(e: PlannerExercise, goal: Goal, experience: Experience, weak: boolean, first: boolean): PlanExercise {
  const plus = weak ? 1 : 0;
  if (e.rankingType === 'time') {
    const dur = { beginner: 30, intermediate: 45, advanced: 60 }[experience];
    return { slug: e.slug, sets: 3 + plus, durationS: dur, restS: 60, notes: 'Körper gerade halten, Bauch und Po fest anspannen.' };
  }
  const compound = isCompound(e);
  let sets = experience === 'beginner' ? (compound ? 3 : 2) : experience === 'intermediate' ? 3 : (compound ? 4 : 3);
  if (goal === 'strength' && compound && experience !== 'beginner') sets += 1;
  sets = Math.min(5, sets + plus);

  let reps: [number, number];
  if (e.rankingType === 'reps') {
    reps = experience === 'beginner' ? [4, 10] : [6, 15];
  } else {
    const table: Record<Goal, [[number, number], [number, number]]> = {
      strength: [[3, 6], [6, 10]],
      muscle: [[6, 10], [8, 12]],
      fat_loss: [[10, 15], [12, 15]],
      fitness: [[8, 12], [10, 15]],
    };
    reps = table[goal][compound ? 0 : 1];
  }
  const restS = compound ? (goal === 'strength' ? 180 : goal === 'fat_loss' ? 90 : 120) : (goal === 'fat_loss' ? 60 : 75);

  let notes: string;
  if (first && e.rankingType === 'weight_ratio') notes = 'Erst 2 leichte Aufwärmsätze, dann Arbeitsgewicht.';
  else if (e.rankingType === 'reps') notes = 'Saubere Wiederholungen, 1–2 vor dem Muskelversagen aufhören.';
  else if (compound) notes = 'Kontrolliert ablassen, explosiv hochdrücken bzw. -ziehen.';
  else notes = 'Langsam ablassen (2 s), oben kurz anspannen.';
  if (weak) notes = `Schwachstelle: 1 Satz extra. ${notes}`;

  return { slug: e.slug, sets, repsMin: reps[0], repsMax: reps[1], restS, notes };
}

export function generatePlan(input: PlannerInput): GeneratedPlan {
  const days = [...new Set(input.days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (!days.length) days.push(1, 3, 5);
  const pool = [...input.exercises].sort((a, b) => priority(a) - priority(b) || a.slug.localeCompare(b.slug));
  if (pool.length < 3) throw new Error('Zu wenige Übungen für einen Plan');

  const split = splitFor(days.length, input.experience);
  const weak = weakestMuscles(input.muscleScores);
  const perDay = EXERCISES_PER_DAY[input.experience];
  const weeklyUse = new Map<string, number>();
  const use = (slug: string) => weeklyUse.get(slug) ?? 0;
  const kindCount = new Map<DayKind, number>();

  const planDays: PlanDay[] = days.map((weekday, i) => {
    const kind = split.kinds[i];
    const nth = kindCount.get(kind) ?? 0;
    kindCount.set(kind, nth + 1);
    const tpl = TEMPLATES[kind];

    // Slots: Vorlage + je 1 Extra-Slot für schwache Muskeln, die heute ohnehin dran sind
    const slots = tpl.slots.slice(0, perDay);
    for (const m of weak) if (slots.includes(m) && slots.length < perDay + 1) slots.push(m);

    const chosen: PlannerExercise[] = [];
    const pick = (cands: PlannerExercise[]) => {
      const free = cands.filter((c) => !chosen.includes(c));
      if (!free.length) return;
      // Wenig genutzte Übungen bevorzugen → Abwechslung zwischen Tag A und B
      free.sort((a, b) => use(a.slug) - use(b.slug) || priority(a) - priority(b) || a.slug.localeCompare(b.slug));
      chosen.push(free[0]);
    };
    for (const m of slots) {
      const primary = pool.filter((e) => e.primaryMuscle === m);
      if (primary.some((e) => !chosen.includes(e))) pick(primary);
      // Ausweichen auf Übungen, die den Muskel mittrainieren – aber keine, die diese Woche schon dran war
      else pick(pool.filter((e) => e.secondaryMuscles.includes(m) && use(e.slug) === 0));
    }
    // Mindestens 3 Übungen, notfalls mit beliebigen auffüllen
    while (chosen.length < Math.min(3, pool.length)) pick(pool);

    chosen.sort((a, b) => priority(a) - priority(b));
    for (const e of chosen) weeklyUse.set(e.slug, use(e.slug) + 1);

    const sameKind = split.kinds.filter((k) => k === kind).length;
    const suffix = sameKind > 1 ? ` ${LETTERS[nth] ?? nth + 1}` : '';
    return {
      weekday,
      title: `${tpl.title}${suffix}`.slice(0, 40),
      exercises: chosen.map((e, pos) => prescribe(e, input.goal, input.experience, weak.includes(e.primaryMuscle), pos === 0)),
    };
  });

  const weakText = weak.length
    ? ` Extra-Volumen für ${weak.map((m) => MUSCLE_NAMES[m].de).join(' und ')} – dort liegen deine Ränge gerade hinten.`
    : '';
  return {
    title: `${GOAL_LABEL[input.goal]} · ${split.name}`.slice(0, 60),
    summary: `${days.length} ${days.length === 1 ? 'Tag' : 'Tage'} pro Woche im ${split.name}-Split. Grundübungen zuerst, danach Ergänzungsübungen.${weakText} Steigere das Gewicht, sobald du alle Sätze am oberen Ende des Bereichs schaffst.`.slice(0, 500),
    days: planDays,
  };
}
