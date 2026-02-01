# ☑️ Check IT

Check IT ist eine praktische Einkaufsliste, bei der man sich keine Sorgen um Funklöcher im Supermarkt machen muss. Man kann alles ganz normal abhaken, während man offline ist, und sobald man wieder Netz hat, synchronisiert sich die Liste automatisch. Man sieht auch direkt, wer was wann erledigt hat. Falls mal zwei Leute gleichzeitig denselben Artikel bearbeiten, zeigt die App bei einem Konflikt einfach beide Namen an, damit nichts untergeht. Geplant ist außerdem, das Offline-Thema später vielleicht über BitChat zu lösen. Teilen lässt sich die Liste ganz unkompliziert über eigene URLs.

## Rollen

| member            | role                |
| ----------------- | ------------------- |
| 👑 Eva Stepanek   | Product Owner       |
| 💻 Andreas Maurer | Technical Architekt |
| 🐜 Felix Bayerl   | A-Meise             |
| 🐜 Jakob Jeindl   | B-Meise             |

## Verwendung

Ersätze <your password> mit einem selbstgewählten Passwort.

⚠️ Achtung, das Passwort darf nicht zu einfach sein (e.g. 1234), da sonst, je nach Datenbank und Version, der Container nicht startem könnte. 

**Windows**

```powershell
C:\> copy env-example .env
C:\> (Get-Content .env) ^
     -replace '[PASSWORD]', '<your password>' ^
     | Set-Content .env
C:\> docker compose -p checkit up -d
```

**Linux / Unix**

```bash
$ cp env-example .env
$ sed -i 's/\[PASSWORD\]/<your password>/g' .env
$ docker compose -p checkit up -d 
```



## Refrences

- [Borko Aufgabenstellung](https://github.com/TGM-HIT/syt-exercises/tree/main/docs/dezentraleSysteme_/sem10_mobileDienste_mobile-application)

- [CheckIT](https://github.com/TGM-HIT/syt5-gek1051-mobile-application-checkit)
