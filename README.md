# Ascend – Fitness-App mit Rängen (MVP)

Logge Workouts, werde stärker und steige von **Eisen** bis **Titan** auf. Der Rang basiert auf deiner
relativen Kraft (geschätztes 1RM ÷ Körpergewicht) im Vergleich zu Kraftnormen.

## Starten (mit Expo Go)

1. `npm install`
2. `npx expo start`
3. QR-Code mit der **Expo Go**-App (iOS/Android) scannen.

## Was der MVP kann

- Onboarding: Name, Ziel, Geschlecht, Alter, Gewicht, Trainingstage, optionaler Kraft-Check → Rang-Reveal
- Workout loggen: Übungen, Sätze (kg × Wdh. / Sekunden), Haken mit Haptik, Pausen-Timer (90 s)
- Zusammenfassung: XP, Volumen, Bestleistungen (PRs), Rang-Aufstiege
- Ränge: Gesamtrang, 8 Muskelgruppen, 13 Übungen
- XP, Level (`100 × n^1.5`), Streak (Ruhetage brechen ihn nicht)
- Alles läuft **lokal** (AsyncStorage), kein Konto und kein Backend nötig

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `src/app/` | Screens (Expo Router): `onboarding`, `(tabs)/…`, `workout/active`, `workout/summary` |
| `src/lib/ranking.ts` | Epley-1RM, Kraftnormen → Score 0–100 → Stufe × Division |
| `src/lib/xp.ts`, `streak.ts` | XP, Level, Streak |
| `src/lib/workout.ts` | Workout abschließen: PRs, Rang-Aufstiege, XP |
| `src/data/exercises.ts` | Übungen + Kraftnormen |
| `src/store/useStore.ts` | Zustand-Store (persistiert) |
| `src/theme.ts` | Design-Tokens |
| `__tests__/` | Unit-Tests für die Logik |

## Befehle

```bash
npm test          # Unit-Tests
npm run typecheck # TypeScript
```

## Nächste Schritte

Supabase-Login und Sync · Freunde & Feed · Ligen · KI-Trainingsplan · Abzeichen · Muskelkarte · Deutsch/Englisch.
Die ursprüngliche Vision steht in `PROMPT.md`.

## Hinweis zu den Kraftnormen

Die Normen in `src/data/exercises.ts` sind Schätzwerte für eine erste Version, keine wissenschaftlich validierten Daten.
