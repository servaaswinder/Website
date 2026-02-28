---
description: AI doet eerste ronde nakijken van openstaande informatica-inleveringen
---

Volg deze stappen precies in volgorde. Werk één inlevering volledig af voordat je naar de volgende gaat. Wacht niet op goedkeuring tussen inleveringen.

## Stap 1 — Haal openstaande inleveringen op

Gebruik Firebase MCP om alle documenten uit de `submissions` collectie op te halen met `status == "pending"` die nog GEEN `gradedByAI: true` hebben.

Rapporteer hoeveel inleveringen er zijn.

## Stap 2 — Lees per inlevering de opdracht

Gebruik `GradingUI.ASSIGNMENT_MAP` (zie `Informatica/js/grading-ui.js`) om de HTML-opdrachtpagina te vinden.
Haal de rubric op: lees de categoriën, wegingen en beschrijvingen per puntenniveau.

## Stap 3 — Bekijk het werk van de leerling

Open `assignmentUrl` via de browser of analyseer de bestanden via tools:
- **Verifieer Niveau**: Kijk in de submission of in de `results` collectie of de leerling **HAVO** of **VWO** is. Pas je strengheid hierop aan (VWO = kritischer).
- Let op: "Bas" kan Bastiaan Eelman (HAVO) of Bas Zwanenburg (VWO) zijn. Controleer het e-mailadres.
- Als de link een **repository** is (bijv. github.com of codeberg.org) in plaats van een live website: zoek in de header of zijbalk naar een knop zoals "Visit Page", "Website" of een link eindingend op `.page` of `.github.io`. Gebruik deze link om naar de live versie van de opdracht te surfen en deze normaliter na te kijken. Mocht je écht geen live link vinden, navigeer dan naar de benodigde HTML/CSS bestanden in de repo en beoordeel de code zelf. Voeg wel ALTIJD aan je uiteindelijke opmerking toe: "Voor de volgende keer: lever a.u.b. direct de werkende live link (pages link) naar de website in, in plaats van de broncode/repository link."
- Als de pagina een **voorpagina** is: navigeer naar de juiste opdrachtpagina.
- Als **inloggen vereist** is (bijv. Google Colab): noteer dit en sla aan op basis van wat wél zichtbaar is.
- Als er **geen directe link** is of de link werkt niet: voeg toe aan opmerking: "Voor de volgende keer: lever een directe link in naar de pagina waarop de opdracht staat, niet naar je startpagina."

## Stap 3.5 — Doe extern onderzoek (indien relevant)

Als de opdracht gaat over een **echte gebeurtenis** (bijv. een specifiek datalek zoals Odido, een hack, of een nieuwsbericht):
- Zoek online naar details over deze gebeurtenis (gebruik bijv. Tweakers, Security.nl, of officiële rapporten).
- Vergelijk de feiten (oorzaak, schaal, datatypes, maatregelen) met wat de leerling schrijft.
- Controleer specifiek de bronnen die de leerling zelf opgeeft.
- Wees kritisch: mist de leerling cruciale context, vaktermen (zoals Social Engineering, MFA, Data-minimalisatie) of architecturale missers? Pas de score hierop aan.

## Stap 4 — Check herkansing

Controleer of het een herkansing is: kijk of er een eerder `checked`-inlevering bestaat voor dezelfde leerling + opdracht.
- Zo ja: lees de vorige beoordeling (`finalRubric`, `teacherComment`, `grade`)
- Vergelijk: wat heeft de leerling verbeterd?
- Wees NOOIT strenger dan de vorige ronde. Startpunt rubric = vorige scores.

## Stap 5 — Beoordeel per rubriekcategorie

Wijs per categorie een puntenaantal toe. Schrijf je redenering intern op en zet het in de opmerking.

Regels:
- VWO-leerlingen worden strenger beoordeeld, wees hierbij zeer kritisch op details en uitwerking.
- HAVO-leerlingen mogen rekenen op iets meer coulance (welwillendheid) en aanmoediging.
- Een perfecte score (alles de maximale punten, dus een 10) mag alléén gegeven worden als het werk écht foutloos en compleet is. Zoek actief naar foutjes of verbeterpunten in theorie en code voordat je de maximale score toekent. Let hierbij op de nieuwe conrete rubrics.
- Bij herkansing: minimumscore per categorie = vorige score. (Tenzij de leerling elementen duidelijk heeft verwijderd/verslechterd, maar benoem dat. Erg zeldzame situatie).

## Stap 6 — Schrijf de opmerking

Schrijf een korte opmerking voor de leerling. Regels:
- Schrijf in het Nederlands, als een docent aan zijn leerling
- Geen AI-taal ("Als AI-assistent...", "Ik heb geanalyseerd..." e.d.)
- Noem wat goed is, wat beter kan, en (bij herkansing) wat verbeterd is
- Max 3-4 zinnen — direct doorstuurbaar zonder aanpassingen

7. **Concept opslaan in Firebase:**  
   Als je tevreden bent met je beoordeling, sla je deze op in Firebase in de `submissions` collectie.  
   - Gebruik **ALTIJD** het Python script `private_scripts/save_ai_drafts.py` om te schrijven naar Firestore, omdat MCP geen document-writerechten heeft.
   - Run in the terminal:
     ```bash
     python3 private_scripts/save_ai_drafts.py '[{"id": "DOCUMENT_ID", "pts": {"0": 1, "1": 2, "2": 1}, "c": "Je opmerking hier. --- HERBEOORDELING (Vorig cijfer: 4.0) --- indien van toepassing"}]'
     ```
     *(Je mag meerdere inleveringen tegelijk in de JSON array stoppen).*
   - **Let op**: Zorg dat je de daadwerkelijke indices als string gebruikt voor de punten (bijv. `"0"`, `"1"`, niet `"row-0"`).
   - De velden worden door het script automatisch in `submissions.gradingDraft` gezet en `status` wordt `pending`.

8. **Rapportage:**  
   Laat me weten welke leerlingen zijn nagekeken. Geef een kort overzicht (bijv. in een tabel) met hun voorletters, opdracht, voorgesteld cijfer en de belangrijkste reden voor dat cijfer.