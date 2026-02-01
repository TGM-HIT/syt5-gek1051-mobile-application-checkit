TA: Andreas Maurer

# Technical Report

## Blake3

BLAKE3 gilt derzeit als einer der effizientesten Hashing-Algorithmen. Er übertrifft selbst hardwarebeschleunigtes SHA-256 in der Geschwindigkeit, da er auf einer Merkle-Baum-Struktur [1] basiert. Diese Architektur ermöglicht eine starke Parallelisierung der Berechnungen und macht BLAKE3 zur idealen Wahl für die Generierung unvorhersehbarer, performanter URLs für unsere Einkaufslisten

https://checkit.com/list/[LIST_HASH]

Um eine neue Einkaufsliste hinzuzufügen, wird die ID generiert, indem die Summe der **jemals** exestierten Listen mit dem Salt aus der `.env`-Datei addiert und anschließend mit BLAKE3 auf **128 BIT** gehasht wird. Der resultierende Hash dient als eindeutiger Identifikator für die URL (oben [LIST_HASH]). Das Verfahren lässt sich mit folgendem Pseudocode beschreiben: `blake3_hash(total_lists_created + salt)`

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

Der Produkt-Hash (oben PRODUCT_HASH) wird aus den Namen des Produkts generiert. Hierzu wird der Produktname zunächst normalisiert (leerzeichenbereinigt und kleingeschrieben) und anschließend mittels BLAKE3 **OHNE SALT** auf eine Länge von **64 Bit** gehasht.

https://checkit.com/list/d63bd9a826af91c1fea371965a64e150/063bd9a826af91c1

**Rationale**

Wir werden BLAKE3 verwenden, da er unvergleichbar effizient ist. Um zu verhindern, dass unbefugte Dritte durch einfaches Durchprobieren von Zahlenwerten (Iterieren) fremde Einkaufslisten finden können, verwenden wir zusätzlich einen Salt. Eine Schlüssellänge von 128 Bit bietet dabei eine so enorme Entropie, dass ein Brute-Force-Angriff nach menschlichem Ermessen schlichtweg unmöglich ist.

Beim Produkt-Hash hingegen ist die Ausgangslage eine andere: Da hier lediglich Kollisionen innerhalb einer begrenzten Liste vermieden werden müssen, ist eine Schlüssellänge von 64 Bit mehr als ausreichend. Solange man davon ausgeht, dass ein Benutzer pro Liste weniger als 610 Millionen Elemente verwaltet, bleibt das Risiko einer Kollision statistisch vernachlässigbar gering.

## BCrypt

[1] [Merkle tree - Wikipedia](https://en.wikipedia.org/wiki/Merkle_tree)
