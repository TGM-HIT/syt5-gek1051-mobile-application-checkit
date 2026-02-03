TA: Andreas Maurer

# Technical Report

## Java 21

Wir werden Java 21 verwenden, da es sich hierbei um eine Long-Term-Support-Version (LTS) handelt, die von Spring Boot vollständig unterstützt wird. Dabei spielt der Anbieter eigentlich keine Rolle, standardmäßig ist `ms-21` konfiguriert. Java weist aufgrund des JVM-Designs und des Garbage Collectors gegenüber Sprachen wie Rust theoretische Performance-Nachteile auf. Rust ist zwar memory-safe und effizienter, erfordert jedoch eine deutlich steilere Lernkurve.

**Rationale**

Da wir in den letzten vier Jahren intensiv mit Spring Boot und Java gearbeitet haben, ist ein Wechsel auf Rust zum jetzigen Zeitpunkt nicht zielführend. Auch wenn Rust technisch gesehen **die überlegene Lösung** darstellt, steht die Produktivität des Teams im Vordergrund. Ein Technologiewechsel würde die Entwicklungsgeschwindigkeit massiv bremsen und die Projektsicherheit gefährden.

## Spring Boot 4.x.x

Da wir bereits umfassende Erfahrung mit dem Spring-Ökosystem gesammelt haben, werden wir für dieses Projekt die aktuelle Version **Spring Boot 4.x** einsetzen. Diese stellt mittlerweile den Industriestandard dar und bietet signifikante Performance-Vorteile. Bezüglich der spezifischen Libraries bleiben wir in der Umsetzung flexibel, doch als initiales Grundgerüst hätte ich gesagt:

- **Spring Web:** Als bewährtes Fundament für unsere RESTful Services.

- **SpringDoc OpenAPI:** Zur automatisierten Generierung der Swagger-Dokumentation, um eine nahtlose API-Kollaboration sicherzustellen.

- **Lombok:** Zur Reduzierung von Boilerplate-Code und Steigerung der Wartbarkeit.

- **MapStruct:** Für ein typsicheres und performantes Bean-Mapping zwischen unseren Entitäten und DTOs.

## Blake3

BLAKE3 gilt derzeit als einer der effizientesten Hashing-Algorithmen. Er übertrifft selbst hardwarebeschleunigtes SHA-256 in der Geschwindigkeit, da er auf einer Merkle-Baum-Struktur [1] basiert. Diese Architektur ermöglicht eine starke Parallelisierung der Berechnungen und macht BLAKE3 zur idealen Wahl für die Generierung unvorhersehbarer, performanter URLs für unsere Einkaufslisten

https://checkit.com/list/[LIST_HASH]

Um eine neue Einkaufsliste hinzuzufügen, wird die ID generiert, indem die Summe der **jemals** exestierten Listen **mit pepper** aus der `.env` Datei und  **ohne salt** addiert und mit BLAKE3 auf **128 bit** gehasht wird. Der resultierende Hash dient als eindeutiger Identifikator für die URL (oben [LIST_HASH]). Das Verfahren lässt sich mit folgendem Pseudocode beschreiben: `blake3_hash(total_lists_created)`

In CouchDB soll für jede neu erstellte Liste `global_stats.total_lists_created` um eins erhöht werden. Beispielsweise hier (die Namen können auch angepasst werden):

```json
{
  "_id": "global_stats",
  "total_lists_created": 1542,
  "type": "metadata"
}
```

Bei jedem erstellten Eintrag in der Liste wird ebenfalls eine eigene URL erstellt:

https://checkit.com/list/[LIST_HASH]/[PRODUCT_HASH]

Der Produkt-Hash (oben PRODUCT_HASH) wird aus den Namen des Produkts generiert. Hierzu wird der Produktname zunächst normalisiert (leerzeichenbereinigt und kleingeschrieben) und anschließend mittels BLAKE3 **ohne pepper** und **ohne salt** auf **64 bit** gehasht.

https://checkit.com/list/d63bd9a826af91c1fea371965a64e150/063bd9a826af91c1

**Rationale**

Wir werden BLAKE3 verwenden, da er unvergleichbar effizient ist. Um zu verhindern, dass unbefugte Dritte durch einfaches Durchprobieren von Zahlenwerten (Iterieren) fremde Einkaufslisten finden können, verwenden wir zusätzlich einen Salt. Eine Schlüssellänge von 128 Bit bietet dabei eine so enorme Entropie, dass ein Brute-Force-Angriff nach menschlichem Ermessen schlichtweg unmöglich ist.

Beim Produkt-Hash hingegen ist die Ausgangslage eine andere: Da hier lediglich Kollisionen innerhalb einer begrenzten Liste vermieden werden müssen, ist eine Schlüssellänge von 64 Bit mehr als ausreichend. Solange man davon ausgeht, dass ein Benutzer pro Liste weniger als 610 Millionen Elemente verwaltet, bleibt das Risiko einer Kollision statistisch vernachlässigbar gering.

## BCrypt

Wir werden den hashing Algorythmus BCrypt verwenden. Er ist ein rechenintensiver Hash, der Angriffe durch hohen CPU-Aufwand bremst. Da er jedoch kaum RAM benötigt, lässt er sich mit GPUs oder ASICs effizient parallelisieren, was ihn anfällig für moderne Hardware-Cluster macht. Der hashing Algorythmus Argon2id erzwingt dagegen eine hohe RAM-Belegung (Memory Hardness), was die Speicherbandbreite von Grafikkarten blockiert und Brute-Force-Angriffe extrem erschwert.

Die Authentifizierung ist ein Nice-To-Have. Zur Sicherung der Accounts werden die Passwörter zusammen mit einem globalen **Pepper** aus der `.env`-Datei  mithilfe von **BCrypt** gehasht.

`bcrypt_hash(plain_text_password + pepper)` 

**Rationale**

Trotz der Vorteile von Argon2id setzen wir für unser System auf BCrypt, um die Kompatibilität mit ressourcenarmen Embedded-Umgebungen zu gewährleisten und diese nicht unnötig zu belasten. Da Einkaufslisten keine hochsensiblen Daten enthalten, steht der Aufwand eines industrialisierten Cluster-Angriffs für Hacker in keinem wirtschaftlichen Verhältnis zum Nutzen. Zudem optimieren wir so die Deployment-Kosten, da durch den minimalen Speicherbedarf des Algorithmus die RAM-Anforderungen deutlich gesenkt werden können.

---

### Vue.js

Für das Frontend setzen wir auf Vue.js, um von unserer bestehenden Erfahrung zu profitieren. Das Framework ermöglicht uns eine schnelle Entwicklung bei gleichzeitig hoher Wartbarkeit. Unser Setup umfasst dabei folgende Kernkomponenten:

- **Vue Router:** Die offizielle Bibliothek für das Routing, um eine nahtlose Navigation zwischen den verschiedenen Ansichten (z. B. `/home`, `/dashboard`) innerhalb unserer Single Page Application (SPA) zu ermöglichen.

- **Axios:** Ein versprechensbasierter HTTP-Client, mit dem wir die Kommunikation zwischen dem Vue-Frontend und unserer Spring-Boot-API effizient abwickeln.

- **Vuetify:** Ein umfangreiches UI-Framework, das auf Google's *Material Design* basiert. Es bietet uns fertige, hochgradig anpassbare Komponenten (Buttons, Tabellen, Formulare), sodass wir kein eigenes CSS für das Design schreiben müssen und ein professionelles Look-and-Feel erhalten.



## Refrences

[1] [Merkle tree - Wikipedia](https://en.wikipedia.org/wiki/Merkle_tree)
