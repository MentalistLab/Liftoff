-- Ascend · Härtung nach Supabase Security Advisor
-- 1) Feste search_path für alle Hilfsfunktionen
alter function public.set_updated_at() set search_path = public;
alter function public.current_league_week() set search_path = public;
alter function public.weight_class(text, numeric) set search_path = public;
alter function public.friendships_responded() set search_path = public;

-- 2) Trigger-Funktionen sind keine API: niemand darf sie per /rpc aufrufen.
--    (Trigger feuern trotzdem – EXECUTE wird beim Feuern nicht geprüft.)
revoke execute on function public.apply_xp_event() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3) RLS-Hilfsfunktionen brauchen nur eingeloggte Nutzer (anon liest keine Tabellen).
revoke execute on function public.is_friend(uuid, uuid) from public, anon;
revoke execute on function public.can_view_profile(uuid) from public, anon;
revoke execute on function public.can_view_feed(uuid) from public, anon;
revoke execute on function public.is_league_member(uuid) from public, anon;
grant execute on function public.is_friend(uuid, uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.can_view_feed(uuid) to authenticated;
grant execute on function public.is_league_member(uuid) to authenticated;

-- Bewusst offen:
--  * username_available: anon darf beim Onboarding vor der Registrierung prüfen.
--  * get_* / search_users: öffentliche, gezielt gefilterte Lese-RPCs für eingeloggte Nutzer.

-- 4) Performance: auth.uid() in RLS-Policies nur einmal pro Query auswerten
--    (auth.uid() → (select auth.uid())), ohne die Logik zu ändern.
do $$
declare
  p record;
  q text;
  c text;
  stmt text;
begin
  for p in select * from pg_policies where schemaname = 'public' loop
    q := regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    c := regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    if q is distinct from p.qual or c is distinct from p.with_check then
      stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if q is not null then stmt := stmt || format(' using (%s)', q); end if;
      if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
      execute stmt;
    end if;
  end loop;
end $$;

-- 5) Indizes für Fremdschlüssel
create index if not exists feed_reactions_user_id_idx on public.feed_reactions (user_id);
create index if not exists personal_records_exercise_id_idx on public.personal_records (exercise_id);
create index if not exists plan_exercises_exercise_id_idx on public.plan_exercises (exercise_id);
create index if not exists user_badges_badge_id_idx on public.user_badges (badge_id);
create index if not exists workouts_plan_day_id_idx on public.workouts (plan_day_id);
