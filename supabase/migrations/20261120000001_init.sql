-- Ascend – Grundschema
-- Prinzip: Nutzer schreiben nur Rohdaten (Workouts, Sätze, Profil-Einstellungen).
-- Alles, was man fälschen könnte (XP, Ränge, PRs, Streaks, Liga), schreibt nur der
-- Server (Edge Functions mit Service-Role). Öffentliche Daten laufen über RPCs,
-- die nur unkritische Felder herausgeben.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Hilfsfunktionen ─────────────────────────

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Montag der aktuellen Ligawoche (Europe/Berlin)
create or replace function public.current_league_week() returns date
language sql stable as $$
  select date_trunc('week', now() at time zone 'Europe/Berlin')::date
$$;

-- Gewichtsklasse – identisch zu weightClass() in core/ranking.ts
create or replace function public.weight_class(p_gender text, p_bw numeric) returns text
language plpgsql immutable as $$
declare
  c int[] := case when p_gender = 'female' then array[47,52,57,63,69,76,84] else array[59,66,74,83,93,105,120] end;
  i int;
begin
  if p_bw is null then return null; end if;
  if p_bw <= c[1] then return '≤' || c[1] || ' kg'; end if;
  for i in 2..array_length(c, 1) loop
    if p_bw <= c[i] then return c[i-1] || '–' || c[i] || ' kg'; end if;
  end loop;
  return c[array_length(c, 1)] || '+ kg';
end $$;

-- ───────────────────────── Profile ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  gender text not null default 'none' check (gender in ('male', 'female', 'none')),
  birth_year smallint check (birth_year between 1900 and 2100),
  bodyweight_kg numeric(5, 1) check (bodyweight_kg between 25 and 400),
  height_cm numeric(5, 1) check (height_cm between 80 and 260),
  experience text check (experience in ('beginner', 'intermediate', 'advanced')),
  goal text check (goal in ('muscle', 'strength', 'fat_loss', 'fitness')),
  location text check (location in ('gym', 'home_dumbbells', 'bodyweight')),
  training_days smallint[] not null default '{1,3,5}' check (training_days <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(training_days) between 1 and 7),
  timezone text not null default 'Europe/Berlin',
  country text check (country ~ '^[A-Z]{2}$'),
  language text not null default 'de' check (language in ('de', 'en')),
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  is_private boolean not null default false,
  push_token text,
  -- nur der Server schreibt die folgenden Spalten
  xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  streak_freezes smallint not null default 0,
  last_trained_date date,
  streak_evaluated_date date,
  overall_score numeric(5, 1),
  overall_rank smallint check (overall_rank between 0 and 23),
  league_tier smallint not null default 1 check (league_tier between 1 and 10),
  best_league_tier smallint not null default 1,
  league_promotions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_.]{3,20}$')
);
create unique index profiles_username_key on public.profiles (lower(username));
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Profil beim Registrieren anlegen. Benutzername kommt aus den Metadaten (Onboarding),
-- sonst ein Platzhalter, den der Nutzer später ändert.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if wanted !~ '^[a-z0-9_.]{3,20}$' or exists (select 1 from public.profiles where lower(username) = wanted) then
    wanted := 'user_' || substr(md5(new.id::text), 1, 12);
    while exists (select 1 from public.profiles where lower(username) = wanted) loop
      wanted := 'user_' || substr(md5(random()::text), 1, 12);
    end loop;
  end if;
  insert into public.profiles (id, username, display_name, language)
  values (
    new.id,
    wanted,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case when new.raw_user_meta_data ->> 'language' = 'en' then 'en' else 'de' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ───────────────────────── Übungen ─────────────────────────

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_de text not null,
  name_en text not null,
  primary_muscle text not null check (primary_muscle in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core')),
  secondary_muscles text[] not null default '{}',
  equipment text not null check (equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell')),
  is_bodyweight boolean not null default false,
  ranking_type text not null check (ranking_type in ('weight_ratio', 'reps', 'time')),
  -- {"male":[5 Schwellen],"female":[5 Schwellen]}
  standards jsonb not null check (jsonb_array_length(standards -> 'male') = 5 and jsonb_array_length(standards -> 'female') = 5),
  is_ranked boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Trainingspläne ─────────────────────────

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  source text not null default 'ai' check (source in ('ai', 'manual')),
  input jsonb,
  is_active boolean not null default true,
  valid_until date,
  created_at timestamptz not null default now()
);
create index on public.training_plans (user_id, created_at desc);
create unique index training_plans_one_active on public.training_plans (user_id) where is_active;

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  title text not null,
  position smallint not null default 0
);
create index on public.plan_days (plan_id);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position smallint not null default 0,
  sets smallint not null check (sets between 1 and 10),
  reps_min smallint check (reps_min between 1 and 100),
  reps_max smallint check (reps_max between 1 and 100),
  duration_s integer check (duration_s between 5 and 3600),
  rest_s integer not null default 90 check (rest_s between 0 and 600),
  target_weight_kg numeric(6, 2),
  notes text
);
create index on public.plan_exercises (plan_day_id);

-- ───────────────────────── Workouts ─────────────────────────

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id uuid,                -- für Offline-Sync (idempotent)
  plan_day_id uuid references public.plan_days (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  -- vom Server gesetzt
  total_volume numeric(10, 1) not null default 0,
  xp_earned integer,
  finalized_at timestamptz,
  unique (user_id, client_id)
);
create index on public.workouts (user_id, started_at desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_index smallint not null check (set_index between 0 and 99),
  weight_kg numeric(6, 2) check (weight_kg between -200 and 1000),
  reps smallint check (reps between 0 and 500),
  duration_s integer check (duration_s between 0 and 36000),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  is_warmup boolean not null default false,
  completed boolean not null default true,
  estimated_1rm numeric(7, 2),   -- vom Server gesetzt
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_id, set_index)
);
create index on public.workout_sets (workout_id);
create index on public.workout_sets (exercise_id);

-- ───────────────────────── Bestwerte und Ränge (nur Server schreibt) ─────────────────────────

create table public.personal_records (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  best_1rm numeric(7, 2),
  best_reps smallint,
  best_duration_s integer,
  best_score numeric(5, 1),
  achieved_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table public.exercise_ranks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  score numeric(5, 1) not null check (score between 0 and 100),
  tier smallint not null check (tier between 1 and 8),
  division smallint not null check (division between 1 and 3),
  step smallint not null check (step between 0 and 23),
  percentile smallint check (percentile between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index on public.exercise_ranks (exercise_id, score desc);

create table public.muscle_ranks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  muscle text not null check (muscle in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core')),
  score numeric(5, 1) not null check (score between 0 and 100),
  tier smallint not null check (tier between 1 and 8),
  division smallint not null check (division between 1 and 3),
  step smallint not null check (step between 0 and 23),
  percentile smallint check (percentile between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, muscle)
);

-- ───────────────────────── Social ─────────────────────────

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_key on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index on public.friendships (addressee_id);

create table public.feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('workout', 'pr', 'rank_up', 'badge', 'league')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.feed_events (user_id, created_at desc);

create table public.feed_reactions (
  event_id uuid not null references public.feed_events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('fire', 'strong', 'clap')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id, reaction)
);

-- ───────────────────────── Ligen ─────────────────────────

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  tier smallint not null check (tier between 1 and 10),
  week_start date not null,
  group_no smallint not null,
  closed_at timestamptz,
  unique (tier, week_start, group_no)
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  weekly_xp integer not null default 0,
  final_position smallint,
  result text check (result in ('promoted', 'stayed', 'demoted')),
  result_seen boolean not null default false,
  primary key (league_id, user_id),
  unique (user_id, week_start)
);
create index on public.league_members (league_id, weekly_xp desc);

-- ───────────────────────── Abzeichen und XP ─────────────────────────

create table public.badges (
  id text primary key,
  category text not null,
  name_de text not null,
  name_en text not null,
  desc_de text not null,
  desc_en text not null,
  sort smallint not null default 0
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id),
  earned_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (user_id, badge_id)
);

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('workout', 'set', 'pr', 'rank_up', 'badge', 'adjustment')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index on public.xp_events (user_id, created_at desc);

-- ───────────────────────── Sichtbarkeit ─────────────────────────

create or replace function public.is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  )
$$;

-- Ränge, PRs, Abzeichen: selbst, Freunde, oder alle bei öffentlichem Profil.
create or replace function public.can_view_profile(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or exists (select 1 from public.profiles p where p.id = target and not p.is_private)
      or public.is_friend(auth.uid(), target)
$$;

-- Feed: nur selbst und Freunde.
create or replace function public.can_view_feed(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = auth.uid() or public.is_friend(auth.uid(), target)
$$;

create or replace function public.is_league_member(p_league uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.league_members m where m.league_id = p_league and m.user_id = auth.uid())
$$;

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.training_plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.exercise_ranks enable row level security;
alter table public.muscle_ranks enable row level security;
alter table public.friendships enable row level security;
alter table public.feed_events enable row level security;
alter table public.feed_reactions enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.xp_events enable row level security;

-- Profile: volles Profil (inkl. Körperdaten) sieht nur man selbst.
-- Andere Nutzer gehen über get_public_profile() & Co.
create policy "profil lesen: selbst" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profil ändern: selbst" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, gender, birth_year, bodyweight_kg, height_cm, experience, goal, location,
  training_days, timezone, country, language, unit_system, is_private, push_token) on public.profiles to authenticated;

-- Übungen und Abzeichen-Katalog: für alle lesbar
create policy "übungen lesen" on public.exercises for select to anon, authenticated using (true);
create policy "abzeichen lesen" on public.badges for select to anon, authenticated using (true);
revoke insert, update, delete on public.exercises, public.badges from anon, authenticated;

-- Trainingspläne: Eigentümer; Pläne selbst legt der Server an
create policy "plan lesen" on public.training_plans for select to authenticated using (user_id = auth.uid());
create policy "plan ändern" on public.training_plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plan löschen" on public.training_plans for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.training_plans from anon, authenticated;
grant update (title, is_active) on public.training_plans to authenticated;

create policy "plantage: eigentümer" on public.plan_days for all to authenticated
  using (exists (select 1 from public.training_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.training_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "planübungen: eigentümer" on public.plan_exercises for all to authenticated
  using (exists (select 1 from public.plan_days d join public.training_plans p on p.id = d.plan_id where d.id = plan_day_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.plan_days d join public.training_plans p on p.id = d.plan_id where d.id = plan_day_id and p.user_id = auth.uid()));

-- Workouts: Eigentümer; nach dem Abschluss (finalized_at) nicht mehr änderbar
create policy "workout lesen" on public.workouts for select to authenticated using (user_id = auth.uid());
create policy "workout anlegen" on public.workouts for insert to authenticated with check (user_id = auth.uid());
create policy "workout ändern" on public.workouts for update to authenticated using (user_id = auth.uid() and finalized_at is null) with check (user_id = auth.uid());
create policy "workout löschen" on public.workouts for delete to authenticated using (user_id = auth.uid() and finalized_at is null);
revoke insert, update on public.workouts from anon, authenticated;
grant insert (id, client_id, plan_day_id, started_at, ended_at, notes) on public.workouts to authenticated;
grant update (plan_day_id, started_at, ended_at, notes) on public.workouts to authenticated;

create policy "sätze lesen" on public.workout_sets for select to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "sätze schreiben" on public.workout_sets for insert to authenticated
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid() and w.finalized_at is null));
create policy "sätze ändern" on public.workout_sets for update to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid() and w.finalized_at is null));
create policy "sätze löschen" on public.workout_sets for delete to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid() and w.finalized_at is null));
revoke insert, update on public.workout_sets from anon, authenticated;
grant insert (id, workout_id, exercise_id, set_index, weight_kg, reps, duration_s, rpe, is_warmup, completed) on public.workout_sets to authenticated;
grant update (weight_kg, reps, duration_s, rpe, is_warmup, completed) on public.workout_sets to authenticated;

-- Server-Tabellen: Lesen je nach Sichtbarkeit, Schreiben nur Service-Role
create policy "prs lesen" on public.personal_records for select to authenticated using (public.can_view_profile(user_id));
create policy "übungsränge lesen" on public.exercise_ranks for select to authenticated using (public.can_view_profile(user_id));
create policy "muskelränge lesen" on public.muscle_ranks for select to authenticated using (public.can_view_profile(user_id));
create policy "abzeichen-wand lesen" on public.user_badges for select to authenticated using (public.can_view_profile(user_id));
create policy "abzeichen gesehen" on public.user_badges for update to authenticated using (user_id = auth.uid());
create policy "xp lesen" on public.xp_events for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.personal_records, public.exercise_ranks, public.muscle_ranks, public.user_badges, public.xp_events from anon, authenticated;
grant update (seen) on public.user_badges to authenticated;

-- Freundschaften
create policy "freundschaft lesen" on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy "anfrage senden" on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
-- Annehmen oder blockieren kann nur, wer die Anfrage bekommen hat. Zurückziehen = löschen.
create policy "anfrage beantworten" on public.friendships for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid() and status in ('accepted', 'blocked'));
create policy "freundschaft beenden" on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
revoke insert, update on public.friendships from anon, authenticated;
grant insert (requester_id, addressee_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

create or replace function public.friendships_responded() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then new.responded_at = now(); end if;
  return new;
end $$;
create trigger friendships_responded before update on public.friendships for each row execute function public.friendships_responded();

-- Feed
create policy "feed lesen" on public.feed_events for select to authenticated using (public.can_view_feed(user_id));
revoke insert, update, delete on public.feed_events from anon, authenticated;

create policy "reaktion lesen" on public.feed_reactions for select to authenticated
  using (exists (select 1 from public.feed_events e where e.id = event_id and public.can_view_feed(e.user_id)));
create policy "reaktion geben" on public.feed_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.feed_events e where e.id = event_id and public.can_view_feed(e.user_id)));
create policy "reaktion zurücknehmen" on public.feed_reactions for delete to authenticated using (user_id = auth.uid());
revoke update on public.feed_reactions from anon, authenticated;

-- Ligen: eigene Gruppe sichtbar (Namen kommen über get_my_league)
create policy "liga lesen" on public.leagues for select to authenticated using (public.is_league_member(id));
create policy "ligamitglieder lesen" on public.league_members for select to authenticated using (public.is_league_member(league_id));
create policy "ligaergebnis gesehen" on public.league_members for update to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.leagues, public.league_members from anon, authenticated;
grant update (result_seen) on public.league_members to authenticated;

-- ───────────────────────── Liga-Mitgliedschaft und XP-Buchung ─────────────────────────

-- Steckt einen Nutzer in eine Gruppe seiner Stufe für die laufende Woche (falls noch nicht drin).
create or replace function public.ensure_league_membership(p_user uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  wk date := public.current_league_week();
  v_tier smallint;
  v_league uuid;
begin
  select league_id into v_league from public.league_members where user_id = p_user and week_start = wk;
  if v_league is not null then return v_league; end if;

  select league_tier into v_tier from public.profiles where id = p_user;
  if v_tier is null then return null; end if;

  perform pg_advisory_xact_lock(hashtext('league:' || v_tier || ':' || wk));

  select l.id into v_league
  from public.leagues l
  left join public.league_members m on m.league_id = l.id
  where l.tier = v_tier and l.week_start = wk and l.closed_at is null
  group by l.id
  having count(m.user_id) < 30
  order by count(m.user_id) asc
  limit 1;

  if v_league is null then
    insert into public.leagues (tier, week_start, group_no)
    values (v_tier, wk, coalesce((select max(group_no) from public.leagues where tier = v_tier and week_start = wk), 0) + 1)
    returning id into v_league;
  end if;

  insert into public.league_members (league_id, user_id, week_start) values (v_league, p_user, wk)
  on conflict (user_id, week_start) do nothing;
  return v_league;
end $$;

-- Jede XP-Buchung erhöht Gesamt-XP und Wochen-XP der Liga.
create or replace function public.apply_xp_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set xp = xp + new.amount where id = new.user_id;
  perform public.ensure_league_membership(new.user_id);
  update public.league_members set weekly_xp = weekly_xp + new.amount
  where user_id = new.user_id and week_start = public.current_league_week();
  return new;
end $$;
create trigger xp_events_apply after insert on public.xp_events for each row execute function public.apply_xp_event();

-- Kennzahlen für Abzeichen (nur Server)
create or replace function public.get_badge_stats(p_user uuid)
returns table (workouts bigint, sets_total bigint, total_volume_kg numeric, longest_streak integer, max_weight_kg numeric, prs bigint,
  rank_ups bigint, highest_tier smallint, friends bigint, league_promotions integer, best_league_tier smallint, reactions_given bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.workouts w where w.user_id = p_user and w.finalized_at is not null),
    (select count(*) from public.workout_sets s join public.workouts w on w.id = s.workout_id
      where w.user_id = p_user and w.finalized_at is not null and s.completed and not s.is_warmup),
    (select coalesce(sum(w.total_volume), 0) from public.workouts w where w.user_id = p_user and w.finalized_at is not null),
    p.longest_streak,
    (select coalesce(max(s.weight_kg), 0) from public.workout_sets s join public.workouts w on w.id = s.workout_id
      join public.exercises x on x.id = s.exercise_id
      where w.user_id = p_user and w.finalized_at is not null and s.completed and not x.is_bodyweight),
    (select count(*) from public.feed_events e where e.user_id = p_user and e.type = 'pr'),
    (select count(*) from public.feed_events e where e.user_id = p_user and e.type = 'rank_up'),
    (select coalesce(max(r.tier), 0)::smallint from public.exercise_ranks r where r.user_id = p_user),
    (select count(*) from public.friendships f where f.status = 'accepted' and p_user in (f.requester_id, f.addressee_id)),
    p.league_promotions,
    p.best_league_tier,
    (select count(*) from public.feed_reactions r where r.user_id = p_user)
  from public.profiles p where p.id = p_user
$$;
revoke execute on function public.get_badge_stats(uuid) from public, anon, authenticated;
grant execute on function public.get_badge_stats(uuid) to service_role;

revoke execute on function public.ensure_league_membership(uuid) from public, anon, authenticated;
grant execute on function public.ensure_league_membership(uuid) to service_role;

-- ───────────────────────── RPCs für die App ─────────────────────────

-- Öffentliches Profil (ohne Körperdaten). Bei privaten Profilen ohne Freundschaft nur Name & Avatar.
create or replace function public.get_public_profile(p_user uuid)
returns table (id uuid, username text, display_name text, avatar_url text, is_private boolean, is_friend boolean, visible boolean,
  level integer, xp integer, overall_score numeric, overall_rank smallint, current_streak integer, longest_streak integer, league_tier smallint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.is_private,
    public.is_friend(auth.uid(), p.id),
    public.can_view_profile(p.id),
    case when public.can_view_profile(p.id) then p.level end,
    case when public.can_view_profile(p.id) then p.xp end,
    case when public.can_view_profile(p.id) then p.overall_score end,
    case when public.can_view_profile(p.id) then p.overall_rank end,
    case when public.can_view_profile(p.id) then p.current_streak end,
    case when public.can_view_profile(p.id) then p.longest_streak end,
    case when public.can_view_profile(p.id) then p.league_tier end
  from public.profiles p where p.id = p_user and auth.uid() is not null
$$;

-- Nutzersuche nach Benutzername (für „Freund hinzufügen“)
create or replace function public.search_users(p_query text)
returns table (id uuid, username text, display_name text, avatar_url text, overall_rank smallint, friendship_status text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    case when public.can_view_profile(p.id) then p.overall_rank end,
    (select f.status from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = p.id) or (f.requester_id = p.id and f.addressee_id = auth.uid()))
  from public.profiles p
  where auth.uid() is not null and p.id <> auth.uid() and length(trim(p_query)) >= 2
    and lower(p.username) like lower(replace(replace(trim(p_query), '%', ''), '_', '\_')) || '%'
  order by length(p.username), p.username
  limit 20
$$;

-- Freundesliste mit Rang und Streak
create or replace function public.get_friends()
returns table (id uuid, username text, display_name text, avatar_url text, overall_rank smallint, overall_score numeric, current_streak integer, level integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.overall_rank, p.overall_score, p.current_streak, p.level
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  order by p.overall_score desc nulls last
$$;

-- Feed von mir und meinen Freunden, mit Reaktionen
create or replace function public.get_feed(p_limit int default 30, p_before timestamptz default null)
returns table (id uuid, user_id uuid, username text, avatar_url text, overall_rank smallint, type text, payload jsonb, created_at timestamptz,
  reactions jsonb, my_reactions text[])
language sql stable security definer set search_path = public as $$
  select e.id, e.user_id, p.username, p.avatar_url, p.overall_rank, e.type, e.payload, e.created_at,
    coalesce((select jsonb_object_agg(r.reaction, r.n) from (select reaction, count(*) n from public.feed_reactions where event_id = e.id group by reaction) r), '{}'::jsonb),
    coalesce((select array_agg(reaction) from public.feed_reactions where event_id = e.id and user_id = auth.uid()), '{}')
  from public.feed_events e
  join public.profiles p on p.id = e.user_id
  where public.can_view_feed(e.user_id) and (p_before is null or e.created_at < p_before)
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

-- Meine Ligagruppe der laufenden Woche, sortiert nach Wochen-XP
create or replace function public.get_my_league()
returns table (league_id uuid, tier smallint, week_start date, place bigint, user_id uuid, username text, avatar_url text,
  overall_rank smallint, weekly_xp integer, is_me boolean)
language sql stable security definer set search_path = public as $$
  with mine as (
    select m.league_id from public.league_members m
    where m.user_id = auth.uid() and m.week_start = public.current_league_week()
  )
  select l.id, l.tier, l.week_start,
    row_number() over (order by m.weekly_xp desc, m.user_id),
    m.user_id, p.username, p.avatar_url, p.overall_rank, m.weekly_xp, m.user_id = auth.uid()
  from mine
  join public.leagues l on l.id = mine.league_id
  join public.league_members m on m.league_id = l.id
  join public.profiles p on p.id = m.user_id
  order by m.weekly_xp desc, m.user_id
$$;

-- Bestenliste pro Übung, optional nach Gewichtsklasse und Land. Private Profile tauchen nicht auf.
create or replace function public.get_leaderboard(p_exercise_slug text, p_weight_class text default null, p_country text default null, p_limit int default 50)
returns table (place bigint, user_id uuid, username text, avatar_url text, score numeric, tier smallint, division smallint,
  best_1rm numeric, best_reps smallint, relative_strength numeric, is_me boolean)
language sql stable security definer set search_path = public as $$
  select row_number() over (order by r.score desc, pr.best_1rm desc nulls last, r.user_id),
    r.user_id, p.username, p.avatar_url, r.score, r.tier, r.division, pr.best_1rm, pr.best_reps,
    case when pr.best_1rm is not null and p.bodyweight_kg > 0 then round(pr.best_1rm / p.bodyweight_kg, 2) end,
    r.user_id = auth.uid()
  from public.exercise_ranks r
  join public.exercises x on x.id = r.exercise_id and x.slug = p_exercise_slug
  join public.profiles p on p.id = r.user_id
  left join public.personal_records pr on pr.user_id = r.user_id and pr.exercise_id = r.exercise_id
  where auth.uid() is not null
    and (not p.is_private or r.user_id = auth.uid())
    and (p_weight_class is null or public.weight_class(p.gender, p.bodyweight_kg) = p_weight_class)
    and (p_country is null or p.country = upper(p_country))
  order by r.score desc, pr.best_1rm desc nulls last, r.user_id
  limit least(greatest(p_limit, 1), 200)
$$;

-- Platz des eigenen Nutzers in einer Bestenliste (auch wenn außerhalb der Top 50)
create or replace function public.get_my_leaderboard_position(p_exercise_slug text, p_weight_class text default null, p_country text default null)
returns bigint
language sql stable security definer set search_path = public as $$
  select 1 + count(*)
  from public.exercise_ranks r
  join public.exercises x on x.id = r.exercise_id and x.slug = p_exercise_slug
  join public.profiles p on p.id = r.user_id
  where not p.is_private and r.user_id <> auth.uid()
    and (p_weight_class is null or public.weight_class(p.gender, p.bodyweight_kg) = p_weight_class)
    and (p_country is null or p.country = upper(p_country))
    and r.score > (select r2.score from public.exercise_ranks r2 where r2.user_id = auth.uid() and r2.exercise_id = x.id)
$$;

-- Perzentil gegen echte Nutzer gleichen Geschlechts und gleicher Gewichtsklasse.
-- null, wenn es weniger als 50 Vergleichspersonen gibt → App nutzt fallbackPercentile().
create or replace function public.get_percentile(p_exercise_id uuid, p_score numeric, p_gender text, p_weight_class text)
returns smallint
language plpgsql stable security definer set search_path = public as $$
declare
  n int; below int;
begin
  select count(*), count(*) filter (where r.score < p_score) into n, below
  from public.exercise_ranks r join public.profiles p on p.id = r.user_id
  where r.exercise_id = p_exercise_id and p.gender = p_gender and public.weight_class(p.gender, p.bodyweight_kg) = p_weight_class;
  if n < 50 then return null; end if;
  return round(100.0 * below / n)::smallint;
end $$;

-- Benutzername prüfen (Onboarding, vor dem Konto)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select lower(p_username) ~ '^[a-z0-9_.]{3,20}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username) and id is distinct from auth.uid())
$$;

revoke execute on function public.get_public_profile(uuid), public.search_users(text), public.get_friends(), public.get_feed(int, timestamptz),
  public.get_my_league(), public.get_leaderboard(text, text, text, int), public.get_my_leaderboard_position(text, text, text),
  public.get_percentile(uuid, numeric, text, text) from public, anon;
grant execute on function public.get_public_profile(uuid), public.search_users(text), public.get_friends(), public.get_feed(int, timestamptz),
  public.get_my_league(), public.get_leaderboard(text, text, text, int), public.get_my_leaderboard_position(text, text, text),
  public.get_percentile(uuid, numeric, text, text) to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- ───────────────────────── Grundrechte ─────────────────────────
-- (RLS entscheidet zusätzlich, welche Zeilen sichtbar sind.)

grant select on public.profiles, public.training_plans, public.plan_days, public.plan_exercises, public.workouts, public.workout_sets,
  public.personal_records, public.exercise_ranks, public.muscle_ranks, public.friendships, public.feed_events, public.feed_reactions,
  public.leagues, public.league_members, public.user_badges, public.xp_events, public.exercises, public.badges to authenticated;
revoke all on public.profiles, public.training_plans, public.plan_days, public.plan_exercises, public.workouts, public.workout_sets,
  public.personal_records, public.exercise_ranks, public.muscle_ranks, public.friendships, public.feed_events, public.feed_reactions,
  public.leagues, public.league_members, public.user_badges, public.xp_events from anon;
grant select on public.exercises, public.badges to anon;
grant delete on public.training_plans, public.workouts, public.workout_sets, public.friendships, public.feed_reactions to authenticated;
grant select, insert, update, delete on public.plan_days, public.plan_exercises to authenticated;
grant insert (event_id, reaction) on public.feed_reactions to authenticated;

-- ───────────────────────── Storage: Profilbilder ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatar lesen" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar ersetzen" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────── Realtime ─────────────────────────

alter publication supabase_realtime add table public.league_members, public.feed_events, public.feed_reactions;
