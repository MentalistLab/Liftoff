# Master-Prompt: „Ascend“ – Gamifizierte Fitness-App mit Rängen (Expo + Supabase + Figma)

> Kopiere alles unterhalb der Linie in Claude Code (oder einen anderen KI-Coding-Agenten). Der Prompt ist in Phasen aufgebaut: **erst das komplette Design in Figma, dann der Code.** Der Agent soll jede Phase abschließen und dir zeigen, bevor er weitermacht.

---

## Rolle & Ziel

Du bist ein Senior Product Designer und Senior React-Native-Entwickler. Baue eine **eigenständige, originelle** Fitness-App im Stil gamifizierter Trainings-Apps mit Rängen (inspiriert vom Genre, aber **eigener Name, eigenes Branding, eigene Icons, eigene Rang-Namen und eigene Grafiken** – nichts kopieren). Arbeitsname: **„Ascend“**.

Die App motiviert Menschen zum Krafttraining, indem jede Übung, jede Muskelgruppe und der Nutzer insgesamt einen **Rang** bekommt, der auf echter, relativer Kraft basiert. Nutzer können sich mit Freunden messen, in wöchentlichen Ligen auf- und absteigen und bekommen einen KI-generierten Trainingsplan.

**Tech-Stack (verbindlich):**
- **Expo SDK (neueste stabile Version)**, TypeScript, **Expo Router** (dateibasiertes Routing), muss in **Expo Go** laufen (keine Custom Native Modules, die Expo Go nicht unterstützt)
- **Supabase**: Auth (E-Mail + Apple + Google), Postgres, Row Level Security, Realtime (Leaderboards), Storage (Profilbilder), Edge Functions (KI-Plan, Liga-Auswertung)
- State: **Zustand** + **TanStack Query**
- Styling: Design-Tokens aus Figma → `theme.ts`; Animationen mit **react-native-reanimated** + **moti**; Haptik mit **expo-haptics**
- Charts: **victory-native** oder **react-native-svg**-basierte eigene Charts
- i18n: **i18next + expo-localization**, Sprachen **Deutsch und Englisch** (Gerätesprache automatisch, Umschalter in Einstellungen)
- Push: **expo-notifications**
- Builds: **EAS Build** für echte Installation (iOS TestFlight / Android APK/AAB)

---

## PHASE 1 – Design-System & alle Screens in Figma (ZUERST, bevor Code geschrieben wird)

Erstelle eine neue Figma-Datei „Ascend – App Design“ mit folgenden Seiten:

### 1.1 Seite „Foundations“ (als Figma Variables/Styles)
- **Farben (Dark-Mode-first, zusätzlich Light-Mode):**
  - Background `#0B0D12`, Surface `#151821`, Surface-2 `#1E2230`, Border `#2A2F3F`
  - Text Primary `#FFFFFF`, Secondary `#A4A9B8`, Tertiary `#6B7083`
  - Primary/Accent `#6C5CFF` (Violett), Accent-2 `#00E0B8` (Mint), Danger `#FF4D6D`, Warning `#FFB020`, Success `#2BD67B`
  - Gradients: Primary `#6C5CFF → #B05CFF`, Streak `#FF7A18 → #FFB020`
- **Rang-Farben (eigene Rang-Leiter, 8 Stufen mit je 3 Unterstufen I–III):**
  1. Eisen `#7A7F8C` 2. Bronze `#B8733D` 3. Silber `#C9D1DC` 4. Gold `#F5C451` 5. Platin `#4FD1C5` 6. Diamant `#5AB8FF` 7. Meister `#B05CFF` 8. Titan `#FF4D6D` (mit animiertem Glow)
- **Typografie:** Inter (oder „Satoshi“/„Plus Jakarta Sans“ falls frei verfügbar) – Display 34/40 Bold, H1 28/34 Bold, H2 22/28 Semibold, H3 18/24 Semibold, Body 16/22 Regular, Caption 13/18 Medium, Overline 11/14 Bold Uppercase +6% Tracking; Zahlen tabellarisch (`tnum`)
- **Spacing:** 4-pt-Grid (4, 8, 12, 16, 20, 24, 32, 40, 56)
- **Radius:** 8 / 12 / 16 / 24 / full
- **Schatten/Glow:** Card-Shadow + farbiger Glow je Rang
- **Icons:** eigenes, konsistentes Line-Icon-Set (z. B. Lucide als Basis), 24 px, 1.75 px Stroke
- **Rang-Abzeichen:** 8 originelle Emblem-Designs (geometrische Schild-/Kristallform), jeweils 3 Unterstufen durch Sterne/Balken markiert

### 1.2 Seite „Components“ (mit Varianten & Auto Layout)
Button (Primary/Secondary/Ghost/Danger, Größen S/M/L, States default/pressed/disabled/loading), Input, Segmented Control, Chip, Card, ListItem, Avatar (mit Rang-Rahmen), RankBadge, ProgressBar & ProgressRing, StreakFlame, XP-Bar, TabBar (5 Tabs), Header, BottomSheet, Toast, Modal, Stepper (+/−), Set-Row (Gewicht × Wdh. × Haken), Rest-Timer, Leaderboard-Row, Muskelkarte (Front/Back-Körpersilhouette mit einfärbbaren Muskelgruppen), Chart-Card, Empty State, Skeleton Loader.

### 1.3 Seite „Onboarding“ (iPhone 15 Frame, 393×852, + Android 412×915 prüfen)
Ziel: in < 2 Minuten zum ersten Rang, hohe Motivation, kein Overload. Fortschrittsbalken oben, „Zurück“ immer möglich, große Tap-Flächen, jede Auswahl mit Haptik + Micro-Animation.
1. **Splash** – Logo-Animation
2. **Welcome** – animiertes Rang-Emblem, Headline „Finde heraus, wie stark du wirklich bist.“, Buttons „Los geht’s“ / „Ich habe schon ein Konto“
3. **Sprache** (vorausgewählt nach Gerät)
4. **Ziel** – Muskelaufbau / Kraft / Abnehmen / Fit bleiben (Karten mit Icon)
5. **Erfahrung** – Anfänger / Fortgeschritten / Profi
6. **Geschlecht** (für Kraftnormen; inkl. „Keine Angabe“)
7. **Alter** (Wheel-Picker)
8. **Körpergewicht** (kg/lbs-Toggle, Ruler-Slider)
9. **Größe** (cm/ft)
10. **Trainingsort** – Gym / Zuhause mit Hanteln / Nur Körpergewicht
11. **Trainingstage pro Woche** (2–6) + bevorzugte Wochentage
12. **Kraft-Check (optional, überspringbar):** Bestwerte für Bankdrücken, Kniebeuge, Kreuzheben, Klimmzüge, Liegestütze eingeben („Weiß ich nicht“ möglich → Schätzung)
13. **Berechnungs-Screen** – Lade-Animation „Analysiere deine Stärke…“ (2–3 s)
14. **Rang-Reveal** – großes animiertes Emblem fliegt ein, Konfetti, Haptik, Gesamtrang + Top-3 Muskelgruppen, „Du bist stärker als 62 % der Nutzer deines Gewichts“
15. **Plan-Vorschau** – generierter Wochenplan
16. **Benachrichtigungen erlauben** (mit Begründung)
17. **Konto erstellen** – Apple / Google / E-Mail (Daten aus Onboarding werden übernommen); Benutzername + Avatar
18. **Freunde einladen** (überspringbar) → **Home**

### 1.4 Seite „Main App“ – Tab-Bar mit 5 Tabs
1. **Home:** Begrüßung, Streak-Flamme, XP-Bar & Level, „Heutiges Training“-Karte (Start-Button), Wochenkalender mit erledigten Tagen, Liga-Mini-Widget (Platz + Tage bis Ende), letzte Rang-Aufstiege
2. **Training:** Plan-Übersicht (KI-Plan), Übungsbibliothek mit Suche/Filter nach Muskel & Equipment, freies Workout starten
   - **Aktives Workout (Fullscreen):** Timer oben, Übungsliste, Set-Rows mit vorherigen Werten als Placeholder, Haken → Haptik + automatischer **Rest-Timer** (Bottom-Sheet), Übung tauschen/hinzufügen, Notizen, „Workout beenden“
   - **Workout-Zusammenfassung:** Volumen, Dauer, neue PRs, XP gewonnen, Rang-Fortschritt je Übung mit Animation, Teilen-Karte (Bild exportieren)
3. **Ränge:** Gesamtrang groß, **Muskelkarte** (Front/Back, Muskel in Rang-Farbe), Liste aller Muskelgruppen (Brust, Rücken, Schultern, Bizeps, Trizeps, Beine, Gesäß, Core) mit Rang + Fortschritt zur nächsten Stufe, Tap → Detail mit Übungs-Rängen und Verlauf
4. **Social:** Segmented „Liga | Freunde | Global“
   - **Liga:** 30 Spieler pro Gruppe, wöchentliches XP-Ranking, Top 7 steigen auf (grüne Zone), letzte 5 steigen ab (rote Zone), Countdown bis Sonntag 23:59
   - **Freunde:** Freundesliste, Feed (Workouts, PRs, Rang-Aufstiege) mit Reaktionen (🔥💪👏), Freund hinzufügen per Benutzername/QR-Code/Einladungslink
   - **Global/Land:** Leaderboards pro Übung & Gewichtsklasse
5. **Profil:** Avatar mit Rang-Rahmen, Statistiken (Workouts gesamt, Volumen, längster Streak), **Abzeichen-Wand**, Fortschrittsgraphen (Körpergewicht, 1RM-Verlauf pro Übung, Volumen pro Woche), Einstellungen (Einheiten, Sprache, Benachrichtigungen, Datenschutz/Profil privat, Konto löschen, Abmelden)

### 1.5 Seite „States & Edge Cases“
Lade-, Leer-, Fehler- und Offline-Zustände für jeden Haupt-Screen; Rang-Aufstieg-Modal; Abzeichen-freigeschaltet-Modal; Streak verloren / Streak-Freeze; Liga-Auf-/Abstieg-Modal.

### 1.6 Seite „Prototype“
Klickbarer Prototyp: Onboarding komplett → Home → Workout starten → Satz abhaken → Zusammenfassung → Rang-Aufstieg.

**➡ Stopp nach Phase 1:** Zeige mir den Figma-Link und Screenshots aller Screens. Warte auf mein OK oder Änderungswünsche, bevor du codest.

---

## PHASE 2 – Datenmodell & Logik

### 2.1 Supabase-Schema (mit Migrations-SQL & RLS-Policies)
- `profiles` (id → auth.users, username unique, display_name, avatar_url, gender, birth_year, bodyweight_kg, height_cm, experience, goal, location, training_days, language, unit_system, is_private, xp, level, current_streak, longest_streak, streak_freezes, overall_rank, created_at)
- `exercises` (id, name_de, name_en, primary_muscle, secondary_muscles[], equipment, is_bodyweight, ranking_type: `weight_ratio` | `reps` | `time`, standards jsonb)
- `workouts` (id, user_id, plan_day_id, started_at, ended_at, total_volume, xp_earned, notes)
- `workout_sets` (id, workout_id, exercise_id, set_index, weight_kg, reps, duration_s, rpe, is_warmup, estimated_1rm)
- `personal_records` (user_id, exercise_id, best_1rm, best_reps, achieved_at)
- `exercise_ranks` / `muscle_ranks` (user_id, exercise_id/muscle, tier 1–8, division 1–3, score 0–100, percentile, updated_at)
- `friendships` (requester_id, addressee_id, status pending/accepted/blocked)
- `feed_events` + `feed_reactions`
- `leagues` (id, tier 1–10, week_start) + `league_members` (league_id, user_id, weekly_xp, final_position)
- `badges` + `user_badges`
- `training_plans` + `plan_days` + `plan_exercises`
- RLS: Nutzer lesen/schreiben nur eigene Daten; Freunde sehen Feed & Ränge nur wenn nicht privat; Leaderboards über Views/RPC mit nur öffentlichen Feldern.

### 2.2 Rang-Algorithmus (in `lib/ranking.ts`, mit Unit-Tests)
- Geschätztes 1RM per **Epley**: `1RM = w × (1 + reps/30)` (reps ≤ 12)
- Relative Stärke = 1RM / Körpergewicht; vergleiche mit **Kraftnormen** pro Übung, Geschlecht, Alter (Altersfaktor) → Score 0–100
- Score → Tier (8 Stufen) × Division (I–III) = 24 Rang-Stufen
- Körpergewichtsübungen: Wiederholungs-Normen; Planks: Zeit-Normen
- Muskelrang = gewichteter Schnitt der besten Übungen der Muskelgruppe; Gesamtrang = gewichteter Schnitt aller Muskelgruppen
- Perzentil gegen echte Nutzer gleicher Gewichtsklasse (Supabase-RPC), Fallback auf Normtabellen

### 2.3 XP, Level, Streaks, Abzeichen
- XP: 10 pro abgeschlossenem Satz, +50 pro Workout, +100 pro PR, +250 pro Rang-Aufstieg, Streak-Multiplikator bis ×1.5
- Level-Kurve: `xpForLevel(n) = 100 × n^1.5`
- Streak zählt geplante Trainingstage (Ruhetage brechen ihn nicht); 1 Streak-Freeze pro 7 Tage Streak
- ≥ 30 Abzeichen (erstes Workout, 7/30/100-Tage-Streak, 100-kg-Club, 10 Freunde, Liga-Aufstieg, jeder Rang erreicht …)

### 2.4 Ligen (Supabase Edge Function + Cron, Sonntag 23:59 Europe/Berlin)
10 Liga-Stufen, Gruppen à 30 nach Ähnlichkeit gemischt; Top 7 auf, Bottom 5 ab; Ergebnis-Modal beim nächsten App-Start; Realtime-Updates der Platzierung.

### 2.5 KI-Trainingsplan (Edge Function)
Edge Function ruft das Claude-API auf (API-Key nur serverseitig als Supabase-Secret!) mit Ziel, Erfahrung, Ort/Equipment, Trainingstagen und aktuellen Rängen → gibt strukturiertes JSON (Tage → Übungen → Sätze/Wdh./Pause) zurück, validiert mit **zod**. Progressive Overload: nach jedem Workout Gewicht/Wdh. vorschlagen. Plan alle 4 Wochen neu generierbar.

---

## PHASE 3 – Umsetzung in Expo (pixelgenau nach Figma)

- Ordnerstruktur: `app/(onboarding)/…`, `app/(auth)/…`, `app/(tabs)/home|train|ranks|social|profile`, `app/workout/[id]`, `components/ui/*` (1:1 die Figma-Komponenten), `lib/` (supabase, ranking, xp, i18n), `stores/`, `locales/de.json`, `locales/en.json`, `supabase/migrations`, `supabase/functions`
- Tokens 1:1 aus Figma-Variables in `theme.ts` übernehmen (Farben, Typo, Spacing, Radius) – keine hartkodierten Werte in Screens
- Muskelkarte als SVG-Komponente mit einfärbbaren Pfaden
- Animationen: Rang-Reveal, Konfetti, XP-Bar füllen, Zahlen hochzählen, Haken-Animation, Liga-Auf-/Abstieg
- Offline-first für aktives Workout (lokal speichern mit AsyncStorage/MMKV-freier Lösung kompatibel mit Expo Go, später synchronisieren)
- Barrierefreiheit: Kontraste AA, `accessibilityLabel` überall, dynamische Schriftgrößen
- `.env` mit `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Beispiel-Datei `.env.example`, echte Keys nie committen)
- Seed-Daten: ≥ 80 Übungen (DE/EN) mit Kraftnormen, Abzeichen, Demo-Nutzer für Leaderboards

---

## PHASE 4 – Testen & als echte App installieren

1. `npx expo start` → QR-Code mit **Expo Go** scannen (iOS & Android) und alle Flows testen
2. Unit-Tests (Jest) für Ranking, XP, Streak, Liga-Logik
3. **EAS Build:** `eas.json` mit Profilen `development`, `preview` (Android APK zum direkten Installieren, iOS intern) und `production`; App-Icon, Splash-Screen, Bundle-ID `com.<deinname>.ascend`
4. Schritt-für-Schritt-Anleitung für mich (Anfänger) in `README.md`: Supabase-Projekt anlegen, Migrationen ausführen, Keys eintragen, App starten, APK bauen, TestFlight hochladen

---

## Arbeitsweise
- Arbeite **Phase für Phase** und frage mich nach jeder Phase um Freigabe.
- Wenn etwas unklar ist, **frag nach**, statt zu raten.
- Halte alles original (kein Logo, Name, Icon oder Text einer existierenden App übernehmen).
- Committe nach jedem abgeschlossenen Feature mit aussagekräftiger Nachricht.
