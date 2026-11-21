-- Feed: stabile Reihenfolge bei gleichem Zeitstempel (ein Workout erzeugt mehrere Einträge in einer Transaktion)
-- und Cursor-Paging über (created_at, id), damit beim Nachladen nichts doppelt kommt oder fehlt.
drop function if exists public.get_feed(int, timestamptz);

create or replace function public.get_feed(p_limit int default 30, p_before timestamptz default null, p_before_id uuid default null)
returns table (id uuid, user_id uuid, username text, avatar_url text, overall_rank smallint, type text, payload jsonb, created_at timestamptz,
  reactions jsonb, my_reactions text[])
language sql stable security definer set search_path = public as $$
  select e.id, e.user_id, p.username, p.avatar_url, p.overall_rank, e.type, e.payload, e.created_at,
    coalesce((select jsonb_object_agg(r.reaction, r.n) from (select reaction, count(*) n from public.feed_reactions where event_id = e.id group by reaction) r), '{}'::jsonb),
    coalesce((select array_agg(reaction) from public.feed_reactions where event_id = e.id and user_id = auth.uid()), '{}')
  from public.feed_events e
  join public.profiles p on p.id = e.user_id
  where public.can_view_feed(e.user_id)
    and (p_before is null or (e.created_at, e.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by e.created_at desc, e.id desc
  limit least(greatest(p_limit, 1), 100)
$$;

revoke execute on function public.get_feed(int, timestamptz, uuid) from public, anon;
grant execute on function public.get_feed(int, timestamptz, uuid) to authenticated;

create index if not exists feed_events_created_id_idx on public.feed_events (created_at desc, id desc);
