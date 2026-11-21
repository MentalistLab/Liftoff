# Ascend – Krafttraining mit Rängen

Expo-App (iOS, Android, Web) + Supabase-Backend. Jede Übung, jede Muskelgruppe und du selbst bekommt einen Rang –
basierend auf echter, relativer Kraft. Dazu Wochen-Ligen, Freunde, Abzeichen und ein kostenloser Trainingsplan.

Diese Anleitung setzt **keine Vorkenntnisse** voraus. Arbeite sie von oben nach unten durch.

---

## 0. Was du brauchst

| Was | Wofür | Kosten |
|---|---|---|
| Computer mit macOS, Windows oder Linux | Entwickeln | – |
| [Node.js](https://nodejs.org) **LTS** (Version 20 oder neuer) | Projekt starten | kostenlos |
| [Git](https://git-scm.com) | Code herunterladen | kostenlos |
| Smartphone mit der App **Expo Go** (App Store / Play Store) | App testen | kostenlos |
| [Supabase](https://supabase.com)-Konto | Datenbank, Login | kostenlos (Free-Plan reicht) |
| [Expo](https://expo.dev)-Konto | Apps bauen (EAS) | kostenlos (begrenzte Builds/Monat) |
| Apple Developer Program | nur für iPhone-Installation über TestFlight | 99 $/Jahr |
| Google Play Console | nur für den Play Store (APK geht ohne) | einmalig 25 $ |

Prüfen, ob Node installiert ist – im Terminal (macOS: „Terminal“, Windows: „PowerShell“):

```bash
node -v    # sollte v20… oder höher zeigen
```

---

## 1. Projekt herunterladen und installieren

```bash
git clone https://github.com/MentalistLab/Liftoff.git ascend
cd ascend
npm install
```

`npm install` dauert beim ersten Mal ein paar Minuten.

---

## 2. Die App sofort ausprobieren (ohne Supabase)

```bash
npx expo start
```

Im Terminal erscheint ein **QR-Code**:

- **iPhone:** Kamera-App öffnen, QR-Code scannen → „In Expo Go öffnen“.
- **Android:** In **Expo Go** auf „Scan QR code“ tippen.

Handy und Computer müssen im **selben WLAN** sein. Klappt das nicht: im Terminal `s` drücken oder
`npx expo start --tunnel` verwenden.

Ohne Supabase läuft die App im **lokalen Modus**: Onboarding, Rang, Workouts, Profil funktionieren – alles bleibt auf
dem Handy. Social zeigt Beispieldaten.

---

## 3. Supabase einrichten (Login, Freunde, Ligen)

> Es gibt bereits ein Live-Projekt „ascend“ (siehe `docs/PHASE2.md`). Willst du dieses nutzen, springe zu **3.5**.

### 3.1 Projekt anlegen
1. Auf [supabase.com](https://supabase.com) einloggen → **New project**.
2. Name `ascend`, ein sicheres Datenbank-Passwort (notieren!), Region **Central EU (Frankfurt)**.
3. Warten, bis das Projekt bereit ist (~2 Minuten).

### 3.2 Supabase-CLI verbinden

```bash
npx supabase login                       # öffnet den Browser
npx supabase link --project-ref <REF>    # <REF> steht in der Projekt-URL: https://<REF>.supabase.co
```

### 3.3 Datenbank aufsetzen

```bash
npx supabase db push        # spielt alle Dateien aus supabase/migrations ein (Tabellen, Sicherheit, Liga-Cron)
```

Dann die Startdaten (Übungen + Abzeichen): Dashboard → **SQL Editor** → **New query** →
Inhalt von `supabase/seed.sql` einfügen → **Run**.

Danach im selben SQL Editor die beiden Geheimnisse für die wöchentliche Liga-Auswertung anlegen
(`<REF>` ersetzen):

```sql
select vault.create_secret('https://<REF>.supabase.co', 'project_url');
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret');
```

### 3.4 Server-Funktionen hochladen

```bash
npx supabase functions deploy finish-workout
npx supabase functions deploy generate-plan
npx supabase functions deploy delete-account
npx supabase functions deploy league-weekly --no-verify-jwt
```

Optional: Soll der Trainingsplan von Claude statt vom kostenlosen Regel-Generator kommen, im Dashboard unter
**Edge Functions → Secrets** `ANTHROPIC_API_KEY` setzen. Ohne Key funktioniert alles trotzdem.

### 3.5 App mit Supabase verbinden

1. Dashboard → **Project Settings → API**: „Project URL“ und den **anon / publishable key** kopieren.
2. Im Projektordner:

   ```bash
   cp .env.example .env        # Windows: copy .env.example .env
   ```

3. `.env` öffnen und eintragen:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

   Nur den **anon**-Key! Den `service_role`-Key niemals in die App oder ins Git.

4. Expo neu starten: `npx expo start -c` (`-c` leert den Cache, damit `.env` gelesen wird).

### 3.6 Login-Einstellungen
Dashboard → **Authentication → Sign In / Providers → Email**:
- Zum Testen kannst du **Confirm email** ausschalten – dann bist du nach der Registrierung sofort drin.
- Für echte Nutzer wieder einschalten.

---

## 4. Tests

```bash
npm test             # 99 Unit-Tests: Rang-Algorithmus, XP, Streak, Ligen, Plan, Workout-Auswertung …
npm run typecheck    # TypeScript-Prüfung
npx expo-doctor      # prüft die Expo-Konfiguration
```

---

## 5. Als echte App installieren (EAS Build)

Expo Go ist zum Entwickeln. Für eine **eigene App auf dem Homescreen** baut Expo in der Cloud.

### 5.1 Einmalig vorbereiten

```bash
npm install -g eas-cli
eas login                  # mit deinem Expo-Konto
eas init                   # verknüpft das Projekt, schreibt die projectId in app.json
```

**Bundle-ID anpassen:** In `app.json` stehen `com.maxi1233.ascend` (iOS `bundleIdentifier`, Android `package`).
Ersetze das durch etwas Eindeutiges, z. B. `com.deinname.ascend` (aktuell: `com.maxi1233.ascend`) – es muss weltweit einmalig sein und lässt sich
nach der ersten Veröffentlichung nicht mehr ändern.

**Supabase-Keys für Builds:** `.env` wird nicht in die Cloud hochgeladen. Einmalig als EAS-Umgebungsvariablen anlegen:

```bash
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://<REF>.supabase.co --environment preview --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment preview --environment production --visibility plaintext
```

### 5.2 Android: APK zum direkten Installieren

```bash
eas build -p android --profile preview
```

Nach ~10–20 Minuten bekommst du einen Link + QR-Code. Auf dem Android-Handy öffnen → APK herunterladen →
installieren (einmalig „Installation aus unbekannten Quellen“ erlauben).

### 5.3 iPhone: TestFlight

Voraussetzung: Mitgliedschaft im [Apple Developer Program](https://developer.apple.com/programs/).

```bash
eas build -p ios --profile production     # fragt nach deinem Apple-Login und erstellt Zertifikate automatisch
eas submit -p ios --latest                # lädt den Build zu App Store Connect hoch
```

Dann in [App Store Connect](https://appstoreconnect.apple.com) → deine App → **TestFlight**: dich selbst als Tester
eintragen. Auf dem iPhone die App **TestFlight** installieren → Einladung annehmen → Ascend installieren.
Die erste Verarbeitung bei Apple dauert oft 10–30 Minuten.

### 5.4 Play Store (optional)

```bash
eas build -p android --profile production   # erzeugt ein .aab
eas submit -p android --latest              # in der Play Console vorher die App anlegen
```

### Build-Profile (`eas.json`)

| Profil | Ergebnis | Wofür |
|---|---|---|
| `development` | Android-APK / iOS intern | interne Testgeräte |
| `preview` | Android-**APK**, iOS Ad-hoc | schnell an Freunde verteilen |
| `production` | Android-**AAB**, iOS für den App Store | TestFlight / Stores, Build-Nummer zählt automatisch hoch |

---

## 6. Projektstruktur

```
app/                    Screens (Expo Router)
  onboarding.tsx        16 Schritte bis zum ersten Rang
  (tabs)/               home · train · ranks · social · profile
  workout/              aktives Workout, Zusammenfassung
components/             ui/ (Design-System), onboarding/, workout/, social/, profile/, charts/, fx/
theme/                  Design-Tokens (Farben, Typo, Abstände)
lib/                    Rang-/XP-/Liga-Logik, Supabase, Sync, i18n
stores/                 Zustand (persistiert: Einstellungen, Onboarding, Workouts)
hooks/                  Datenabfragen (TanStack Query)
locales/                de.json, en.json
supabase/               Migrationen, Seed, Edge Functions, RLS-Tests
docs/                   PHASE2.md (Backend), PHASE3.md (App)
scripts/                generate-seed.ts, generate-icons.js
```

App-Icon und Splash ändern: Farben/Formen in `scripts/generate-icons.js` anpassen, dann `node scripts/generate-icons.js`.

---

## 7. Häufige Probleme

| Problem | Lösung |
|---|---|
| QR-Code öffnet nichts / lädt ewig | Gleiches WLAN? Sonst `npx expo start --tunnel`. |
| „Demo-Modus“ obwohl `.env` ausgefüllt | `npx expo start -c` (Cache leeren). Variablen müssen mit `EXPO_PUBLIC_` beginnen. |
| Registrierung: „Bestätige deine E-Mail“ | Mail-Link öffnen oder in Supabase „Confirm email“ ausschalten (3.6). |
| Workout wird nicht hochgeladen | Bleibt lokal gespeichert und wird beim nächsten App-Start nachgereicht. Angemeldet? Functions deployt (3.4)? |
| Liga bleibt leer | Du kommst automatisch in eine Liga, sobald dein erstes Workout auf dem Server ausgewertet wurde (angemeldet + online). Die Sonntags-Auswertung braucht die Vault-Secrets aus 3.3. |
| `npm install` meldet Peer-Dependency-Konflikte | `.npmrc` mit `legacy-peer-deps=true` liegt bei – einfach `npm install` erneut ausführen. |
| iOS-Build: Bundle-ID schon vergeben | In `app.json` eine eigene Bundle-ID setzen (5.1). |
