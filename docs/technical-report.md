TA: Andreas Maurer

# Technical Report

## Java 21

Wir verwenden Java 21, da es sich hierbei um eine Long-Term-Support-Version (LTS) handelt, die von Spring Boot vollständig unterstützt wird. Dabei spielt der Anbieter eigentlich keine Rolle, standardmäßig ist `eclipse-temurin:21` konfiguriert. Java weist aufgrund des JVM-Designs und des Garbage Collectors gegenüber Sprachen wie Rust theoretische Performance-Nachteile auf. Rust ist zwar memory-safe und effizienter, erfordert jedoch eine deutlich steilere Lernkurve.

**Rationale**

Da wir in den letzten vier Jahren intensiv mit Spring Boot und Java gearbeitet haben, ist ein Wechsel auf Rust zum jetzigen Zeitpunkt nicht zielführend. Auch wenn Rust technisch gesehen **die überlegene Lösung** darstellt, steht die Produktivität des Teams im Vordergrund. Ein Technologiewechsel würde die Entwicklungsgeschwindigkeit massiv bremsen und die Projektsicherheit gefährden.

## Spring Boot 4.0.2

Da wir bereits umfassende Erfahrung mit dem Spring-Ökosystem gesammelt haben, setzen wir auf **Spring Boot 4.0.2**. Diese stellt mittlerweile den Industriestandard dar und bietet signifikante Performance-Vorteile. Das Backend dient primär als Einstiegspunkt und REST-Schicht; die Datenhaltung übernimmt CouchDB direkt. Die verwendeten Dependencies:

- **Spring Web (`spring-boot-starter-webmvc`):** Fundament für RESTful Services.

> **Geändert gegenüber Plan:** SpringDoc OpenAPI, Lombok und MapStruct wurden nicht eingesetzt. Der Umfang des Backends ist geringer als ursprünglich geplant, da die Datenlogik vollständig über PouchDB ↔ CouchDB abgebildet wird und kein eigener ORM-Layer benötigt wird.

## BLAKE2s-128

~~BLAKE3~~ → **BLAKE2s-128** wird für die URL-Generierung der Einkaufslisten verwendet. Der Algorithmus ist Teil der BLAKE-Familie und bietet ausreichend Entropie bei minimaler Implementierungskomplexität im Browser. Eingesetzt wird die Library `blakejs` (v1.2.1).

Um eine neue Einkaufsliste anzulegen, wird der Hash wie folgt berechnet:

```
blake2s_128(String(total_lists_created) + PEPPER)
```

Der resultierende 32-stellige Hex-Hash dient als eindeutiger Identifikator in der URL:

```
https://checkit.com/list/[LIST_HASH]
```

`total_lists_created` wird in CouchDB unter `_id: "global_stats"` gespeichert:

```json
{
  "_id": "global_stats",
  "total_lists_created": 1542
}
```

> **Geändert gegenüber Plan:** Per-Artikel-URLs (`/list/[LIST_HASH]/[PRODUCT_HASH]`) wurden **nicht implementiert**. Artikel erhalten eine einfache numerische ID via `Date.now().toString()`. Kollisionen innerhalb einer Liste sind bei dieser Granularität praktisch ausgeschlossen.

**Rationale**

BLAKE2s-128 ist im Browser ohne WASM-Overhead verfügbar und liefert mit 128 Bit ausreichend Entropie, um Brute-Force-Enumeration fremder Listen zu verhindern. Der Pepper aus der `.env`-Datei verhindert zusätzlich, dass die Counter-Sequenz ohne Kenntnis des Secrets vorhergesagt werden kann.

## BLAKE2s-128 für Passwörter

~~BCrypt~~ → Die Passwort-Authentifizierung ist vollständig im Frontend implementiert (`src/utils/auth.ts`). Passwörter werden mit **BLAKE2s-128** gehasht und zusammen mit dem Benutzernamen im `localStorage` abgelegt:

```
blake2s_128(plain_text_password)
```

```typescript
// Speicherformat in localStorage ("checkit_accounts")
{ "alice": "a3f1...", "bob": "9c2e..." }
```

> **Geändert gegenüber Plan:** BCrypt wurde nicht eingesetzt. Da kein dedizierter Auth-Server vorhanden ist, erfolgt die Verifikation rein clientseitig. BCrypt wäre für serverseitige Authentifizierung die korrekte Wahl gewesen; im aktuellen Modell (lokaler Speicher) bringt die Rechenintensität von BCrypt keinen Sicherheitsgewinn.

**Rationale**

BLAKE2s-128 ist für den Anwendungsfall ausreichend: Einkaufslisten enthalten keine hochsensiblen Daten, und der Aufwand eines gezielten Angriffs auf `localStorage`-Daten übersteigt den Nutzen. Die Session wird über ein `SameSite=Lax`-Cookie mit einem Jahr Laufzeit gehalten.

---

## Yarn

Für das Projekt wurde bewusst Yarn gewählt, da er im Vergleich zu npm einige Vorteile bietet. Yarn ist performanter, und die deterministische `yarn.lock` garantiert, dass jeder Entwickler im Team exakt die gleiche Version aller Bibliotheken hat.

**Rationale**

Der Unterschied zu npm ist vom Schwierigkeitsgrad nicht sehr groß. Einige von uns haben bereits bei Firebase mit Yarn gearbeitet. Die "iT wOrKs oN mY MaChInE"-Probleme sind dadurch beseitigt.

## Vue.js 3 + Vite

Für das Frontend setzen wir auf **Vue.js 3** mit **Vite** als Build-Tool. Das Framework ermöglicht schnelle Entwicklung bei hoher Wartbarkeit. Unser Setup umfasst folgende Kernkomponenten:

- **Vue Router 4:** Routing innerhalb der SPA (z. B. `/`, `/list/:hash`, `/login`, `/register`).

- **Vuetify 3:** UI-Framework auf Basis von Material Design. Bietet fertige Komponenten (Buttons, Tabellen, Dialoge), sodass kein eigenes CSS für das Design nötig ist.

- **PouchDB 9:** Lokale In-Browser-Datenbank (IndexedDB-backed) mit bidirektionalem Live-Sync zu CouchDB. Ersetzt einen klassischen HTTP-Client gegenüber dem Backend vollständig für die Datenhaltung.

- **blakejs 1.2.1:** BLAKE2s-Implementierung in reinem JavaScript, eingesetzt für Listen-URL-Hashing und Passwort-Hashing.

- **Tesseract.js 7:** OCR-Library für die Preisschilderkennung (Story 20).

> **Geändert gegenüber Plan:** **Axios** wurde nicht eingesetzt. Das Frontend kommuniziert nicht über REST mit dem Spring-Boot-Backend, sondern schreibt und liest direkt über PouchDB ↔ CouchDB. Ein klassischer HTTP-Client ist daher nicht erforderlich.

**Rationale**

Wir kennen uns bereits mit Vue.js aus, und ein Umstieg auf React wäre nicht zielführend. Neue Vue-Versionen sind in der Performance mit anderen Frameworks vergleichbar.

## Datenbankstruktur

```json
// Globale Statistiken
{
  "_id": "global_stats",
  "total_lists_created": 1542
}

// Einkaufsliste
{
  "_id": "<blake2s-128-hash>",
  "name": "Wocheneinkauf",
  "items": [
    {
      "id": "1718000000000",
      "name": "Milch",
      "menge": "2",
      "preis": "1.29",
      "done": false,
      "category": "Milchprodukte",
      "updatedAt": "2025-03-20T10:00:00.000Z"
    }
  ],
  "savedAt": "2025-03-20T10:00:00.000Z",
  "savedBy": "alice",
  "conflictResolution": {
    "resolvedBy": "alice",
    "resolvedAt": "2025-03-20T10:05:00.000Z"
  }
}

// User-Listen-Index (pro Benutzer)
{
  "_id": "user_lists:alice",
  "lists": [
    { "hash": "d63bd9a8...", "name": "Wocheneinkauf", "createdAt": "2025-03-01T08:00:00.000Z" }
  ]
}
```

> **Geändert gegenüber Plan:** Feldnamen wurden angepasst: `articles` → `items`, `checked` → `done`, `gewicht` → `menge`. Das Feld `deleted` entfällt (CouchDB-Konflikte werden über `_conflicts` und `conflictResolution` behandelt). Versionierung erfolgt über CouchDB-eigenes `_rev` statt einem manuellen `version`-Timestamp. Neue Felder: `savedAt`, `savedBy`, `conflictResolution`, `preis`, `category`, `updatedAt`.

## References

[1] [Merkle tree - Wikipedia](https://en.wikipedia.org/wiki/Merkle_tree)
