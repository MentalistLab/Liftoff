# Phase 2 – Datenmodell & Logik

## Überblick

```
supabase/
  migrations/20261120000001_init.sql   Tabellen, RLS, Spaltenrechte, RPCs, Trigger, Storage, Realtime
  migrations/20261120000002_cron.sql   pg_cron + pg_net: Ligawoche schließen
  seed.sql                             11 Kernübungen + 36 Abzeichen (aus TypeScript erzeugt)
  functions/_shared/core/              Reine Logik ohne Abhängigkeiten (App + Server)
    standards.ts  ranking.ts  xp.ts  streak.ts  badges.ts  league.ts  progression.ts
  functions/finish-workout/            Workout abschließen: Ränge, PRs, XP, Streak, Abzeichen, Feed
  functions/league-weekly/             Liga auswerten + neue Gruppen (Cron)
  functions/generate-plan/             KI-Trainingsplan mit Claude, geprüft mit zod
  tests/                               RLS-Tests (laufen gegen eine lokale Postgres-DB)
lib/                                   Re-Exports der Kernlogik für die App
__tests__/                             Unit-Tests (Jest)
scripts/generate-seed.ts               erzeugt supabase/seed.sql
```

Die Rang-, XP- und Liga-Logik existiert **nur einmal** (`_shared/core`). App und Edge Functions
importieren dieselben Dateien, damit Anzeige und Server nie auseinanderlaufen.

## Sicherheitsmodell

- Nutzer schreiben nur **Rohdaten**: Profil-Einstellungen, Workouts, Sätze, Freundschaftsanfragen, Reaktionen,
  eigene Plan-Anpassungen. Das ist per RLS **und** per Spaltenrechten erzwungen.
- Alles Fälschbare – XP, Level, Ränge, PRs, Streak, Liga-Stufe, Abzeichen, Feed – schreibt nur der Server
  (Edge Functions mit Service-Role). Versuche aus der App enden mit `permission denied`.
- Ein abgeschlossenes Workout (`finalized_at`) kann nicht mehr verändert werden.
- Körperdaten (Gewicht, Größe, Geburtsjahr, Geschlecht) sieht nur der Nutzer selbst. Andere bekommen über
  RPCs nur unkritische Felder.
- Sichtbarkeit: **Ränge, PRs, Abzeichen** sieht jeder bei öffentlichem Profil, bei privatem nur Freunde.
  Der **Feed** ist immer nur für Freunde. Private Profile erscheinen nicht in globalen Bestenlisten.
- Der Claude-API-Key liegt nur als Function-Secret auf dem Server.

Geprüft: 28 RLS-Szenarien in `supabase/tests/rls-test.sql` (u. a. „A setzt eigene XP“, „B sieht As Workouts“,
„Fremde sehen den Feed“, „privates Profil im Leaderboard“) – alle grün.

## Tabellen

| Tabelle | Inhalt | Schreibt |
|---|---|---|
| `profiles` | Profil, Einstellungen, XP, Level, Streak, Gesamtrang, Liga-Stufe | Nutzer (Einstellungen) / Server (Rest) |
| `exercises` | Übungskatalog mit Kraftnormen (`standards`) | Seed |
| `workouts`, `workout_sets` | Trainings und Sätze (`client_id` für Offline-Sync) | Nutzer bis zum Abschluss |
| `personal_records` | Bestwerte je Übung | Server |
| `exercise_ranks`, `muscle_ranks` | Score 0–100, Stufe, Division, Rangstufe 0–23, Perzentil | Server |
| `friendships` | Anfragen, angenommen, blockiert | Nutzer |
| `feed_events`, `feed_reactions` | Feed (Workout, PR, Rang, Abzeichen, Liga) + Reaktionen (Feuer, Stark, Applaus) | Server / Nutzer |
| `leagues`, `league_members` | Wochengruppen, Wochen-XP, Endplatzierung | Server |
| `badges`, `user_badges` | Abzeichen-Katalog und freigeschaltete Abzeichen | Seed / Server |
| `training_plans`, `plan_days`, `plan_exercises` | KI-Plan und Zielgewichte | Server / Nutzer (Anpassungen) |
| `xp_events` | XP-Buchungen (Trigger bucht Gesamt- und Wochen-XP) | Server |

## RPCs für die App

| Funktion | Zweck |
|---|---|
| `get_public_profile(user)` | Fremdes Profil ohne Körperdaten |
| `search_users(query)` | Freund per Benutzername finden |
| `get_friends()` | Freundesliste mit Rang und Streak |
| `get_feed(limit, before)` | Feed mit Reaktionszahlen und eigenen Reaktionen |
| `get_my_league()` | Eigene Ligagruppe, sortiert nach Wochen-XP |
| `get_leaderboard(slug, gewichtsklasse, land, limit)` | Bestenliste pro Übung |
| `get_my_leaderboard_position(...)` | Eigener Platz, auch außerhalb der Top 50 |
| `get_percentile(...)` | Perzentil gegen echte Nutzer (ab 50 Vergleichspersonen) |
| `username_available(name)` | Benutzername im Onboarding prüfen |

## Rang-Algorithmus (`core/ranking.ts`)

1. **1RM nach Epley:** `w × (1 + Wdh/30)`, 1 Wdh. = Gewicht, über 12 Wdh. wird mit 12 gerechnet (konservativ).
2. **Relative Stärke:** `1RM × Altersfaktor ÷ Körpergewicht`. Altersfaktor: 23–39 = 1,0; Jugendliche bis 1,15; ab 40 steigend bis max. 1,6.
3. **Normen:** 5 Schwellen je Übung und Geschlecht (Anfänger, Novize, Fortgeschritten, Stark, Elite) → Score 15 / 35 / 55 / 78 / 95, dazwischen linear, über Elite flach bis 100. „Keine Angabe“ nutzt den Mittelwert beider Normen.
4. **Körpergewichtsübungen** nach Wiederholungen (Zusatzgewicht wird in gleichwertige Wiederholungen umgerechnet), **Planks** nach Zeit.
5. **Score → Rang:** 24 gleich große Stufen: Eisen I … Titan III. Division I ist der Einstieg, III kurz vor der nächsten Stufe.
6. **Muskelrang:** beste 3 Übungen der Muskelgruppe, gewichtet 50/30/20 %; Übungen mit dem Muskel als Nebenmuskel zählen zu 85 %.
7. **Gesamtrang:** gewichteter Schnitt der Muskelgruppen (Beine 1,3 · Rücken 1,2 · Brust 1,1 · Schultern 1,0 · Gesäß 0,9 · Core 0,7 · Bizeps/Trizeps 0,6). Fehlen Muskelgruppen, gibt es bis zu −30 %, damit eine einzelne Übung den Gesamtrang nicht trägt.
8. **Perzentil:** echte Nutzer gleichen Geschlechts und gleicher Gewichtsklasse (RPC), sonst Schätzung aus den Normen.

**Beispiel:** Mann, 80 kg, 28 Jahre, Bankdrücken 80 kg × 5 → 1RM 93,3 kg → 1,17 × KG → Score 62,7 → **Diamant I**, stärker als ca. 84 %.
Kniebeuge 100 kg × 5 → Score 51,7 → **Platin I**.

Ränge sinken nicht: Sie spiegeln die beste je gezeigte Leistung. Die Verteilung lässt sich über `LEVEL_SCORES` feinjustieren.

## XP, Level, Streaks, Abzeichen

- **XP:** 10 pro Satz, +50 pro Workout, +100 pro PR, +250 pro Rang-Aufstieg; Streak-Multiplikator +5 % pro Tag bis ×1,5.
  Beispiel: 15 Sätze, 1 PR, 1 Aufstieg, 4er-Streak → 550 × 1,2 = **660 XP**.
- **Level:** `xpForLevel(n) = 100 × n^1,5` XP von Level n zu n + 1.
- **Streak:** zählt geplante Trainingstage; Ruhetage brechen nichts, Training an Ruhetagen zählt mit. Alle 7 Streak-Tage
  ein Freeze (max. 3), der einen verpassten Tag automatisch rettet. Ausgewertet wird beim Abschluss eines Workouts
  (verpasste Tage werden nachgeholt).
- **Abzeichen:** 36 Stück (Training, Streak, Kraft-Clubs, PRs, Rangstufen, Social, Liga).
- **PR-Regel:** Ein PR zählt erst, wenn es schon einen Bestwert gab – das erste Eintragen ist noch kein PR.

## Ligen

- 10 Stufen (Eisen … Titan), Gruppen à max. 30, nach Gesamtscore gemischt.
- Top 7 steigen auf (nur mit > 0 XP), letzte 5 steigen ab; bei kleineren Gruppen anteilig.
- Wochenende: Sonntag 23:59 Europe/Berlin. pg_cron läuft um 21:59 und 22:59 UTC (Sommer-/Winterzeit) plus
  ein Nachhol-Lauf Montag früh. Die Function entscheidet anhand der Berliner Zeit und ist idempotent.
- Wer XP bekommt und noch in keiner Gruppe ist, wird automatisch eingeteilt (`ensure_league_membership`).
- Das Ergebnis steht in `league_members.result`; die App zeigt das Modal, solange `result_seen = false`.

## Edge Functions

**`finish-workout`** – `POST { workoutId, today? }` mit Nutzer-JWT
Antwort: `xp`, `level`, `streak` (+ Ereignisse), `exercises` (Score, Rang, Aufstiege, PR), `overall`, `badges`, `progression`, `volumeKg`.
Doppelte Aufrufe liefern `409 already_finalized` statt doppelter XP.

**`generate-plan`** – `POST {}` mit Nutzer-JWT
Ruft Claude mit Ziel, Erfahrung, Equipment, Trainingstagen, Muskelrängen und Übungsliste auf; Antwort über ein
Tool-Schema, Prüfung mit zod plus Prüfung auf erlaubte Übungen und Wochentage, eine Korrekturrunde.
Startgewichte aus vorhandenen Bestwerten. Neu generierbar nach 28 Tagen (`409 plan_locked`).

**`league-weekly`** – nur pg_cron (Header `x-cron-secret`, geprüft gegen den Vault).

**Progressive Overload** (`core/progression.ts`): alle Sätze am oberen Wdh.-Ende → +2,5 kg (Oberkörper) bzw. +5 kg
(Unterkörper); die Hälfte der Sätze unter dem Bereich → −5 %; sonst Gewicht halten. Wird nach jedem Plan-Workout
in `plan_exercises` geschrieben.

## Tests

| Bereich | Tests |
|---|---|
| Ranking (Epley, Altersfaktor, Normen, Ränge, Muskel/Gesamt, Perzentil) | 33 |
| XP, Level, Streak, Abzeichen | 15 |
| Liga (Auswertung, Gruppen, Berliner Woche inkl. Sommerzeit) | 10 |
| Progressive Overload | 8 |
| RLS / Rechte (SQL gegen Postgres 16) | 30 |

`npm test` läuft, sobald in Phase 3 das Expo-Projekt mit `jest-expo` eingerichtet ist.

## Offen für Phase 3

- Vollständiger Übungskatalog (≥ 80) mit Normen – `standards.ts` erweitern, dann `npm run seed:generate`.
- Demo-Nutzer für die Bestenlisten.


## Live-Projekt (Stand 20.11.2026)

- Supabase-Projekt **ascend** (`txcjjbmbctfmffozvbrz`, Region EU), URL `https://txcjjbmbctfmffozvbrz.supabase.co`.
- Migrationen `…0001_init`, `…0002_cron`, `…0003_hardening` und `seed.sql` sind eingespielt.
- Edge Functions deployt: `finish-workout`, `league-weekly` (ohne JWT, prüft `x-cron-secret` gegen den Vault), `generate-plan`.
  Deployt wurden je eine Datei mit eingebettetem `_shared`-Code – inhaltlich identisch mit dem Quellcode hier.
  Mit der CLI später einfach `supabase functions deploy <name>`.
- Vault-Secrets: `project_url`, `cron_secret` (für pg_cron → league-weekly).
- Edge-Function-Secret `ANTHROPIC_API_KEY` muss im Dashboard gesetzt sein, sonst antwortet `generate-plan` mit 500 `config`.
- End-to-End geprüft: erstes Workout → Ränge + 126 XP + 8 Abzeichen; doppelter Abschluss → 409; PR + 2 Rang-Aufstiege → 704 XP
  (Streak ×1,05); ohne Login → 401; league-weekly mit richtigem/falschem Secret → 200/401. Testnutzer danach gelöscht.
- Security Advisor: übrig sind nur bewusst offene RPCs (`username_available` für anon, Lese-RPCs für Eingeloggte) und
  „Leaked Password Protection“ (Dashboard → Auth → Passwörter, nur in bezahlten Plänen).
