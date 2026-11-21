# Phase 3 – Umsetzung in Expo

## 3.3 Muskelkarte (`components/ui/MuscleMap.tsx`)

SVG-Komponente mit einfärbbaren Pfaden (react-native-svg, läuft in Expo Go).

Ebenen: `assets/body/body-base.png` (dunkle Silhouette) → Muskelpfade aus `lib/muscleMap.ts` → `body-lines.png` (Konturen).

```tsx
<MuscleMap
  gender={profile.gender}             // 'male' | 'female' | 'none' (→ männliche Figur)
  scores={{ chest: 62, legs: 71 }}    // Muskel-Score 0–100, fehlend = ungefärbt
  view="front"                        // 'both' | 'front' | 'back'
  selected={muscle}                   // andere Muskeln werden abgedunkelt
  onPressMuscle={setMuscle}           // Tap → Detail
  width={340}
/>
```

- Farbe = Rang-Stufe (`TIER_COLORS`), Deckkraft steigt mit Division I → III.
- Darstellungslogik ohne React in `lib/muscleMapView.ts`, Tests in `__tests__/muscleMapView.test.ts`.
- Barrierefreiheit: Gesamt-Label mit allen Muskelrängen; jeder Pfad hat ein eigenes Label.
- Benötigt beim Expo-Setup: `npx expo install react-native-svg`.

## 3.1 / 3.2 Expo-Grundgerüst und Design-Tokens

Expo SDK 58, Expo Router, TypeScript. Läuft in Expo Go.

```
app/_layout.tsx            Fonts (Inter), Splash, TanStack Query, Safe Area, Gesten
app/index.tsx              → /home (Onboarding/Auth folgen)
app/(tabs)/                home · train · ranks · social · profile
components/ui/             Text, Card, ProgressBar, RankBadge, SegmentedControl, Screen, MuscleMap
theme/index.ts             Farben, Rang-Farben, Gradients, Spacing, Radius, Typo, Schatten
lib/supabase.ts            Client (AsyncStorage-Session); ohne .env → Demo-Modus
lib/i18n.ts, locales/      Deutsch/Englisch, Gerätesprache, Umschalter im Profil
stores/settings.ts         Sprache + Einheiten (zustand, persistiert)
hooks/useMyRanks.ts        Muskelränge aus Supabase, sonst Demo-Daten
```

Fertig nutzbar: **Ränge-Tab** (Gesamtrang, Muskelkarte vorne/hinten mit Tap-Auswahl, Liste aller Muskelgruppen),
Home (Streak, Level/XP), Profil (Sprache). Training und Social sind noch Platzhalter.

```bash
npm install
cp .env.example .env     # optional – ohne Keys läuft der Demo-Modus
npx expo start           # QR-Code mit Expo Go scannen
npm test                 # 81 Tests
npm run typecheck
```

## Onboarding (`app/onboarding.tsx`)

16 Schritte mit Fortschrittsbalken, „Zurück“ überall, Haptik bei jeder Auswahl, Übergangsanimation:
Welcome → Sprache → Ziel → Erfahrung → Geschlecht → Alter → Gewicht (kg/lbs) → Größe (cm/ft) → Trainingsort →
Trainingstage → Kraft-Check (überspringbar, „Weiß ich nicht“ je Übung) → Berechnung → **Rang-Reveal**
(Emblem mit Feder-Animation, Glow, Konfetti, Perzentil zählt hoch, Top-3-Muskeln) → Plan-Vorschau →
Benachrichtigungen → Konto.

- Erster Rang: `lib/onboardingRanks.ts` – echte Bestwerte über den Rang-Algorithmus, unbekannte Werte
  konservativ aus der Erfahrung geschätzt (Tests in `__tests__/onboardingRanks.test.ts`).
- Plan-Vorschau nutzt den kostenlosen Plan-Generator aus Phase 2, gefiltert nach Trainingsort.
- Konto: E-Mail-Registrierung über Supabase; Benutzername wird per `username_available` geprüft,
  danach werden die Onboarding-Daten ins Profil geschrieben. Ohne Supabase oder „Ohne Konto weiter“ bleibt
  alles lokal (`stores/onboarding.ts`, persistiert) und der Ränge-Tab zeigt das Onboarding-Ergebnis.
- Start: `app/index.tsx` leitet zum Onboarding, bis es abgeschlossen ist.

Noch offen: Apple-/Google-Login (braucht Entwickler-Konten), Login für bestehende Konten,
die Onboarding-Ränge serverseitig speichern (Edge Function), Freunde einladen.

## Training & aktives Workout

- **Training-Tab** (`app/(tabs)/train.tsx`): Wochenplan mit „Heute“-Markierung und Start-Button, freies Workout,
  „Workout fortsetzen“-Banner mit Laufzeit, Übungsbibliothek mit Suche und Muskel-Filter.
- **Aktives Workout** (`app/workout/active.tsx`, Vollbild): Timer, Übungen mit Satz-Zeilen
  (vorherige Werte als Platzhalter, werden beim Abhaken übernommen), Haken mit Haptik + Animation,
  automatischer **Pausen-Timer** als Bottom-Sheet (±15 s, Überspringen, Haptik am Ende), Übung hinzufügen/tauschen/entfernen,
  Satz hinzufügen, Satz entfernen per langem Druck auf die Nummer, Notizen, Verwerfen/Beenden mit Rückfrage.
- **Offline-first:** `stores/workout.ts` speichert das laufende Workout bei jeder Eingabe in AsyncStorage
  (übersteht App-Neustart). Beim Beenden wird sofort lokal ausgewertet (`lib/workoutSummary.ts`, gleiche Rang-/XP-Logik wie der Server).
- **Sync** (`lib/sync.ts`): angemeldet → Workout + Sätze hochladen (idempotent über `client_id`), dann `finish-workout`
  aufrufen. Fehlgeschlagenes wird beim nächsten App-Start nachgereicht.
- **Zusammenfassung** (`app/workout/summary.tsx`): Dauer, Volumen, Sätze, XP (zählen hoch), Level-Balken, neue PRs,
  Rang-Fortschritt je Übung mit ▲ bei Aufstieg, Konfetti bei PR/Rang-Aufstieg, Sync-Status.
- **Home:** Level/XP aus echten Workouts, Wochenkalender (geplant/erledigt), heutiges Training mit Start-Button.

Noch offen: Teilen-Karte als Bild, Plan-Workouts mit vorgeschlagenen Gewichten aus der Progression,
Server-Ergebnis nach dem Sync in die Zusammenfassung übernehmen, Streak lokal anzeigen.
