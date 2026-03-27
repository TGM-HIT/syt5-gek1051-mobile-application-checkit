# Technical Documentation

## Story 1 – Einkaufsliste anlegen

> Als Benutzer möchte ich eine Einkaufsliste anlegen können, um eine übersichtliche Liste meiner Einkaufsartikel zu sehen.

## Story 2 – Artikel hinzufügen und suchen

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

3. Artikel-Erstellung (addItem):
Ein neuer Artikel wird als Objekt vom Typ ListItem erstellt. Hierbei werden auch die Felder für Menge, Preis und Kategorie (selectedCategory) ausgelesen. Jeder Artikel erhält eine eindeutige ID via Date.now().toString(). Nach dem Hinzufügen zum Array wird das Feld geleert, um sofort für die nächste Suche bereit zu sein.


## Story 3 – Artikel entfernen

> Als Benutzer möchte ich Artikel aus meiner Übersicht entfernen, wenn ich sie nicht mehr brauche, um die Liste übersichtlich zu halten aber sie leicht wiederherstellen zu können.

## Story 4 – Sofortiges Hochladen von Änderungen

> Als Benutzer möchte ich, dass Änderungen sofort nach dem Tippen hochgeladen werden, um die aktuellen Änderungen zu sehen.

## Story 5 – Docker-Umgebung

> Als Benutzer möchte ich ein lauffähiges System in einer Docker-Umgebung nutzen, um es auch lokal zu verwenden und damit die Daten auch beim Schließen der App gespeichert werden, damit ich sie das Nächste Mal weiter verwenden kann.

## Story 6 – Warnung bei fehlender Internetverbindung

> Als Benutzer möchte ich gewarnt werden, wenn ich gerade keine Internetverbindung habe, um darauf aufmerksam zu werden, dass man vielleicht nicht die aktuellsten Daten hat.

## Story 7 – Offline weiterarbeiten

> Als Benutzer möchte ich offline weiterarbeiten und meine Änderungen lokal zwischenspeichern.

## Story 8 – Automatische Synchronisation

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

### Beispiel: Drei Personen, zwei Konflikte

Folgendes Szenario zeigt, wie die Konfliktbehandlung in der Praxis abläuft.

**Ausgangslage:** Anna, Ben und Clara teilen sich eine Einkaufsliste „Wocheneinkauf". Der aktuelle Stand ist Revision `2-abc` mit einem Artikel: „Milch – nicht erledigt".

---

**Schritt 1 – Anna und Ben gehen offline**

Anna und Ben verlieren die Internetverbindung. Clara bleibt online.

| Person | Status  | Lokale Revision |
| ------ | ------- | --------------- |
| Anna   | offline | `2-abc`         |
| Ben    | offline | `2-abc`         |
| Clara  | online  | `2-abc`         |

---

**Schritt 2 – Alle drei machen Änderungen**

- **Clara** (online) hakt „Milch" als erledigt ab → wird sofort zu CouchDB übertragen → CouchDB ist jetzt bei `3-xyz`.
- **Anna** (offline) fügt „Brot" zur Liste hinzu → gespeichert lokal als `3-anna`.
- **Ben** (offline) hakt „Milch" ebenfalls ab → gespeichert lokal als `3-ben`.

---

**Schritt 3 – Anna kommt online → erster Konflikt**

Anna geht wieder online. PouchDB versucht ihre Revision `3-anna` (Eltern-Revision: `2-abc`) zu CouchDB zu pushen. Aber CouchDB ist bereits bei `3-xyz` (Claras Version). Die Eltern-Revision stimmt nicht überein → **Konflikt**.

CouchDB speichert beide Versionen intern:

```
2-abc
├── 3-xyz   ← gewinnt (Claras Version – deterministisch anhand des Revisions-Hashes)
└── 3-anna  ← Konfliktrevision (Annas Version)
```

Die App erkennt `_conflicts: ["3-anna"]` und zeigt Anna (und Clara, sobald ihr Client das Update bekommt) das **⚠ Warnsymbol**.

**Anna klickt auf das Symbol.** Der Dialog zeigt die beiden Versionen nebeneinander:

| Version A (gewinnend – Clara) | Version B (Konflikt – Anna) |
| ----------------------------- | --------------------------- |
| Milch: ✅ erledigt             | Milch: ❌ nicht erledigt     |
| (kein Brot)                   | Brot: ❌ nicht erledigt      |

Anna wählt für „Milch" Version A (erledigt) und behält „Brot" aus ihrer eigenen Version. Sie klickt **Übernehmen**. Die App:

1. Löscht die Konfliktrevision `3-anna` aus CouchDB.
2. Speichert das zusammengeführte Dokument als neue Revision `4-merged` mit dem Metadatenfeld `conflictResolution: { resolvedBy: "anna", resolvedAt: "..." }`.

**Clara** erhält das Update via Live-Sync. Ihr Client sieht `conflictResolution` im Dokument und zeigt ebenfalls das ⚠ Symbol. Clara klickt darauf und sieht:

> „Dieser Konflikt wurde bereits von **anna** gelöst (20.03.2025, 10:30)."

Sie klickt **OK** – das Symbol verschwindet. Clara kann das Ergebnis nicht mehr rückgängig machen; wenn ihr das Ergebnis nicht passt, muss sie die betroffenen Artikel **manuell** ändern.

---

**Schritt 4 – Ben kommt online → zweiter Konflikt**

Jetzt geht Ben online. PouchDB versucht seine Revision `3-ben` (Eltern-Revision: `2-abc`) zu pushen. CouchDB ist bereits bei `4-merged`. Wieder stimmt die Eltern-Revision nicht überein → **zweiter Konflikt**.

```
4-merged
└── 3-ben  ← neue Konfliktrevision
```

Alle drei (Anna, Ben, Clara) sehen das ⚠ Symbol.

**Wer auch immer zuerst klickt, entscheidet.** Angenommen Ben klickt als Erster. Der Dialog zeigt:

| Version A (gewinnend – merged) | Version B (Konflikt – Ben) |
| ------------------------------ | -------------------------- |
| Milch: ✅ erledigt              | Milch: ✅ erledigt          |
| Brot: ❌ nicht erledigt         | (kein Brot)                |

„Milch" ist in beiden Versionen gleich → nur für „Brot" muss Ben entscheiden. Er wählt Version A (Brot bleibt) und klickt **Übernehmen**. Das neue Dokument `5-merged2` wird mit `conflictResolution: { resolvedBy: "ben", ... }` gespeichert.

**Anna und Clara** sehen beim nächsten Klick auf das Symbol:

> „Dieser Konflikt wurde bereits von **ben** gelöst."

Beide klicken **OK**. Wenn Anna oder Clara mit Bens Entscheidung nicht einverstanden sind, können sie Brot manuell aus der Liste entfernen – eine erneute Konfliktauflösung über den Dialog ist nicht möglich, da kein CouchDB-Konflikt mehr vorliegt.

---

### Zusammenfassung der Regeln

| Situation                                               | Verhalten                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Konflikt offen, Nutzer klickt zuerst                    | Zeigt Versions-Vergleich, Nutzer wählt pro Artikel die gewünschte Version |
| Konflikt bereits gelöst, anderer Nutzer klickt          | Zeigt „bereits gelöst von [Name]", nur OK möglich                         |
| Nutzer mag das Ergebnis nicht                           | Muss Artikel manuell ändern – kein erneuter Konfliktdialog                |
| Konflikt automatisch lösbar (beide Versionen identisch) | Wird ohne Dialog im Hintergrund aufgelöst                                 |

## Story 9 – Artikel in Kategorien einteilen

> Als Benutzer möchte ich meine Artikel in Kategorien einteilen, um sie besser zu finden.

## Story 10 – Technical Report

> Als Techincal Architect will ich einen Technical Report haben, welche die verwendeten Technologien den Teammitgliedern näher bringt, damit sie effizient arbeiten können.

## Story 11 – Dokumentation und Issue-Verwaltung

> Als Product Owner möchte ich eine übersichtliche Dokumentation und Issue verwaltung sicherstellen, um den Erfolg des Projekts zu garantieren.

Zur Überwachung und Übersicht wurde ein Kanban Board in Github erstellt. Dort gibt es die Lanes ToDo, In Progress, Test, Review, Done.

## Story 12 – Einladungscode generieren

> Als Benutzer möchte ich einen Einladungscode generieren, um meine Liste zu teilen.

## Story 13 – Liste beitreten

> Als Benutzer möchte ich einen Code eingeben, um einer Liste beizutreten.

## Story 14 – Synchronisationsstatus anzeigen

> Als Benutzer möchte ich durch Symbole sehen, ob meine Artikel bereits synchronisiert sind, um den Überblick zu behalten.

## Story 15 – Artikel bearbeiten und Zeitstempel

> Als Benutzer möchte ich bestehende Artikel in der Liste nachträglich bearbeiten können, um Änderungen umzusetzen und jeder Artikel soll einen Zeitstempel besitzen, um Änderungen erkennen zu können.

## Story 16 – Gelöschte Artikel synchronisieren

> Als Benutzer möchte ich, dass gelöschte Artikel auch auf den Geräten meiner Partner verschwinden, um die Liste übersichtlich zu halten.

## Story 17 – Fehlermeldungen bei Synchronisationsfehlern

> Als Benutzer möchte ich Fehlermeldungen erhalten, wenn eine Synchronisation fehlschlägt, um über meine falsche Eingabe informiert zu werden.

## Story 18 – Öffentliche URL

> Als Benutzer möchte ich die App über eine öffentliche URL erreichen können, um sie über einen Browser erreichen zu können und sie als App hinterlegen zu können bei der ebenfalls die Daten beim Schließen gespeichert werden.

## Story 19 – Verschlüsselte Benutzerdaten

> Als Benutzer möchte ich das meine Userdaten nur verschlüsselt abgespeichert werden, damit meine Daten sicher sind.

## Story 20 – Artikel per Bild hinzufügen

> Als Benutzer möchte ich anhand eines Bildes vom Preisschild einen Artikel hinzufügen.

## Story 21 – Artikel per Rezept hinzufügen

> Als Benutzer möchte ich Artikel anhand von gescannten Rezepten hinzufügen können, damit ich mir die manuelle Arbeit erspare.

## Story 22 – Private Liste

> Als Benutzer möchte ich ein private Liste erstellen können, damit ich anonym Einkaufen gehen kann.

## Story 23 – Authentifizierung

> Als Benutzer möchte ich mich authentifizieren können, damit ich meine erstellten Listen sehe.
