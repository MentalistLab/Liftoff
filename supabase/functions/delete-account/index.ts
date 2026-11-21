// delete-account: löscht das eigene Konto endgültig (App-Store-Pflicht).
// auth.users löschen → profiles und alle Nutzerdaten fallen per ON DELETE CASCADE weg; Avatar aus dem Storage entfernen.
import { z } from 'npm:zod@3.23.8';
import { handler, HttpError, json, requireUser, serviceClient } from '../_shared/http.ts';

const Body = z.object({ confirm: z.literal('DELETE') });

Deno.serve(handler(async (req) => {
  const user = await requireUser(req);
  Body.parse(await req.json());
  const db = serviceClient();

  const { data: files } = await db.storage.from('avatars').list(user.id);
  if (files?.length) await db.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, 'delete_failed', error.message);
  return json({ deleted: true });
}));
