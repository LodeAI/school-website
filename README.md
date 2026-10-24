# Konijnenklas: maaltijden en opvang

Website waarop ouders van de Konijnenklas (De Triangel) maaltijden en naschoolse opvang doorgeven, met een aparte site voor de leerkracht.

- **Ouders:** `index.html`. Klas en kind kiezen, achternaam typen ter controle, dan twee tabbladen: maaltijden en opvang.
- **Leerkracht:** `leerkracht/`. Aanmelden met een wachtwoord, kinderen en hun fiche, klasgegevens, vrije dagen en pushmeldingen op de iPhone.
- **Licht of donker:** knop rechtsboven op beide sites. De keuze staat in de cookie `thema` op het toestel (een jaar geldig, voor beide sites samen). Standaard licht, ook als het toestel zelf donker staat. Het scriptje in de `<head>` zet het thema voor de eerste tekening, zodat er geen witte flits is.
- **Demo:** zonder Supabase-instellingen in `js/config.js`, of met `?demo` achter het adres, draait alles in de browser met voorbeeldkinderen. Het wachtwoord van de leerkracht is dan `konijn`.

## Regels

| | Maaltijden | Opvang |
|---|---|---|
| Dagen | ma, di, do, vr | ma tot vr (woensdag tot 14u) |
| Altijd grijs | woensdag, weekend, vakanties en vrije dagen | weekend, vakanties en vrije dagen |
| Aanpassen tot | de laatste dag van de vorige maand | de dag voordien, 23:59 |
| Versturen | vergrendelt niets; opnieuw versturen mag tot de deadline | idem |

De database controleert dezelfde regels nog eens (`supabase/migrations`), los van wat de pagina doet. Elke verzending met echte wijzigingen komt in `inzendingen` en stuurt via de Edge Function `melding` een pushmelding naar de leerkracht. Een tik op de melding opent `leerkracht/#kind=<id>`.

## Opbouw

```
index.html               ouderpagina
leerkracht/              leerkrachtensite (web-app voor het beginscherm, met service worker)
css/stijl.css            gedeelde stijl
js/kalender.js           datums, schooljaar, kalenderweergave
js/api.js                Supabase of demo, met dezelfde regels
js/ouder.js, js/leerkracht.js
js/config.js             Supabase-adres, publieke sleutel, VAPID-publieke sleutel
supabase/migrations/     tabellen, functies, Vlaamse schoolkalender
supabase/functions/melding/  pushmeldingen (web-push)
```

Geen buildstap: wat in de repo staat, staat op GitHub Pages.

## Lokaal bekijken

```
python3 -m http.server 8765
```

Dan `http://127.0.0.1:8765/?demo` en `http://127.0.0.1:8765/leerkracht/?demo`.

## Nieuw schooljaar

Voeg de vakanties toe als nieuwe migratie in de vorm van `20261024120100_vlaamse_kalender.sql` (bron: vlaanderen.be, schoolvakanties). 2026-2027 en 2027-2028 staan er al in.
