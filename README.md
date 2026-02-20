# ☑️ Check IT

Check IT ist eine praktische Einkaufsliste, bei der man sich keine Sorgen um
Funklöcher im Supermarkt machen muss. Man kann alles ganz normal abhaken,
während man offline ist, und sobald man wieder Netz hat, synchronisiert sich die
Liste automatisch. Man sieht auch direkt, wer was wann erledigt hat. Falls mal
zwei Leute gleichzeitig denselben Artikel bearbeiten, zeigt die App bei einem
Konflikt einfach beide Namen an, damit nichts untergeht. Geplant ist außerdem,
das Offline-Thema später vielleicht über BitChat zu lösen. Teilen lässt sich die
Liste ganz unkompliziert über eigene URLs.

## Rollen

| member            | role                |
| ----------------- | ------------------- |
| 👑 Eva Stepanek   | Product Owner       |
| 💻 Andreas Maurer | Technical Architect |
| 🐜 Felix Bayerl   | A-Meise             |
| 🐜 Jakob Jeindl   | B-Meise             |

## Technologien

- Docker

- Java 21

- Vue.js latest

## Verwendung

Kopiere das `env-example` zu einem `.env` und ersätze **alle** mit eckigen
Klammern markierten Platzhalter, wie `[PASSWORD]` mit sinnvollen Werten. Der **Pepper** ist das backend Geheimnis und kann irgend ein String sein, aber einfachheitshalber ist es standardmäßig gleich mit dem Passwort. 

⚠️ Das Passwort darf nicht zu einfach sein (z.B.: 1234), da sonst, je nach
Datenbank und Version, der Container nicht starten könnte. Gehe auch sicher,
dass die gewählten Ports nicht bereits besetzt sind.

**Windows**

```powershell
C:\> docker compose -p checkit up --build -d
```

**Linux / Unix**

```bash
$ docker compose -p checkit up --build -d 
```

## Refrences

- [Check IT](https://github.com/TGM-HIT/syt5-gek1051-mobile-application-checkit)

- [Borko Aufgabenstellung](https://github.com/TGM-HIT/syt-exercises/tree/main/docs/dezentraleSysteme_/sem10_mobileDienste_mobile-application)

- [Pepper](https://en.wikipedia.org/wiki/Pepper_(cryptography))
