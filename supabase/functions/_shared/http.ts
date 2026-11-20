// Gemeinsame Helfer für alle Edge Functions (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new HttpError(500, 'config', `Umgebungsvariable ${name} fehlt`);
  return v;
}

/** Client mit Service-Role: umgeht RLS. Nur serverseitig verwenden! */
export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

/** Prüft das JWT aus dem Authorization-Header und liefert die Nutzer-ID. */
export async function requireUser(req: Request): Promise<{ id: string }> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized');
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new HttpError(401, 'unauthorized');
  return { id: data.user.id };
}

/** Wrapper: CORS, Fehlerbehandlung, nur POST. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
      if (e && typeof e === 'object' && 'issues' in e) return json({ error: 'invalid_input', issues: (e as { issues: unknown }).issues }, 400);
      console.error(e);
      return json({ error: 'internal' }, 500);
    }
  };
}

/** Wirft bei Supabase-Fehlern und gibt sonst die Daten zurück. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new HttpError(500, 'db', `${what}: ${res.error.message}`);
  return res.data as T;
}
