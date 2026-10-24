# Status

## 2026-10-24

**Klaar en getest in demomodus** (headless Chrome, 390 px breed, geen fouten in de console, geen horizontale scroll):

- Ouderpagina: klas en kind kiezen, achternaam controleren (hoofdletters en spaties maken niet uit), tabbladen maaltijden en opvang met hele maand, vaste weekdagen, losse dagen en per week, bevestiging bij versturen, vergrendelde maanden grijs.
- Leerkrachtensite: aanmelden, kinderlijst met zoeken en toevoegen, fiche per kind met beide kalenders en de laatste inzendingen, klasgegevens, ouderlink, wachtwoord wijzigen, vrije dagen van de school, meldingen aanzetten.
- Database-migraties en Edge Function geschreven, **nog niet uitgerold en dus nog niet getest tegen een echte database**.

**Open, wacht op Lode:**

1. Supabase-toegangstoken van Lodes eigen account in de sleutelhanger (dienst `supabase-school`).
2. Lege openbare repo `LodeAI/school-website` op GitHub, toegevoegd aan het fine-grained token van LodeAI.

**Daarna (Claude):** project `konijnenklas` aanmaken in Frankfurt, migraties uitrollen, VAPID-sleutels maken, functie uitrollen, leerkrachtgebruiker aanmaken, `js/config.js` invullen, pushen, GitHub Pages aanzetten, alles testen tegen de echte database, en een testmelding op de iPhone.
