# Status

## 2026-10-24

**Klaar en getest in demomodus** (headless Chrome, 390 px breed, geen fouten in de console, geen horizontale scroll):

- Ouderpagina: klas en kind kiezen, achternaam controleren (hoofdletters en spaties maken niet uit), tabbladen maaltijden en opvang met hele maand, vaste weekdagen, losse dagen en per week, bevestiging bij versturen, vergrendelde maanden grijs.
- Leerkrachtensite: aanmelden, kinderlijst met zoeken en toevoegen, fiche per kind met beide kalenders en de laatste inzendingen, klasgegevens, ouderlink, wachtwoord wijzigen, vrije dagen van de school, meldingen aanzetten.

**Supabase live** (project "School Website", ref `nhpfvjkptfghldibteer`, eu-west-1, eigen account van Lode):

- Migraties uitgerold via de beheer-API (`POST /v1/projects/{ref}/database/query` met het token uit de sleutelhanger), niet via `supabase db push`: daarvoor is het databasewachtwoord nodig. Een nieuwe migratie dus ook zo uitvoeren.
- Regels getest als anonieme ouder: foute achternaam, oktober (al begonnen), woensdag, herfstvakantie, zaterdag, dag buiten de maand worden geweigerd; zelfde inhoud opnieuw versturen geeft geen melding; tabellen zijn onleesbaar voor anon.
- Registreren en anonieme aanmelding staan uit (anders zou elke nieuwe gebruiker alles mogen lezen).
- Edge Function `melding` uitgerold (`--use-api --no-verify-jwt`), geheimen gezet (VAPID, MELDING_GEHEIM, SITE_URL). De database roept ze aan na elke inzending: getest, status 200.
- Leerkrachtgebruiker `leerkracht@konijnenklas.lvit.be`; wachtwoord in de sleutelhanger (dienst `konijnenklas-leerkracht`). VAPID-privésleutel ook in de sleutelhanger (`konijnenklas-vapid-privaat`).
- Volledige doorloop lokaal tegen de echte database: ouder vult in en verstuurt, leerkracht ziet de inzendingen op de fiche, sessie blijft na herladen. Testkind daarna gewist.

**Open:**

1. Lege openbare repo `LodeAI/school-website` (Lode), daarna pushen en GitHub Pages aanzetten.
2. Op de iPhone: leerkrachtensite op het beginscherm zetten, meldingen aanzetten, testmelding.
3. De echte kinderen invullen (leerkracht) en eventueel het leerjaar.
