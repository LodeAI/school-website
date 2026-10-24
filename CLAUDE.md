# School-website (konijnenklas)

Website voor ouders van een peuterklas om maaltijden en naschoolse opvang door te geven, plus een beheerpagina voor de leerkracht. Zie `README.md` voor de opbouw.

## Afspraken

- **Alles in het Nederlands:** code-commentaar, teksten, documentatie, commitboodschappen en gesprekken.
- **Git:** committen als **Lode Verschelde** met het e-mailadres van LodeAI (lokaal ingesteld in deze repo). Nooit een tak, alles rechtstreeks op `main`. Remote: `https://LodeAI@github.com/LodeAI/school-website.git` (de `LodeAI@` nooit weghalen).
- **Supabase:** eigen account van Lode, gescheiden van de Nutri-projecten. De CLI op deze Mac is aangemeld bij Nutri's organisatie; voor dit project altijd `SUPABASE_ACCESS_TOKEN` uit de sleutelhanger gebruiken (dienst `supabase-school`), nooit `supabase login` doen.
- **Geen gedachtestreepjes** (het lange streepje) in teksten.
- **Regels dubbel:** wat de pagina afdwingt (deadlines, grijze dagen) moet ook in de SQL-functies staan, en omgekeerd. De demo in `js/api.js` volgt dezelfde regels.
- **Testen:** elke wijziging aan de voorkant bekijken in een echte browser op gsm-breedte (390 px), in demomodus.

## Bestanden

- `BRIEF.md`: de oorspronkelijke vraag, letterlijk.
- `BESLISSINGEN.md`: genomen beslissingen; die gaan voor op de brief.
- `STATUS.md`: waar het project staat en wat openstaat.
