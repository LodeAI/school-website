# School-website (konijnenklas)

Website voor ouders van een peuterklas om maaltijden en naschoolse opvang door te geven, plus een beheerpagina voor de leerkracht. Adres: https://konijnenklas.lvit.be/ (ouders) en https://konijnenklas.lvit.be/leerkracht/ (leerkracht). DNS: CNAME `konijnenklas` naar `lodeai.github.io` bij lvit.be (nameservers zxcs), `CNAME`-bestand in de repo. **Geen README**: Lode wil die niet in de openbare repo.

## Afspraken

- **Alles in het Nederlands:** code-commentaar, teksten, documentatie, commitboodschappen en gesprekken.
- **Git:** committen als **Lode Verschelde** met het e-mailadres van LodeAI (lokaal ingesteld in deze repo). Nooit een tak, alles rechtstreeks op `main`. Remote: `https://LodeAI@github.com/LodeAI/school-website.git` (de `LodeAI@` nooit weghalen).
- **Supabase:** eigen account van Lode, gescheiden van de Nutri-projecten. De CLI op deze Mac is aangemeld bij Nutri's organisatie; voor dit project altijd `SUPABASE_ACCESS_TOKEN` uit de sleutelhanger gebruiken (dienst `supabase-school`), nooit `supabase login` doen.
- **Geen gedachtestreepjes** (het lange streepje) in teksten.
- **Regels dubbel:** wat de pagina afdwingt (deadlines, grijze dagen) moet ook in de SQL-functies staan, en omgekeerd. De demo in `js/api.js` volgt dezelfde regels.
- **Testen:** elke wijziging aan de voorkant bekijken in een echte browser op gsm-breedte (390 px), in demomodus.

## Technisch overzicht (was README.md, verwijderd op vraag van Lode)

Website waarop ouders van de Konijnenklas (De Triangel) maaltijden en naschoolse opvang doorgeven, met een aparte site voor de leerkracht.

- **Ouders:** `index.html`. Klas en kind kiezen, achternaam typen ter controle, dan twee tabbladen: maaltijden en opvang.
- **Leerkracht:** `leerkracht/`. Aanmelden met een wachtwoord, kinderen en hun fiche, klasgegevens, vrije dagen en pushmeldingen op de iPhone.
- **Licht of donker:** knop rechtsboven op beide sites. De keuze staat in de cookie `thema` op het toestel (een jaar geldig, voor beide sites samen). Standaard licht, ook als het toestel zelf donker staat. Het scriptje in de `<head>` zet het thema voor de eerste tekening, zodat er geen witte flits is.
- **Taal (alleen ouderpagina):** knop rechtsboven naast de themaknop toont de code (NL, EN, FR, ES, IT, KO); een tik opent de keuzelijst van het toestel. De keuze staat in de cookie `taal` (een jaar geldig, per toestel, niet per kind). Standaard NL. Het scriptje in de `<head>` zet de taal voor de eerste tekening; vaste teksten hebben `data-t` en blijven onzichtbaar tot ze vertaald zijn, dus geen Nederlandse flits. Alle teksten staan in `js/teksten.js` (Nederlands is de bron, ontbrekende sleutels vallen terug op NL). Foutmeldingen van de database blijven Nederlands in SQL; de pagina toont in een andere taal een vertaalde, algemenere zin. Vakantienamen uit de Vlaamse kalender worden vertaald, eigen vrije dagen van de leerkracht niet. De leerkrachtensite en de meldingen naar de leerkracht blijven Nederlands.
- **Demo:** zonder Supabase-instellingen in `js/config.js`, of met `?demo` achter het adres, draait alles in de browser met voorbeeldkinderen. Het wachtwoord van de leerkracht is dan `konijn`.

### Regels

| | Maaltijden | Opvang |
|---|---|---|
| Dagen | ma, di, do, vr | ma tot vr (woensdag tot 14u) |
| Altijd grijs | woensdag, weekend, vakanties en vrije dagen | weekend, vakanties en vrije dagen |
| Aanpassen tot | de laatste dag van de vorige maand | de dag voordien, 23:59 |
| Versturen | vergrendelt niets; opnieuw versturen mag tot de deadline | idem |

De database controleert dezelfde regels nog eens (`supabase/migrations`), los van wat de pagina doet. Elke verzending met echte wijzigingen komt in `inzendingen` en stuurt via de Edge Function `melding` een pushmelding naar de leerkracht. Een tik op de melding opent `leerkracht/#kind=<id>`. De service worker telt de meldingen op het icoon (rood bolletje, iOS 16.4 of nieuwer); de pagina wist de teller bij het openen.

### Opbouw

```
index.html               ouderpagina
leerkracht/              leerkrachtensite (web-app voor het beginscherm, met service worker)
css/stijl.css            gedeelde stijl
js/kalender.js           datums, schooljaar, kalenderweergave
js/taal.js, js/teksten.js  taalknop en alle teksten van de ouderpagina per taal
js/api.js                Supabase of demo, met dezelfde regels
js/ouder.js, js/leerkracht.js
js/config.js             Supabase-adres, publieke sleutel, VAPID-publieke sleutel
supabase/migrations/     tabellen, functies, Vlaamse schoolkalender
supabase/functions/melding/  pushmeldingen (web-push)
```

Geen buildstap: wat in de repo staat, staat op GitHub Pages.

### Lokaal bekijken

```
python3 -m http.server 8765
```

Dan `http://127.0.0.1:8765/?demo` en `http://127.0.0.1:8765/leerkracht/?demo`.

### Nieuw schooljaar

Voeg de vakanties toe als nieuwe migratie in de vorm van `20261024120100_vlaamse_kalender.sql` (bron: vlaanderen.be, schoolvakanties). 2026-2027 en 2027-2028 staan er al in.

## Bestanden

- `BRIEF.md`: de oorspronkelijke vraag, letterlijk.
- `BESLISSINGEN.md`: genomen beslissingen; die gaan voor op de brief.
- `STATUS.md`: waar het project staat en wat openstaat.
