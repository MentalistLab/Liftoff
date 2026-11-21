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
