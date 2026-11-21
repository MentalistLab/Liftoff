-- Demo-Nutzer für Bestenlisten und Ligen (optional, z. B. für Screenshots oder eine Testphase).
-- Einspielen: Supabase-Dashboard → SQL Editor → Inhalt einfügen → Run.
-- Entfernen:  delete from auth.users where email like '%@demo.ascend.local';  (alles andere fällt per Cascade weg)
-- Die Konten haben kein Passwort und können sich nicht anmelden.

with names(username, gender, bw, lvl) as (values
  ('mira.lifts','female',62,0.62),('jonas_k','male',81,0.55),('deadlift_dana','female',68,0.81),('tobi.fit','male',77,0.38),
  ('lea_moves','female',58,0.47),('kai.strong','male',92,0.86),('nora_iron','female',64,0.58),('ben.bench','male',85,0.66),
  ('sophie.squats','female',61,0.71),('max_reps','male',74,0.44),('emma.gains','female',66,0.35),('luca_pr','male',88,0.74),
  ('hannah.flex','female',59,0.52),('finn_power','male',95,0.79),('ida.lifting','female',70,0.63),('paul.press','male',79,0.49),
  ('clara_core','female',63,0.41),('noah.pull','male',72,0.68),('mia_sets','female',57,0.3),('elias.grind','male',83,0.57)
), users as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', n.username || '@demo.ascend.local', '',
    '{"provider":"email","providers":["email"]}', jsonb_build_object('username', n.username, 'language', 'de'), now(), now()
  from names n
  returning id, raw_user_meta_data ->> 'username' as username
)
update public.profiles p set gender = n.gender, bodyweight_kg = n.bw, birth_year = 1995, country = 'DE',
  overall_score = round((n.lvl * 100)::numeric, 1), overall_rank = least(23, floor(n.lvl * 24)::int),
  xp = (n.lvl * 6000)::int, level = 1 + floor(n.lvl * 20)::int, current_streak = floor(n.lvl * 25)::int, longest_streak = floor(n.lvl * 40)::int
from users u join names n on n.username = u.username
where p.id = u.id;

-- Übungsränge (Score schwankt pro Übung um das Grundniveau)
insert into public.exercise_ranks (user_id, exercise_id, score, tier, division, step, percentile)
select p.id, x.id, s.score, floor(least(23, floor(s.score * 24 / 100)) / 3)::int + 1, (least(23, floor(s.score * 24 / 100))::int % 3) + 1,
  least(23, floor(s.score * 24 / 100))::int, least(99, greatest(1, s.score::int))
from public.profiles p
join public.exercises x on x.slug in ('bench_press', 'back_squat', 'deadlift', 'overhead_press', 'pull_up', 'push_up', 'barbell_row', 'hip_thrust')
cross join lateral (select round(greatest(5, least(99, p.overall_score + (random() - 0.5) * 24))::numeric, 1) as score) s
where p.id in (select id from auth.users where email like '%@demo.ascend.local')
on conflict do nothing;

insert into public.personal_records (user_id, exercise_id, best_1rm, best_score)
select r.user_id, r.exercise_id, round((p.bodyweight_kg * (0.5 + r.score / 50))::numeric, 1), r.score
from public.exercise_ranks r join public.profiles p on p.id = r.user_id join public.exercises x on x.id = r.exercise_id
where x.ranking_type = 'weight_ratio' and p.id in (select id from auth.users where email like '%@demo.ascend.local')
on conflict do nothing;
