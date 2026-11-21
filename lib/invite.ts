import * as Linking from 'expo-linking';

/** Link, der die App öffnet und den Nutzer als Freund vorschlägt (ascend://add/<name> bzw. exp://…/--/add/<name> in Expo Go). */
export function inviteLink(username?: string | null): string {
  return Linking.createURL(username ? `/add/${encodeURIComponent(username)}` : '/');
}

/** Benutzername aus einem gescannten/geöffneten Link lesen. */
export function usernameFromLink(url: string): string | null {
  const m = /\/add\/([a-z0-9_.]{3,20})(?:[/?#]|$)/i.exec(url);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}
