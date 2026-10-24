# Beslissingen en open vragen

## Beslissingen (2026-10-24)

1. **Opslag en meldingen:** de leerkracht krijgt een melding op de gsm bij elke inzending of wijziging. "Kind X heeft ..." en een tik op de melding opent de fiche van kind X op de leerkrachtensite. Technische keuze: zie open vraag A.
2. **Privacy:** toestemming van de ouders is offline geregeld. Een namenlijst op de ouderpagina mag.
3. **Verificatie:** blijft zoals gevraagd. De ouder kiest voor- en achternaam uit de lijst en typt de achternaam opnieuw, zonder onderscheid tussen hoofd- en kleine letters.
4. **Leerkracht:** logt in met één eenvoudig wachtwoord, zonder e-mail.
5. **Leerkrachtensite:** een website met per kind een fiche. Een melding op de gsm linkt rechtstreeks naar die fiche.
6. **Kalender:** schoolvakanties en feestdagen worden automatisch grijs, volgens de officiële Vlaamse schoolkalender.
7. **Deadline maaltijden:** een maand kan ingevuld worden tot en met de laatste dag van de vorige maand. Ouders mogen maanden vooruit invullen, zelfs het volledige schooljaar.
8. **Opvang:** vooruit invullen mag, tot het hele schooljaar. Een dag kan aangepast worden tot en met de dag voordien. Na het versturen wordt niets grijs gemaakt of vergrendeld.
10. **Geen optie "geen maaltijd" of "afwezig".** Niet alle ouders gebruiken de site; een lege dag betekent niets.
12. **Eén school en één klas:** De Triangel, Konijnenklas. Het datamodel houdt wel rekening met meer klassen en scholen later.
13. **Woensdag:** er wordt op woensdag nooit gegeten (opvang tot 14u eet boterhammen, die vallen niet onder deze site).
14. **Woorden:** "dommelen" (middagdutje) en "vegi" zoals ze zijn. Geen bevestigingsmail.
15. **Hosting en git:** GitHub-account LodeAI, voorlopig op een github.io-adres. Later misschien `konijnenklas.lvit.be`, te beslissen na de proof of concept. Commits als Lode Verschelde met het e-mailadres van LodeAI.

## Beslissingen ronde 2 (2026-10-24)

A. **iPhone.** Supabase (eigen account van Lode, gescheiden van de Nutri-projecten) bewaart de gegevens en bewaakt de regels op de server. De leerkrachtensite is een web-app op het beginscherm die pushmeldingen krijgt (iOS 16.4 of nieuwer).
B. **Versturen vergrendelt niets.** Een maaltijdmaand ligt pas vast vanaf de eerste dag van die maand. Tot en met de laatste dag van de vorige maand kan een ouder blijven aanpassen en opnieuw versturen. Dit vervangt "greyed out na versturen" uit de brief.
C. **Twee ouders:** allebei kunnen aanpassen tot de maand begint. De laatste inzending telt.
D. **Studiedagen en andere vrije dagen van de school** voegt de leerkracht zelf toe op de beheerpagina.
E. **Opvang:** een dag aanpassen kan tot en met 23:59 de dag voordien (Belgische tijd).
F. **Openbare repo** `LodeAI/school-website` op gratis GitHub Pages. De gegevens van de kinderen staan nooit in de repo. Lode maakt de repo zelf aan.

## Afgeleide keuzes (door Claude, aan te passen)

- Eén verstuurknop per tabblad verstuurt alle gewijzigde maanden in één keer, met één melding.
- Er gaat alleen een melding uit als er echt iets veranderde. Bij opvang staat in de melding welke dagen erbij of eraf gingen.
- Een tik op een dag kiest die dag; "Losse dagen" is dus altijd mogelijk.
- Lettertype Atkinson Hyperlegible (gemaakt voor leesbaarheid), zelf gehost, niet via Google.
- Leerkracht meldt aan met alleen een wachtwoord. Onder de motorkap is dat een Supabase-gebruiker met een vast e-mailadres dat nergens getoond wordt.

## Na de eerste versie

- 2026-10-24: uitleg onder de achternaamcontrole, waarom ouders de achternaam opnieuw typen (klein lettertype, zonder zin over hoofdletters).
- 2026-10-24: lichte en donkere modus met een knop rechtsboven, bewaard in een cookie op het toestel. Standaard licht, los van de instelling van het toestel.
- 2026-10-24: bij het wisselen van tabblad met niet verstuurde wijzigingen: pop-up "Ben je zeker? Je hebt nog niet verstuurd naar de leerkracht." (Annuleren of Wisselen). Wie wisselt, verliest niets: de wijzigingen blijven staan tot de ouder terugkomt.
- 2026-10-24: rood bolletje op het icoon van de leerkrachtapp (iPhone-beginscherm) met het aantal meldingen sinds de app laatst open was. Openen zet het terug op nul.
- 2026-10-24: alle lijsten van kinderen gesorteerd op achternaam, dan voornaam, maar getoond als "Voornaam Achternaam". "Van Daele" staat dus bij de V.
- 2026-10-24: in de kinderlijst van de leerkracht een rode bol met M (maaltijden gewijzigd) of een blauwe bol met O (opvang gewijzigd) zolang de leerkracht de fiche van dat kind niet geopend heeft. Bijgehouden in de database (`inzendingen.gezien`), dus gelijk op elk toestel. Op de fiche staat "Nieuw" bij die inzendingen.
- 2026-10-24: opent de leerkracht de app terwijl er een rood bolletje op het icoon staat, dan gaat ze naar Kinderen. Een tik op een melding gaat voor en opent de fiche van dat kind.
