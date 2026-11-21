// Beispieldaten für den Social-Tab ohne Konto. Deterministisch (gleiche Namen bei jedem Start).
import { bestScore, scoreToRank } from './ranking';
import { exerciseBySlug } from './standards';
import type { FeedItem, Friend, LeaderboardRow, LeagueData } from '../hooks/useSocial';

const NAMES = ['mira.lifts', 'jonas_k', 'deadlift_dana', 'tobi.fit', 'lea_moves', 'kai.strong', 'nora_iron', 'ben.benchpress', 'sophie.squats',
  'max_reps', 'emma.gains', 'luca_pr', 'hannah.flex', 'finn_power', 'ida.lifting', 'paul.press', 'clara_core', 'noah.pull', 'mia_sets',
  'elias.grind', 'lina.lifts', 'jan_power', 'zoe.strong', 'leon.reps', 'amelie_fit', 'tim.iron', 'julia.gym', 'moritz_max', 'ella.pr'];

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export function demoLeague(myXp: number): LeagueData {
  const r = rng(42);
  const others = NAMES.map((username, i) => ({ userId: `d${i}`, username, rankStep: Math.floor(r() * 14) + 3, weeklyXp: Math.round(r() * r() * 1400), isMe: false }));
  const rows = [...others, { userId: 'me', username: 'du', rankStep: 9, weeklyXp: myXp, isMe: true }]
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .map((x, i) => ({ ...x, place: i + 1 }));
  return { tier: 3, rows, demo: true };
}

export const DEMO_FRIENDS: Friend[] = [
  { id: 'd2', username: 'deadlift_dana', rankStep: 15, streak: 21, level: 18 },
  { id: 'd0', username: 'mira.lifts', rankStep: 11, streak: 6, level: 12 },
  { id: 'd3', username: 'tobi.fit', rankStep: 7, streak: 2, level: 7 },
];

export function demoFeed(): FeedItem[] {
  const h = 3600_000, now = Date.now();
  return [
    { id: 'f1', userId: 'd2', username: 'deadlift_dana', rankStep: 15, type: 'rank_up', payload: { nameDe: 'Kreuzheben', nameEn: 'Deadlift', from: 'Diamant II', to: 'Diamant III', tier: 6, division: 3 }, createdAt: new Date(now - 2 * h).toISOString(), reactions: { fire: 4, strong: 2 }, mine: [] },
    { id: 'f2', userId: 'd0', username: 'mira.lifts', rankStep: 11, type: 'pr', payload: { nameDe: 'Bankdrücken', nameEn: 'Bench Press', oneRm: 62.5 }, createdAt: new Date(now - 5 * h).toISOString(), reactions: { clap: 3 }, mine: ['clap'] },
    { id: 'f3', userId: 'd3', username: 'tobi.fit', rankStep: 7, type: 'workout', payload: { sets: 18, exercises: 5, volumeKg: 6420, durationMin: 58, xp: 230 }, createdAt: new Date(now - 26 * h).toISOString(), reactions: {}, mine: [] },
    { id: 'f4', userId: 'd2', username: 'deadlift_dana', rankStep: 15, type: 'league', payload: { result: 'promoted', position: 2, toNameDe: 'Silber', toNameEn: 'Silver' }, createdAt: new Date(now - 50 * h).toISOString(), reactions: { fire: 7 }, mine: ['fire'] },
  ];
}

export function demoLeaderboard(slug: string, bodyweightKg: number): LeaderboardRow[] {
  const ex = exerciseBySlug(slug);
  const r = rng(slug.length * 97 + 7);
  return NAMES.slice(0, 20).map((username) => {
    const ratio = ex?.rankingType === 'weight_ratio' ? 0.45 + r() * r() * 1.5 : 0;
    const reps = Math.round(2 + r() * r() * 30);
    const score = ex ? bestScore(ex, ex.rankingType === 'weight_ratio' ? [{ weightKg: ratio * bodyweightKg, reps: 1 }] : ex.rankingType === 'reps' ? [{ reps }] : [{ durationS: reps * 5 }], { gender: 'male', bodyweightKg }) ?? 0 : 0;
    const rank = scoreToRank(score);
    return { place: 0, userId: username, username, score, tier: rank.tier, division: rank.division, best1rm: ratio ? Math.round(ratio * bodyweightKg * 2) / 2 : null, bestReps: ratio ? null : reps, relativeStrength: ratio ? Math.round(ratio * 100) / 100 : null, isMe: false };
  }).sort((a, b) => b.score - a.score).map((x, i) => ({ ...x, place: i + 1 }));
}
