\set ON_ERROR_STOP 1
-- Testdaten als Superuser
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'a@x', '{"username":"anna_lifts","language":"de"}'),
 ('00000000-0000-0000-0000-00000000000b', 'b@x', '{"username":"Ben"}'),
 ('00000000-0000-0000-0000-00000000000c', 'c@x', '{"username":"x"}'),
 ('00000000-0000-0000-0000-00000000000d', 'd@x', '{"username":"anna_lifts"}');
select username from profiles order by id;
insert into exercises (slug, name_de, name_en, primary_muscle, equipment, ranking_type, standards)
values ('bench_press','Bankdrücken','Bench Press','chest','barbell','weight_ratio','{"male":[0.5,0.75,1,1.5,2],"female":[0.25,0.5,0.75,1,1.5]}');
update profiles set gender='male', bodyweight_kg=80 where true;
update profiles set is_private = true where id = '00000000-0000-0000-0000-00000000000c';

create or replace function pg_temp.expect_error(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then raise notice 'OK (blockiert): % → %', label, sqlerrm; return; end;
  raise exception 'FEHLER: % wurde NICHT blockiert', label;
end $$;
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin if not ok then raise exception 'FEHLER: %', label; end if; raise notice 'OK: %', label; end $$;

-- Als Nutzer A
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.check((select count(*) from profiles) = 1, 'A sieht nur das eigene Profil');
update profiles set display_name = 'Anna', bodyweight_kg = 62 where id = auth.uid();
select pg_temp.expect_error('update profiles set xp = 99999 where id = auth.uid()', 'A setzt eigene XP');
with x as (update profiles set display_name='hack' where id='00000000-0000-0000-0000-00000000000b' returning 1) select pg_temp.check((select count(*) from x) = 0, 'A kann B nicht ändern');
insert into workouts (id, started_at) values ('10000000-0000-0000-0000-000000000001', now());
insert into workout_sets (workout_id, exercise_id, set_index, weight_kg, reps) select '10000000-0000-0000-0000-000000000001', id, 0, 80, 5 from exercises;
select pg_temp.expect_error($q$insert into workouts (id, user_id) values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000b')$q$, 'A legt Workout für B an');
select pg_temp.expect_error($q$insert into exercise_ranks values (auth.uid(), (select id from exercises), 100, 8, 3, 23, 99)$q$, 'A schreibt eigenen Rang');
select pg_temp.expect_error($q$insert into xp_events (user_id, amount, reason) values (auth.uid(), 1000, 'adjustment')$q$, 'A bucht XP');
select pg_temp.expect_error($q$update workout_sets set estimated_1rm = 500$q$, 'A setzt 1RM');
insert into friendships (requester_id, addressee_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000b');
with x as (update friendships set status='accepted' where requester_id=auth.uid() returning 1) select pg_temp.check((select count(*) from x) = 0, 'A kann eigene Anfrage nicht selbst annehmen');
select pg_temp.check((select visible from get_public_profile('00000000-0000-0000-0000-00000000000c')) = false, 'privates Profil C ist für A gesperrt');
select pg_temp.check((select level from get_public_profile('00000000-0000-0000-0000-00000000000c')) is null, 'privates Profil zeigt kein Level');
select pg_temp.check((select count(*) from search_users('be')) = 1, 'Suche findet Ben');
select pg_temp.check(username_available('neuer_name') and not username_available('ben'), 'Benutzername prüfen');

-- Als B
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check((select count(*) from workouts) = 0, 'B sieht As Workouts nicht');
select pg_temp.check((select count(*) from workout_sets) = 0, 'B sieht As Sätze nicht');
update friendships set status = 'accepted' where addressee_id = auth.uid();
select pg_temp.check((select count(*) from get_friends()) = 1, 'B hat A als Freund');

-- Server (service_role) bucht XP, Ränge, Feed
reset role;
set role service_role;
update workouts set finalized_at = now(), total_volume = 400 where id = '10000000-0000-0000-0000-000000000001';
insert into exercise_ranks select '00000000-0000-0000-0000-00000000000a', id, 61.2, 5, 1, 14, 70 from exercises;
insert into exercise_ranks select '00000000-0000-0000-0000-00000000000c', id, 90, 8, 1, 21, 99 from exercises;
insert into xp_events (user_id, amount, reason) values ('00000000-0000-0000-0000-00000000000a', 260, 'workout'), ('00000000-0000-0000-0000-00000000000b', 120, 'workout');
insert into feed_events (user_id, type, payload) values ('00000000-0000-0000-0000-00000000000a', 'pr', '{"exercise":"bench_press"}');
reset role;
select pg_temp.check((select xp from profiles where username='anna_lifts') = 260, 'XP-Trigger bucht Profil-XP');
select pg_temp.check((select count(*) from league_members) = 2 and (select count(*) from leagues) = 1, 'beide landen in derselben Ligagruppe');

-- Als A: Liga, Leaderboard, Workout gesperrt
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.check((select weekly_xp from get_my_league() where is_me) = 260 and (select place from get_my_league() where is_me) = 1, 'A ist Platz 1 mit 260 Wochen-XP');
select pg_temp.check((select count(*) from get_leaderboard('bench_press')) = 1, 'Leaderboard ohne privates Profil C');
select pg_temp.check((select count(*) from get_leaderboard('bench_press', '74–83 kg')) = 0, 'Gewichtsklassen-Filter (A wiegt jetzt 62 kg)');
with x as (update workout_sets set reps = 20 returning 1) select pg_temp.check((select count(*) from x) = 0, 'abgeschlossenes Workout ist gesperrt');
select pg_temp.check((select count(*) from exercise_ranks) = 1, 'A sieht eigene Ränge, nicht die des privaten C');

-- Als B: Feed und Reaktion
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check((select count(*) from get_feed()) = 1, 'B sieht As PR im Feed');
insert into feed_reactions (event_id, reaction) select id, 'fire' from feed_events;
select pg_temp.check((select (reactions ->> 'fire')::int from get_feed()) = 1, 'Reaktion wird gezählt');
select pg_temp.check((select count(*) from exercise_ranks) = 1, 'B sieht As Ränge (öffentlich), nicht Cs');

-- Als C (Fremder): kein Feed von A
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.check((select count(*) from get_feed()) = 0, 'Fremde sehen den Feed nicht');
select pg_temp.check((select count(*) from feed_events) = 0, 'Fremde sehen keine Feed-Zeilen');

-- Anonym
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.check((select count(*) from exercises) = 1, 'Übungskatalog öffentlich');
select pg_temp.expect_error('select count(*) from profiles', 'anon liest Profile');
reset role;
select 'ALLE RLS-TESTS OK';
