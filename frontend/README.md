# Check-It: Frontend Developer Guide

Dieser Guide dient als strukturierter und kompakter Einstieg für die Arbeit am Frontend.

## Architektur & Frameworks

- **Vue 3 (Composition API):** Das primäre Frontend-Framework. Wir nutzen ausschließlich die Composition API mit `<script setup>` – keine Options API. Vue verknüpft das DOM reaktiv mit unseren Datenmodellen.
- **Vuetify 3:** UI-Komponentenbibliothek auf Basis von Material Design. Nahezu alle sichtbaren Elemente (Buttons, Cards, Dialoge, Tabellen) kommen von Vuetify.
- **TypeScript:** Das gesamte Projekt ist in TypeScript geschrieben. Alle Interfaces und Typen liegen zentral in `src/utils/types.ts`. Das hilft, Fehler zur Entwicklungszeit abzufangen und bietet bessere IDE-Unterstützung.
- **Vite:** Build-Tool und Dev-Server. Startet mit `yarn dev`, baut mit `yarn build`.

## Projektstruktur (`src/`)

```
src/
├── main.ts               # App-Einstiegspunkt: Vue, Vuetify, Router initialisieren
├── App.vue               # Root-Komponente: App-Bar (Login/Logout), Router-Outlet
├── assets/
│   └── main.css          # Globale Styles
├── views/                # Eine View = eine Route
│   ├── HomeView.vue      # /          → Listenübersicht, neue Liste erstellen
│   ├── ListView.vue      # /list/:hash → Aktive Einkaufsliste
│   ├── LoginView.vue     # /login     → Anmeldung
│   ├── RegisterView.vue  # /register  → Registrierung
│   ├── SettingsView.vue  # /settings  → App-Einstellungen
│   └── DebugView.vue     # /debug     → Entwicklerwerkzeuge
└── utils/
    ├── types.ts          # Gemeinsame TypeScript-Interfaces (ListItem, ListMeta, ...)
    ├── auth.ts           # Login, Logout, Registrierung, Session (Cookie)
    └── listHash.ts       # PouchDB-Instanzen, CouchDB-Sync, Listen erstellen
```

### Router (`main.ts`)

Die Routen sind in `main.ts` registriert. Die Route `/` hat das Flag `meta: { requiresAuth: true }` – der `beforeEach`-Guard leitet nicht eingeloggte Nutzer zur Login-Seite weiter.

## Authentifizierung (`utils/auth.ts`)

Die Authentifizierung ist vollständig clientseitig mit localStorage und einem Cookie umgesetzt – es gibt keinen separaten Auth-Server.

- **Registrierung:** Benutzername + Passwort werden validiert. Das Passwort wird mit **BLAKE2s-128** gehasht (via `blakejs`) und zusammen mit dem Benutzernamen in `localStorage` unter dem Schlüssel `checkit_accounts` gespeichert. Passwörter werden **nie im Klartext** gespeichert.
- **Login:** Der eingegebene Passwort-Hash wird mit dem gespeicherten verglichen. Bei Übereinstimmung wird der Benutzername als **Cookie** (`checkit_username`) für 1 Jahr gesetzt.
- **Session:** `currentUser` ist ein reaktives `ref<string | null>()` (exportiert aus `auth.ts`), das aus dem Cookie gelesen wird. Es kann direkt in Views mit `currentUser.value` verwendet werden.
- **Logout:** Cookie wird gelöscht, `currentUser` auf `null` gesetzt.

## Datenhaltung & Synchronisation (`utils/listHash.ts`)

Das Herzstück der App. Alle Daten liegen lokal in **PouchDB** (IndexedDB im Browser) und werden automatisch mit **CouchDB** synchronisiert.

### Zwei PouchDB-Instanzen

```typescript
const statsDb = new PouchDB('checkit_stats');  // Globaler Zähler (Listen insgesamt)
export const listDb = new PouchDB('checkit_lists'); // Alle Einkaufslisten + User-Indizes
```

### Live-Sync mit CouchDB

Beim Start der App (Modul-Initialisierung) wird ein bidirektionaler Live-Sync gestartet:

```typescript
listDb.sync(`${COUCHDB_URL}/checkit_lists`, { live: true, retry: true })
```

`retry: true` sorgt dafür, dass bei Verbindungsabbruch automatisch neu verbunden wird. Der Sync-Status (`connecting`, `active`, `paused`, `error`, `disabled`) ist als reaktives `ref` exportiert und wird in der `DebugView` angezeigt.

Die CouchDB-URL kommt aus der Umgebungsvariable `VITE_COUCHDB_URL` (in `.env` oder als Docker-Build-Arg gesetzt). Ist sie nicht gesetzt, läuft die App rein offline ohne Sync.

### Listen-Dokumente

Jede Liste ist ein CouchDB/PouchDB-Dokument mit dem Schema:

```json
{
  "_id": "a3f8c2d1e4b7...",
  "_rev": "3-abc123",
  "name": "Wocheneinkauf",
  "items": [
    { "id": "1700000000000", "name": "Milch", "menge": "2", "done": false, "category": "Milchprodukte" }
  ],
  "conflictResolution": {
    "resolvedBy": "anna",
    "resolvedAt": "2025-03-20T10:30:00.000Z"
  }
}
```

`conflictResolution` ist optional und wird nur nach einer manuellen Konfliktauflösung gesetzt.

### Listen-Hash-Generierung

Der `_id`-Hash einer neuen Liste wird deterministisch berechnet:

```typescript
const hash = blake2sHex(String(currentCount) + pepper, undefined, 16);
```

`currentCount` ist der globale Listenzähler aus `statsDb`, `pepper` kommt aus `VITE_PEPPER`. Dadurch sind Hashes ohne den Pepper nicht vorhersagbar (kein einfaches Durchzählen möglich).

### User-Listen-Index

Damit jeder Benutzer seine Listen sieht, wird beim Erstellen einer Liste ein Eintrag in einem Index-Dokument gespeichert:

```typescript
// Dokument-ID: "user_lists:anna"
{ "_id": "user_lists:anna", "lists": [{ "hash": "a3f8...", "name": "Wocheneinkauf", "createdAt": "..." }] }
```

## Konfliktbehandlung (Offline-Sync)

Wenn zwei Personen dieselbe Liste offline bearbeiten und dann wieder online gehen, entstehen CouchDB-Konflikte. Die App erkennt diese automatisch (via `{ conflicts: true }` beim Laden) und zeigt ein **⚠ Warnsymbol** in der Listen-Ansicht.

- **Klick auf das Symbol:** Öffnet einen Dialog, der die zwei Versionen gegenüberstellt. Der erste Nutzer, der klickt, entscheidet welche Version gewinnt.
- **Alle weiteren Nutzer:** Sehen dasselbe Warnsymbol, öffnen den Dialog, sehen aber nur die Nachricht „Konflikt wurde bereits von [Name] gelöst" und können nur mit **OK** bestätigen.
- **Detaillierte Beschreibung:** Siehe `docs/technical-documentation.md`, Story 8.

## Debug-Seite (`/debug`)

Die Debug-Seite ist unter `http://localhost/debug` erreichbar (nur für Entwicklung gedacht, kein Passwortschutz).

Sie zeigt:
- **CouchDB-Verbindungsstatus** (`connecting`, `active`, `paused`, `error`, `disabled`) mit Fehlermeldung falls vorhanden
- **Online/Offline-Toggle:** Pausiert bzw. reaktiviert die CouchDB-Synchronisation manuell – nützlich um Offline-Verhalten zu testen ohne das Netzwerk im Browser zu trennen
- **Hard Reset:** Löscht **alle Daten** aus PouchDB (lokal) **und** CouchDB (remote) und leitet zur Startseite weiter. Nur nach Bestätigung im Dialog ausführbar.

## Docker & Build-Prozess

Das Frontend hat ein eigenes `Dockerfile` als optimierten **Multi-Stage Build**:

1. **Build Stage (`node:20-alpine`):** Installiert alle Packages via `yarn install` (benötigt `yarn.lock`, das im Repo liegt) und baut das Projekt mit `yarn build`. Die Build-Args `VITE_COUCHDB_URL` und `VITE_PEPPER` werden als Umgebungsvariablen zur Build-Zeit eingesetzt.
2. **Run Stage (`nginx:stable-alpine`):** Kopiert nur die fertigen statischen Dateien aus `/dist` und serviert sie über Nginx auf Port 80.

Der gesamte Stack (Frontend, Backend, CouchDB) wird über `docker-compose.yml` im Wurzelverzeichnis orchestriert. Benötigte Umgebungsvariablen (`.env`-Datei im Wurzelverzeichnis):

```env
PASSWORD=dein-passwort
FRONTEND_PORT=80
BACKEND_PORT=8080
```

### Lokale Entwicklung ohne Docker

```bash
cd frontend
yarn install      # Abhängigkeiten installieren
yarn dev          # Dev-Server starten (http://localhost:5173)
yarn build        # Produktions-Build
yarn type-check   # TypeScript-Fehler prüfen ohne zu bauen
```

Für den Sync mit einer lokalen CouchDB eine `.env`-Datei anlegen:

```env
VITE_COUCHDB_URL=http://admin:password@localhost:5984
VITE_PEPPER=mein-pepper
```
