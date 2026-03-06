# Check-It: Frontend Developer Guide

Dieser Guide dient als strukturierter und kompakter Einstieg für die Arbeit am Frontend.

## Architektur & Frameworks

- **Vue 3:** Wir verwenden Vue 3 (Composition API) als primäres Frontend-Framework zum Bauen reaktiver Benutzeroberflächen. Es verknüpft das DOM mit unseren Datenmodellen. Als UI-Komponentenbibliothek kommt **Vuetify** zum Einsatz.
- **TypeScript statt JavaScript:** Dieses Projekt nutzt konsequent TypeScript. Die statische Typisierung hilft, Fehler schon zur Entwicklungszeit abzufangen, erleichtert sicheres Refactoring und bietet deutlich bessere Autovervollständigung in der IDE.

## Wichtigste Funktionen & Dateistruktur (`src/`)

Die Ansichten der App sind in eigene Views unterteilt, die im Vue Router (`main.ts`) konfiguriert sind:

1. `HomeView.vue` (Pfad: `/`): Die Startseite. Hier gibt man typischerweise Codes ein oder startet den Flow zum Erstellen von Listen.
2. `ListView.vue` (Pfad: `/list/:hash`): Die aktive Ansicht für eine spezifische Liste.
3. `SettingsView.vue` (Pfad: `/settings`): Ansicht für App- und Benutzereinstellungen.

Hilfsfunktionen (wie z.B. für Hashes) finden sich im Modul `utils/listHash.ts`.

## Authentifizierung

Die Authentifizierung in dieser App ist simpel gehalten: Beim ersten Aufruf wird der Nutzer per Prompt nach seinem **Namen** gefragt. 
Dieser eingegebene Name dient als primäre Identifizierung und wird anschließend in einem **Cookie** auf dem Gerät gespeichert, um bei weiteren Besuchen nahtlos identifiziert zu werden.

## Datenhaltung & Synchronisation (PouchDB / CouchDB)

Für eine robuste Offline-Fähigkeit speichern wir unsere Anwendungsdaten über **PouchDB** lokal im Browser zwischen.

- **Funktionsweise:** Die App liest und schreibt exklusiv in die lokale PouchDB. Darum lädt das Frontend sofort (Optimistic UI). 
- Im Hintergrund synchronisiert sich PouchDB automatisch bidirektional (via Replikation) mit der serverseitigen **CouchDB**. Sobald Netzempfang besteht, werden Änderungen vom Server geholt und unsere lokalen Änderungen hochgeladen, inklusive der Behandlung möglicher Konflikte.

### Vorschlag zur Dokumentenstruktur

In `docs/database.txt` wurde ein Schema mit `_id: AUTO_INCREMENT` skizziert. Bei dezentralen NoSQL/CouchDB-Systemen sind serielle IDs (Auto-Increment) schwer umsetzbar und führen zu Konflikten.
**Empfehlung:** Nutze für das CouchDB-Dokument direkt den **128-bit Listen-Hash als `_id`**. So erübrigen sich Lookup-Tabellen und Datenbankabfragen skalieren besser:

```json
{
  "_id": "blake128-hash-der-liste", 
  "name": "Liste1",
  "version": "timestamp",
  "articles": [
    {"name": "14", "gewicht": 5},
    {"name": "bier", "gewicht": 0.5}
  ]
}
```

*(Hinweis: Für sehr kollaborative Listen, bei denen viele Personen simultan Einträge anlegen, könnte es künftig besser sein, jeden Artikel als ein eigenes CouchDB-Dokument anzulegen. Für den Einstieg ist Arrays-Embedding aber vollkommen ausreichend).*

## Geplante Features: Time-restricted Codes

Für das Teilen von Listen sind zukünftig "Time-restricted Codes" vorgesehen. Anstatt den gesamten, langen Listen-Hash teilen zu müssen, wird es möglich sein, temporäre Kurzcodes (voraussichtlich nur die **ersten 6 Zeichen** des Hashes) zu nutzen. Diese eignen sich gut zum Vorlesen oder Abschreiben am Screen und verfallen nach einer bestimmten Zeit aus Sicherheitsgründen.

## Docker & Build-Prozess

Das Frontend liefert ein eigenes `Dockerfile` mit, das für Deployment oder Docker Compose gedacht ist. Es ist als optimierter **Multi-Stage Build** aufgebaut:

1. **Build Stage (`node:20-alpine`)**: Installiert alle Packages via `yarn` und führt den TypeScript-Compiler sowie Vite-Bundler aus (`yarn build`), um optimierte, statische Dateien zu generieren.
2. **Run Stage (`nginx:stable-alpine`)**: Übernimmt nur die fertigen, kompilierten HTML/JS/CSS-Dateien (aus `/dist`) und serviert diese über einen leichtgewichtigen Nginx-Webserver (Port 80). 
   **Vorteil:** Das fertige Container-Image beinhaltet weder Node.js noch den unkompilierten Source-Code und ist daher extrem ressourcenschonend und sicher in der Ausführung.
