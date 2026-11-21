// admin-stats: Nutzungszahlen für die Statistik-Seite. Nur für Konten mit app_metadata.role = "admin"
// (app_metadata kann nur der Server setzen, nicht der Nutzer selbst).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handler, HttpError, json, serviceClient } from '../_shared/http.ts';

const TEST = /@(ascend-test|demo\.ascend)\.local$/;

Deno.serve(handler(async (req) => {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized');
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: me, error } = await userClient.auth.getUser();
  if (error || !me?.user) throw new HttpError(401, 'unauthorized');
  if (me.user.app_metadata?.role !== 'admin') throw new HttpError(403, 'not_admin');

  const db = serviceClient();
  const now = Date.now();
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(now - 7 * 86_400_000);

  // Konten (Test- und Demo-Konten ausgenommen)
  let accounts = 0, signedIn24h = 0, newThisWeek = 0, page = 1;
  for (;;) {
    const { data, error: e } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (e) throw new HttpError(500, 'users', e.message);
    for (const u of data.users) {
      if (u.email && TEST.test(u.email)) continue;
      accounts++;
      if (u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 86_400_000) signedIn24h++;
      if (new Date(u.created_at) >= weekAgo) newThisWeek++;
    }
    if (data.users.length < 1000) break;
    page++;
  }

  const recent = await db.from('workouts').select('user_id, finalized_at').not('finalized_at', 'is', null).gte('finalized_at', weekAgo.toISOString()).limit(10000);
  if (recent.error) throw new HttpError(500, 'workouts', recent.error.message);
  const today = recent.data.filter((w) => new Date(w.finalized_at) >= dayStart);
  const total = await db.from('workouts').select('id', { count: 'exact', head: true }).not('finalized_at', 'is', null);

  return json({
    accounts, signedIn24h, newThisWeek,
    activeToday: new Set(today.map((w) => w.user_id)).size,
    activeWeek: new Set(recent.data.map((w) => w.user_id)).size,
    workoutsToday: today.length,
    workoutsWeek: recent.data.length,
    workoutsTotal: total.count ?? 0,
    at: new Date().toISOString(),
  });
}));
