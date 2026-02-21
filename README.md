# BRC Ägir Anwesenheit (MVP)

Diese App ist als **echte Mobile-App** für **iOS/iPadOS und Android** aufgebaut (Expo + React Native).

## Warum nicht nur Electron?

Electron ist sehr gut für Desktop (Windows/macOS/Linux), aber nicht als native iOS/Android App.
Für eure Anforderungen wurde daher ein mobiler Stack gewählt.

## Enthaltene Regeln

- Standardstatus jedes Athleten: **Anwesend**
- Es werden nur Krankmeldungen gespeichert
- Krankmeldung nur erlaubt, wenn der Trainingsbeginn mindestens **24 Stunden** in der Zukunft liegt
- 3 Trainingsgruppen mit je eigenen Trainingszeiten

## Gruppen im MVP

- Gruppe 1 (Junioren): Mo, Mi, Fr um 16:30
- Gruppe 2 (Jugend): Di, Do um 17:30, Sa um 10:00
- Gruppe 3 (Leistung): Mo, Di, Do, Fr um 18:00

## Schnellstart

1. Node.js 20+ installieren
2. Im Projektordner ausführen:

```bash
npm install
npm run start
```

3. Danach in Expo:
	- `a` für Android Emulator / angeschlossenes Gerät
	- `i` für iOS Simulator (nur auf macOS)
	- oder Expo Go auf echtem Gerät per QR Code

## Backend-Anbindung

Die App nutzt das Backend für Login, Passwort-Setup und Krankmeldungen.

- Standard: `http://localhost:4000`
- Für echte Geräte setze `EXPO_PUBLIC_API_BASE_URL` (z.B. `http://192.168.178.146:4000`)

## Projektstruktur

- `App.tsx` – UI und Ablauf der Krankmeldung
- `src/constants/groups.ts` – Trainingsgruppen und Zeiten
- `src/utils/schedule.ts` – Terminberechnung und 24h-Regel
- `src/storage/absenceStorage.ts` – lokale Speicherung (AsyncStorage)

## Nächste sinnvolle Schritte

- Login (Athlet/Elternteil) und Rollen
- Backend + Cloud-Sync für Traineransicht
- Push-Benachrichtigungen für bestätigte Meldungen
- Optional Desktop-Version zusätzlich mit Electron/Tauri