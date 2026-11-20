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
