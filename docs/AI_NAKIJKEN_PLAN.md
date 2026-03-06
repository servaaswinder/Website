# AI Nakijken Feature

Leerlingen leveren informatica-opdrachten in via de website → AI doet een eerste nakijkronde en registreert dit als concept → docent keurt goed of past aan.

## Aanpak per onderdeel

### 1. AI schrijft concept naar Firebase
De bestaande `gradingDraft` + `gradingBy` velden in de `submissions` collectie worden hergebruikt:
- `gradingBy: "AI"`
- `gradingDraft.selectedCells`: AI-selectie per rubriekcategorie
- `gradingDraft.comment`: AI-opmerking (menselijke schrijfstijl, geen AI-taal)
- `gradedByAI: true`
- **`status: "pending"`** — NIET `grading`, zodat de inlevering **niet op slot** gaat voor collega's.

Antigravity doet dit via Firebase MCP door de Firestore documenten rechtstreeks bij te werken.

### 2. Visueel onderscheid AI vs. mens — `grading-ui.js`
**Probleem:** bij een tweede inlevering kopieert de app al het vorige rubric. Docent ziet niet of het AI of mens was.

**Oplossing:** Nieuw veld `gradedByAI: true` in Firestore. In `grading-ui.js`:
- `.rubric-cell.selected` krijgt een **gele** kleur i.p.v. blauw als `gradedByAI === true`
- Badge bovenin modal: `🤖 Concept door AI — controleer en rond af`
- Aparte CSS-klasse `.rubric-cell.ai-selected`

#### Gewijzigde bestanden (al geïmplementeerd op deze branch)
- `Informatica/js/grading-ui.js` — gele cellen, AI-banner, `isAIGraded` logica
- `Informatica/docenten.html` — 🤖 badge in inbox

### 3. Herkansing — vergelijken, niet strenger
Via `checkForPreviousGrade()` haalt de app al de vorige beoordeling op. De AI:
- Vergelijkt het nieuwe werk met de vorige beoordeling
- Is nooit strenger dan de vorige ronde
- Beschrijft in de opmerking wat de leerling heeft verbeterd
- Geeft in de rubric minimaal de scores van de vorige ronde als startpunt

### 4. Branch
`feature/ai-nakijken` van `main`

### 5. `/nakijken` workflow
Bestand: `~/.claude/scheduled-tasks/nakijken/SKILL.md` (anthropic-skills scheduled task, on-demand)

Stappenplan dat Antigravity volgt als je `/nakijken` typt:
1. Lees openstaande `submissions` (status: `pending`) via Firebase MCP
2. Haal rubric op van de opdrachtpagina (via `ASSIGNMENT_MAP` in grading-ui.js)
3. Bekijk het werk van de leerling via `assignmentUrl`
4. Als herkansing: vergelijk met vorige beoordeling
5. Beoordeel per rubriekcategorie (nooit strenger dan vorige ronde)
6. Schrijf opmerking in menselijke schrijfstijl
7. Sla op: `gradingDraft`, `gradedByAI: true`, `gradingBy: "AI"`, `status: "pending"`

### 6. Cross-device setup
Bestand: `SETUP_AI.md` (al aangemaakt op deze branch)
Beschrijft welke MCP servers geïnstalleerd moeten worden + hoe.

---

## Verificatieplan (handmatig testen op Mac)

1. Open `docenten.html` lokaal (`./start_server.sh`)
2. Log in als docent
3. Maak een test-submission aan in Firebase (of gebruik een bestaande)
4. Stel via Firebase console handmatig in: `gradedByAI: true`, `gradingBy: "AI"`, en een `gradingDraft` met `selectedCells` en `comment`
5. Refresh de inbox → controleer of het 🤖 label zichtbaar is
6. Open de inlevering → controleer of rubric cellen **geel/oranje** zijn
7. Klik "Afronden & Cijfer opslaan" → controleer of geel verdwijnt en het blauw wordt
8. Test `/nakijken` workflow door het commando te typen in Antigravity

## Status
- [x] Branch `feature/ai-nakijken` aangemaakt
- [x] `grading-ui.js` aangepast (gele cellen, AI-banner)
- [x] `docenten.html` aangepast (🤖 badge)
- [x] `/nakijken` skill aangemaakt (`~/.claude/scheduled-tasks/nakijken/SKILL.md`)
- [x] `SETUP_AI.md` aangemaakt
- [ ] Handmatig testen op Mac
- [ ] Mergen naar `main`
