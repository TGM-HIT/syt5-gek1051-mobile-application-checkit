# Technical Documentation

## Story 1 – Einkaufsliste anlegen

*HEAD: BAYF | Prio: MH | SP: 8*

> Als Benutzer möchte ich eine Einkaufsliste anlegen können, um eine übersichtliche Liste meiner Einkaufsartikel zu sehen.

- Identifikation: Jede Liste wird über einen Hash (ID) identifiziert, 
der als URL-Parameter (/list/:hash) dient.

- Lokal: PouchDB (listDb) speichert das Dokument mit der ID des Hashs.

- Remote: Automatische Synchronisation mit CouchDB, 
sobald eine Verbindung besteht.

### Workflow
- Datenabruf: listDb.get<ListMeta>(listHash.value) 
lädt den Namen der Liste und die zugehörigen items.



## Story 2 – Artikel hinzufügen und suchen

*HEAD: STEE | Prio: MH | SP: 5*

> Als Benutzer möchte ich neue Artikel zu meiner Liste hinzufügen können und auch in der Liste danach Suchen.

### Technische Umsetzung

Die Umsetzung erfolgt durch eine reaktive Verknüpfung der Eingabefelder mit dem lokalen State und der PouchDB.

1. Reaktivität & Suche:
   Das zentrale Eingabefeld ist per v-model an searchQuery gebunden. Diese Variable erfüllt eine Doppelfunktion:
   
    Suche: Eine computed property namens filteredList filtert das shoppingList-Array in Echtzeit:
    TypeScript
   
   ```
   const filteredList = computed(() => {
     if (!searchQuery.value) return shoppingList.value;
     const q = searchQuery.value.toLowerCase();
     return shoppingList.value.filter(i => i.name.toLowerCase().includes(q));
   });
   ```
   
    Hinzufügen: Beim Drücken der Enter-Taste oder des Plus-Buttons wird der Inhalt von searchQuery als Name für den neuen Artikel verwendet.

2. Artikel-Erstellung (addItem):
   Ein neuer Artikel wird als Objekt vom Typ ListItem erstellt. Hierbei werden auch die Felder für Menge, Preis und Kategorie (selectedCategory) ausgelesen. Jeder Artikel erhält eine eindeutige ID via Date.now().toString(). Nach dem Hinzufügen zum Array wird das Feld geleert, um sofort für die nächste Suche bereit zu sein.

## Story 3 – Artikel entfernen

*HEAD: JEIJ | Prio: MH | SP: 3*

> Als Benutzer möchte ich Artikel aus meiner Übersicht entfernen, wenn ich sie nicht mehr brauche, um die Liste übersichtlich zu halten aber sie leicht wiederherstellen zu können.

## Story 4 – Sofortiges Hochladen von Änderungen

*HEAD: JEIJ | Prio: SH | SP: 5*

> Als Benutzer möchte ich, dass Änderungen sofort nach dem Tippen hochgeladen werden, um die aktuellen Änderungen zu sehen.

## Story 5 – Docker-Umgebung

*HEAD: MAUA | Prio: MH | SP: 5*

> Als Benutzer möchte ich ein lauffähiges System in einer Docker-Umgebung nutzen, um es auch lokal zu verwenden und damit die Daten auch beim Schließen der App gespeichert werden, damit ich sie das Nächste Mal weiter verwenden kann.

### Technische Umsetzung

Das gesamte System besteht aus drei Docker-Services, definiert in `docker-compose.yml`:

| Service    | Basis-Image                     | Port                 | Aufgabe                         |
| ---------- | ------------------------------- | -------------------- | ------------------------------- |
| `frontend` | node:20-alpine → nginx          | `$FRONTEND_PORT:80`  | Vite-Build + nginx-Auslieferung |
| `backend`  | eclipse-temurin:21-jdk → 21-jre | `$BACKEND_PORT:8080` | Spring Boot REST API            |
| `db`       | couchdb:latest                  | `5984:5984`          | CouchDB-Datenbank               |

**Frontend-Dockerfile** (multi-stage): Node 20 Alpine baut die Vite-App (`yarn build`) mit den Build-Args `VITE_COUCHDB_URL` und `VITE_PEPPER`. Das fertige `dist/`-Verzeichnis wird in ein nginx-Alpine-Image kopiert.

**Backend-Dockerfile** (multi-stage): eclipse-temurin:21-jdk baut via Gradle (`./gradlew bootJar`) ein ausführbares Fat-JAR, das im schlanken JRE-Image gestartet wird.

**Konfiguration** erfolgt über eine `.env`-Datei mit den Variablen `PASSWORD`, `FRONTEND_PORT` und `BACKEND_PORT`. Das CouchDB-CORS-Setup wird per Volume-Mount (`couchdb-config/local.ini`) eingespielt. Datenpersistenz über Page-Reloads hinweg übernimmt PouchDB via IndexedDB im Browser.

## Story 6 – Warnung bei fehlender Internetverbindung

*HEAD: JEIJ | Prio: MH | SP: 3*

> Als Benutzer möchte ich gewarnt werden, wenn ich gerade keine Internetverbindung habe, um darauf aufmerksam zu werden, dass man vielleicht nicht die aktuellsten Daten hat.

## Story 7 – Offline weiterarbeiten

*HEAD: MAUA | Prio: MH | SP: 5*

> Als Benutzer möchte ich offline weiterarbeiten und meine Änderungen lokal zwischenspeichern.

### Technische Umsetzung

Die Offline-Fähigkeit basiert auf **PouchDB mit IndexedDB** als lokalem Speicher. Alle Listenänderungen werden sofort in die lokale PouchDB geschrieben — unabhängig davon, ob eine Netzwerkverbindung besteht. Es gibt zwei Offline-Modi:

**Echter Offline-Modus:** Die App lauscht auf die Browser-Events `online` und `offline` (`navigator.onLine`) und setzt das reaktive Flag `isOffline`. Die UI zeigt einen Hinweis, Änderungen werden weiterhin lokal gespeichert.

**Simulierter Offline-Modus** (`toggleOffline()` in `listHash.ts`): Bricht beide aktiven CouchDB-Sync-Instanzen (`listSync.cancel()`, `statsSync.cancel()`) ab und setzt `couchDbStatus` auf `'disabled'`. Der Zustand wird in `sessionStorage` persistiert, sodass er einen Page-Reload überlebt. Beim Wechsel zurück online werden die Syncs mit `startListSync()` / `startStatsSync()` neu gestartet.

Noch nicht synchronisierte Artikel werden in `pendingItemIds` verfolgt und in der UI mit einem Upload-Icon (`mdi-cloud-upload-outline`) markiert.

## Story 8 – Automatische Synchronisation

*HEAD: MAUA | Prio: MH | SP: 5*

> Als Benutzer möchte ich, dass meine Offline-Daten automatisch synchronisieren, sobald ich wieder Netz habe, um Konflikte zu vermeiden.

### Technische Umsetzung

Die Synchronisation basiert auf **PouchDB** (lokal im Browser, via IndexedDB) und **CouchDB** (Server). Beim Start der App wird ein bidirektionaler Live-Sync eingerichtet:

```typescript
listDb.sync(`${COUCHDB_URL}/checkit_lists`, { live: true, retry: true })
```

Solange eine Internetverbindung besteht, werden Änderungen in Echtzeit zwischen Browser und Server übertragen. Geht die Verbindung verloren, arbeitet die App weiter mit den lokalen PouchDB-Daten. Sobald die Verbindung wiederhergestellt ist, versucht PouchDB (`retry: true`) automatisch neu zu synchronisieren und überträgt alle zwischengespeicherten Änderungen.

### Das Revisions-System von CouchDB

Jedes Dokument in CouchDB hat ein `_rev`-Feld (Revision), z.B. `"3-a1b2c3d4..."`. Beim Speichern muss die aktuelle Revision mitgesendet werden. Stimmt sie nicht mit der auf dem Server überein, lehnt CouchDB die Anfrage ab und erzeugt intern einen **Konflikt** – beide Versionen werden im Revisionsbaum gespeichert, eine als „gewinnende" (winning), die andere als versteckte Konfliktrevision.

### Konflikterkennung in der App

Beim Laden einer Liste wird das Dokument mit `{ conflicts: true }` abgefragt. Enthält das Dokument ein `_conflicts`-Array mit mindestens einem Eintrag, zeigt die App ein **⚠ Warnsymbol** neben dem Listentitel. Der Nutzer kann darauf klicken und den Konflikt manuell auflösen.

`_conflicts` kann **mehrere Einträge** enthalten — z.B. wenn zwei Personen offline waren und beide gleichzeitig wieder online gehen, bevor jemand den ersten Konflikt auflöst. Die App lädt in diesem Fall **alle** Konfliktrevisionen und zeigt sie gleichzeitig als N-Wege-Konflikt an.

### Konfliktauflösung

Beim Klick auf das ⚠-Symbol lädt `openConflictDialog` das winning-Dokument sowie **alle** Einträge aus `_conflicts`:

```typescript
const allDocs = [doc]; // winning revision
for (const rev of doc._conflicts) {
  allDocs.push(await listDb.get(listHash, { rev }));
}
```

Sind alle Versionen inhaltlich identisch, werden die Konfliktrevisionen automatisch gelöscht — kein Dialog nötig. Andernfalls wird für jede Version eine Karte angezeigt (2-Wege, 3-Wege oder mehr), beschriftet mit dem `savedBy`-Feld des jeweiligen Dokuments:

- Stimmt `savedBy` mit dem eingeloggten User überein → **„Deine Version"**
- Sonst → **„Version von [Name]"**

Der Nutzer klickt auf **„Diese Version wählen"** — die gewählte Version wird zur neuen Listenversion, alle anderen Konfliktrevisionen werden aus CouchDB gelöscht:

```typescript
await listDb.remove(listHash, rev); // für jede losing revision
```

Das aufgelöste Dokument wird mit dem Metadatenfeld `conflictResolution` gespeichert, das **alle Versionen als Snapshots** enthält, damit andere Nutzer später noch sehen können, was zur Wahl stand:

```typescript
conflictResolution: {
  resolvedBy: "anna",
  resolvedAt: "2025-03-20T10:05:00Z",
  versions: [
    { label: "Version von clara", items: [...], chosen: true },
    { label: "Deine Version",     items: [...], chosen: false },
    { label: "Version von ben",   items: [...], chosen: false },
  ]
}
```

### Beispiel: Drei Personen, ein Dreier-Konflikt

**Ausgangslage:** Anna, Ben und Clara teilen sich eine Einkaufsliste. Stand: Revision `2-abc`, Artikel: „Milch – nicht erledigt".

---

**Schritt 1 – Anna und Ben gehen offline, Clara bleibt online**

| Person | Status  | Lokale Revision |
| ------ | ------- | --------------- |
| Anna   | offline | `2-abc`         |
| Ben    | offline | `2-abc`         |
| Clara  | online  | `2-abc`         |

---

**Schritt 2 – Alle drei machen Änderungen**

- **Clara** (online) hakt „Milch" ab → CouchDB ist jetzt bei `3-clara`.
- **Anna** (offline) fügt „Brot" hinzu → lokal `3-anna`.
- **Ben** (offline) fügt „Butter" hinzu → lokal `3-ben`.

---

**Schritt 3 – Anna kommt online**

Anna synct ihre `3-anna` (Eltern: `2-abc`) gegen CouchDB `3-clara` → **Konflikt**.

```
2-abc
├── 3-clara  ← winning
└── 3-anna   ← _conflicts[0]
```

`_conflicts: ["3-anna"]` → ⚠ sichtbar für Anna und Clara. **Noch niemand löst auf.**

---

**Schritt 4 – Ben kommt online (Konflikt noch offen)**

Ben synct seine `3-ben` (Eltern: `2-abc`) gegen CouchDB → zweiter Konflikt wird zu `_conflicts` hinzugefügt.

```
2-abc
├── 3-clara  ← winning
├── 3-anna   ← _conflicts[0]
└── 3-ben    ← _conflicts[1]
```

`_conflicts: ["3-anna", "3-ben"]` → ⚠ für alle drei. Wer jetzt klickt, sieht **drei Versionen**:

| Version von clara | Deine Version (anna) | Version von ben |
| ----------------- | -------------------- | --------------- |
| Milch: ✅          | Milch: ❌             | Milch: ❌        |
| (kein Brot)       | Brot: ❌              | (kein Brot)     |
| (keine Butter)    | (keine Butter)       | Butter: ❌       |

Wer zuerst klickt, wählt eine Version → alle anderen Konfliktrevisionen werden gelöscht, `conflictResolution` gespeichert.

**Die anderen beiden** sehen beim Klick auf ⚠ den „bereits gelöst"-Dialog mit allen drei Versionen (die gewählte ist grün markiert) und klicken **OK**.

---

**Alternativ-Szenario: Anna löst auf, bevor Ben online kommt**

Wenn Anna den 2-Wege-Konflikt (`3-clara` vs `3-anna`) auflöst und erst danach Ben online geht, entsteht ein **neuer** 2-Wege-Konflikt zwischen dem aufgelösten Dokument und Bens Version — kein Dreier-Konflikt. Das Verhalten ist identisch, nur mit zwei statt drei Karten.

---

### Zusammenfassung der Regeln

| Situation                                      | Verhalten                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| 2 Versionen in `_conflicts`                    | Dialog zeigt 2 Karten nebeneinander, Nutzer wählt eine                      |
| 3+ Versionen in `_conflicts`                   | Dialog zeigt 3+ Karten (Dialog breiter), Nutzer wählt eine                  |
| Konflikt bereits gelöst, anderer Nutzer klickt | Zeigt alle Versionen read-only, gewählte grün hervorgehoben, nur OK möglich |
| Nutzer mag das Ergebnis nicht                  | Muss Artikel manuell ändern – kein erneuter Konfliktdialog                  |
| Alle Versionen inhaltlich identisch            | Wird ohne Dialog im Hintergrund aufgelöst                                   |

## Story 9 – Artikel in Kategorien einteilen

*HEAD: BAYF | Prio: MH | SP: 3*

> Als Benutzer möchte ich meine Artikel in Kategorien einteilen, um sie besser zu finden.

## Story 10 – Technical Report

*HEAD: MAUA | Prio: MH | SP: 5*

> Als Techincal Architect will ich einen Technical Report haben, welche die verwendeten Technologien den Teammitgliedern näher bringt, damit sie effizient arbeiten können.

### Technische Umsetzung

Der Report liegt unter `docs/technical-report.md` und dokumentiert die Technologieentscheidungen des Projekts:

- **Java 21 (LTS)** als Backend-Sprache — gewählt wegen bestehender Teamerfahrung mit Spring Boot gegenüber der technisch überlegenen, aber steileren Rust-Lernkurve.
- **Spring Boot 4.x** als REST-Framework, ergänzt durch SpringDoc OpenAPI (Swagger), Lombok und MapStruct.
- **BLAKE3** für die URL-Generierung der Einkaufslisten (`/list/[HASH]`) — schneller als SHA-256 durch Merkle-Baum-Parallelisierung. In der Implementierung wird BLAKE2s-128 via `blakejs` eingesetzt.

## Story 11 – Dokumentation und Issue-Verwaltung

*HEAD: STEE | Prio: MH | SP: 5*

> Als Product Owner möchte ich eine übersichtliche Dokumentation und Issue verwaltung sicherstellen, um den Erfolg des Projekts zu garantieren.

Zur Überwachung und Übersicht wurde ein Kanban Board in Github erstellt. Dort gibt es die Lanes ToDo, In Progress, Test, Review, Done. Die Stories können nur von mir (PO) oder TA (Maurer) abgenommen werden. Die möglichkeit in den main-branch zu mergen haben auch nur PO und TA. 

Jedes Teammitglied hat 25 Storypoints. Es gibt 11 MH, 7 SH und 4 N2H. 

Zur Kooridnation des Teams wurde eine Whatsappgruppe eingerichtet und dort wird regelmäßig der aktuelle Stand abgefragt und neue Aufgaben zu gewissen Terminen verteilt. 

Wöchentlch gibt es Meetings mit dem Kunden.

## Story 12 – Einladungscode generieren

*HEAD: BAYF | Prio: SH | SP: 3*

> Als Benutzer möchte ich einen Einladungscode generieren, um meine Liste zu teilen.

## Story 13 – Liste beitreten

*HEAD: BAYF | Prio: SH | SP: 3*

> Als Benutzer möchte ich einen Code eingeben, um einer Liste beizutreten.

## Story 14 – Synchronisationsstatus anzeigen

*HEAD: JEIJ | Prio: SH | SP: 3*

> Als Benutzer möchte ich durch Symbole sehen, ob meine Artikel bereits synchronisiert sind, um den Überblick zu behalten.

## Story 15 – Artikel bearbeiten und Zeitstempel

*HEAD: STEE | Prio: SH | SP: 5*

> Als Benutzer möchte ich bestehende Artikel in der Liste nachträglich bearbeiten können, um Änderungen umzusetzen und jeder Artikel soll einen Zeitstempel besitzen, um Änderungen erkennen zu können.

## Story 16 – Gelöschte Artikel synchronisieren

*HEAD: BAYF | Prio: MH | SP: 3*

> Als Benutzer möchte ich, dass gelöschte Artikel auch auf den Geräten meiner Partner verschwinden, um die Liste übersichtlich zu halten.

## Story 17 – Fehlermeldungen bei Synchronisationsfehlern

*HEAD: JEIJ | Prio: SH | SP: 3*

> Als Benutzer möchte ich Fehlermeldungen erhalten, wenn eine Synchronisation fehlschlägt, um über meine falsche Eingabe informiert zu werden.

## Story 18 – Öffentliche URL

*HEAD: STEE | Prio: SH | SP: 5*

> Als Benutzer möchte ich die App über eine öffentliche URL erreichen können, um sie über einen Browser erreichen zu können und sie als App hinterlegen zu können bei der ebenfalls die Daten beim Schließen gespeichert werden.

## Story 19 – Verschlüsselte Benutzerdaten

*HEAD: JEIJ | Prio: SH | SP: 3*

> Als Benutzer möchte ich das meine Userdaten nur verschlüsselt abgespeichert werden, damit meine Daten sicher sind.

## Story 20 – Artikel per Bild hinzufügen

*HEAD: JEIJ | Prio: SH/N2H | SP: 5*

> Als Benutzer möchte ich anhand eines Bildes vom Preisschild einen Artikel hinzufügen.

## Story 21 – Artikel per Rezept hinzufügen

*HEAD: BAYF | Prio: NH | SP: 5*

> Als Benutzer möchte ich Artikel anhand von gescannten Rezepten hinzufügen können, damit ich mir die manuelle Arbeit erspare.

## Story 22 – Private Liste

*HEAD: STEE | Prio: NH | SP: 5*

> Als Benutzer möchte ich ein private Liste erstellen können, damit ich anonym Einkaufen gehen kann.

## Story 23 – Authentifizierung

*HEAD: MAUA | Prio: NH | SP: 5*

> Als Benutzer möchte ich mich authentifizieren können, damit ich meine erstellten Listen sehe.

### Technische Umsetzung

Die Authentifizierung ist vollständig im Frontend implementiert (`src/utils/auth.ts`) — ohne Backend-Aufruf.

**Accountspeicherung:** Accounts werden als JSON-Objekt im `localStorage` unter dem Key `checkit_accounts` gespeichert. Passwörter werden vor der Ablage mit **BLAKE2s-128** (via `blakejs`) gehasht. Ein optionaler Pepper (`VITE_PEPPER`) aus der Build-Konfiguration wird dabei eingerechnet.

**Session:** Der eingeloggte Benutzername wird als Cookie `checkit_username` (max-age: 1 Jahr, SameSite=Lax) gespeichert. Das reaktive `currentUser`-Ref (Vue `ref<string | null>`) wird beim Modulstart aus dem Cookie initialisiert und steht app-weit zur Verfügung.

**API:**

| Funktion                       | Beschreibung                                  |
| ------------------------------ | --------------------------------------------- |
| `register(username, password)` | Legt neuen Account an, setzt Cookie           |
| `login(username, password)`    | Prüft Hash-Übereinstimmung, setzt Cookie      |
| `logout()`                     | Löscht Cookie, setzt `currentUser` auf `null` |

Jede neu erstellte Liste wird dem eingeloggten User zugeordnet (`recordListForUser`), sodass die Startseite nur die eigenen Listen anzeigt.
