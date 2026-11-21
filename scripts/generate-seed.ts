// Erzeugt supabase/seed.sql aus den TypeScript-Definitionen (eine Quelle der Wahrheit).
// Aufruf: npm run seed:generate
import { writeFileSync } from 'node:fs';
import { ALL_EXERCISES } from '../supabase/functions/_shared/core/catalog.ts';
import { BADGES } from '../supabase/functions/_shared/core/badges.ts';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lines: string[] = ['-- Automatisch erzeugt von scripts/generate-seed.ts – nicht von Hand ändern.', ''];

lines.push('insert into public.exercises (slug, name_de, name_en, primary_muscle, secondary_muscles, equipment, is_bodyweight, ranking_type, standards) values');
lines.push(ALL_EXERCISES.map((e) =>
  `  (${q(e.slug)}, ${q(e.nameDe)}, ${q(e.nameEn)}, ${q(e.primaryMuscle)}, ${q('{' + e.secondaryMuscles.join(',') + '}')}, ${q(e.equipment)}, ${e.equipment === 'bodyweight'}, ${q(e.rankingType)}, ${q(JSON.stringify(e.standards))})`,
).join(',\n'));
lines.push('on conflict (slug) do update set name_de = excluded.name_de, name_en = excluded.name_en, primary_muscle = excluded.primary_muscle,');
lines.push('  secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, is_bodyweight = excluded.is_bodyweight,');
lines.push('  ranking_type = excluded.ranking_type, standards = excluded.standards;', '');

lines.push('insert into public.badges (id, category, name_de, name_en, desc_de, desc_en, sort) values');
lines.push(BADGES.map((b, i) => `  (${q(b.id)}, ${q(b.category)}, ${q(b.nameDe)}, ${q(b.nameEn)}, ${q(b.descDe)}, ${q(b.descEn)}, ${i})`).join(',\n'));
lines.push('on conflict (id) do update set category = excluded.category, name_de = excluded.name_de, name_en = excluded.name_en,');
lines.push('  desc_de = excluded.desc_de, desc_en = excluded.desc_en, sort = excluded.sort;', '');

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), lines.join('\n'));
console.log(`seed.sql: ${ALL_EXERCISES.length} Übungen, ${BADGES.length} Abzeichen`);
