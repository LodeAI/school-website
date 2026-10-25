# Status

## 2026-10-25, namiddag

Lode: geen rood bolletje op het icoon bij een nieuwe inzending, en telkens opnieuw moeten inloggen als leerkracht.

- **Bolletje:** de melding van 10.54 uur ging wel naar Apple (status 200, twee iPhone-abonnementen), maar het bolletje hing helemaal af van de service worker. Nu declarative web push met `app_badge` (zie BESLISSINGEN.md), nieuwe tabel `leerkracht_geopend` (migratie `20261025160000_leerkracht_geopend.sql`, uitgerold via de beheer-API), Edge Function `melding` opnieuw uitgerold. **Te testen door Lode op de iPhone:** een inzending als ouder, dan het beginscherm bekijken.
- **Later op 25 oktober:** met declarative web push kwamen er geen meldingen meer aan. Teruggedraaid naar het gewone formaat, met het getal voor het bolletje erbij (versie 1.2). **Te testen door Lode:** de app openen en onderaan `versie 1.2 (meldingen 1.2)` nakijken, dan een inzending als ouder.
- **Uitloggen:** in de database stond alleen nog de sessie van vandaag 16.07 uur; de oudere waren weg. Waarschijnlijke oorzaak: refresh token rotation. iOS bevriest de web-app midden in het vernieuwen van de sessie, de app houdt het oude token, en Supabase ziet het hergebruik later als misbruik en schrapt de sessie. **Open, beslissing van Lode:** rotation uitzetten in Supabase (Authentication, Sessions, "Detect and revoke potentially compromised refresh tokens" uit) of het hergebruikvenster verruimen. Claude mocht die beveiligingsinstelling niet zelf wijzigen.
- Afmelden geldt nu alleen voor dat toestel.

## 2026-10-25

**Live** op https://konijnenklas.lvit.be/ (ouders) en https://konijnenklas.lvit.be/leerkracht/ (leerkracht), GitHub Pages vanaf `main` van `LodeAI/school-website`.

**Vandaag gebouwd, getest en gepusht:**

- Copyrightregel onderaan elke pagina, "© <jaar> Lode Verschelde", de naam linkt naar lvit.be (d75ced6).
- Taalknop op de ouderpagina (bf3d78d, Duits erbij in 37bff3a): NL (standaard), EN, FR, DE, ES, IT en KO. Knop rechtsboven naast de themaknop met alleen de code; een tik opent de keuzelijst van het toestel. Onthouden per toestel in de cookie `taal`, niet per kind. De leerkrachtensite, de database en de meldingen naar de leerkracht blijven Nederlands. Werking en opbouw: zie CLAUDE.md (punt "Taal") en BESLISSINGEN.md.
  - Bestanden: `js/teksten.js` (alle teksten per taal, Nederlands is de bron, ontbrekende sleutels vallen terug op NL), `js/taal.js` (knop, cookie, `t()`, vertaling van vaste teksten met `data-t`), `js/kalender.js` en `js/thema.js` halen namen en labels uit de taal van de pagina.
  - Een tekst wijzigen of verbeteren: alleen in `js/teksten.js`. Een nieuwe taal: een object in `js/teksten.js`, de code in `TALEN` (`js/taal.js`) en in het scriptje in de `<head>` van `index.html` (regex en `lang`-tabel).
  - Getest in headless Chrome op 390 px, demomodus, alle zeven talen: geen consolefouten, geen horizontale scroll, de labels onder de dagen passen, taal blijft na herladen. De Nederlandse teksten (ook `aria-label` en `title`) zijn letter voor letter gelijk aan de versie van voor de taalknop, op beide sites.

**Open:** niets.

- Vertalingen nalezen: niet nodig, volgens Lode.
- Leerkrachtensite op het beginscherm van de iPhone, meldingen aan en testmelding: gedaan (Lode).
- Echte kinderen ingevuld: gedaan (Lode).

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

**Open op 2026-10-24:** alle drie intussen gedaan (repo en GitHub Pages, iPhone-meldingen, echte kinderen); zie 2026-10-25 hierboven.
