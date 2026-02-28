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

Open `assignmentUrl` via de browser:
- Als de pagina een **voorpagina** is: navigeer naar de juiste opdrachtpagina.
- Als **inloggen vereist** is (bijv. Google Colab): noteer dit en sla aan op basis van wat wél zichtbaar is.
- Als er **geen directe link** is of de link werkt niet: voeg toe aan opmerking: "Voor de volgende keer: lever een directe link in naar de pagina waarop de opdracht staat, niet naar je startpagina."

## Stap 4 — Check herkansing

Controleer of het een herkansing is: kijk of er een eerder `checked`-inlevering bestaat voor dezelfde leerling + opdracht.
- Zo ja: lees de vorige beoordeling (`finalRubric`, `teacherComment`, `grade`)
- Vergelijk: wat heeft de leerling verbeterd?
- Wees NOOIT strenger dan de vorige ronde. Startpunt rubric = vorige scores.

## Stap 5 — Beoordeel per rubriekcategorie

Wijs per categorie een puntenaantal toe. Schrijf je redenering intern op maar zet die niet in de opmerking.

Regels:
- Bij herkansing: minimumscore per categorie = vorige score
- Wees eerlijk maar welwillend

## Stap 6 — Schrijf de opmerking

Schrijf een korte opmerking voor de leerling. Regels:
- Schrijf in het Nederlands, als een docent aan zijn leerling
- Geen AI-taal ("Als AI-assistent...", "Ik heb geanalyseerd..." e.d.)
- Noem wat goed is, wat beter kan, en (bij herkansing) wat verbeterd is
- Max 3-4 zinnen — direct doorstuurbaar zonder aanpassingen

## Stap 7 — Schrijf concept naar Firebase

Update het Firestore document via Firebase MCP:

```json
{
  "gradedByAI": true,
  "gradingBy": "AI",
  "gradingDraft": {
    "selectedCells": { "0": <punten_cat0>, "1": <punten_cat1>, ... },
    "comment": "<opmerking voor leerling>"
  },
  "status": "pending"
}
```

Belangrijk: `status` blijft `"pending"` — niet `"grading"`. Zo is de inlevering niet op slot voor de docent.

## Stap 8 — Rapporteer

Na alle inleveringen: geef een overzicht:
- Leerling + opdracht
- Voorgesteld cijfer (op basis van `(punten / max) * 9 + 1`)
- Of het een herkansing was
- Of de link bruikbaar was
