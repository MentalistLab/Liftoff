-- Zeitgesteuerte Jobs: Ligawoche schließen (Sonntag 23:59 Europe/Berlin).
-- Voraussetzung (einmalig im SQL-Editor, siehe README):
--   select vault.create_secret('https://<projekt-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<langer zufälliger Text>', 'cron_secret');
-- Derselbe cron_secret muss als Function-Secret CRON_SECRET gesetzt sein.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_edge_function(p_name text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_secret is null then
    raise warning 'Vault-Secrets project_url/cron_secret fehlen – Job % übersprungen', p_name;
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;
revoke execute on function public.invoke_edge_function(text) from public, anon, authenticated;

-- pg_cron rechnet in UTC. Sonntag 23:59 Berlin ist 21:59 UTC (Sommerzeit) bzw. 22:59 UTC (Winterzeit).
-- Beide Läufe sind eingeplant; die Function entscheidet anhand der Berliner Uhrzeit und ist idempotent.
select cron.schedule('league-week-close-summer', '59 21 * * 0', $$select public.invoke_edge_function('league-weekly')$$);
select cron.schedule('league-week-close-winter', '59 22 * * 0', $$select public.invoke_edge_function('league-weekly')$$);
-- Sicherheitsnetz: Montag früh nachholen, falls ein Lauf ausgefallen ist.
select cron.schedule('league-week-close-catchup', '30 4 * * 1', $$select public.invoke_edge_function('league-weekly')$$);
