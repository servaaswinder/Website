# Website — servaaswinder.nl

Schoolwebsite (Jekyll + Firebase) voor Informatica, Natuurkunde, Fotografie en Technasium.
Gehost via GitHub Pages. Authenticatie en data via Firebase (Auth + Firestore).

## Stack

- **Frontend**: Jekyll (Ruby), vanilla JS, Firebase SDK 9.23.0, PapaParse
- **Backend**: Firebase Auth + Firestore, Flask server (`server.py`) voor admin-API's (2FA-reset)
- **CI/CD**: GitHub Actions (`pages.yml` → build + deploy naar GitHub Pages)
- **Dev**: `bundle exec jekyll serve --livereload` (port 4000), of `./start_server.sh`

## Projectstructuur

```
├── Informatica/          # Leerling/docent-portaal met beoordelingssysteem
│   ├── js/
│   │   ├── grading-ui.js       # Kern: rubric-modal, ASSIGNMENT_MAP, AI-grading, cijferberekening
│   │   ├── rubric-parser.js    # Parst rubric-tabellen uit opdracht-HTML
│   │   ├── student-utils.js    # Robuuste leerling-lookup (5-stappen email-matching)
│   │   └── backup-manager.js   # CSV export/import van cijfers (PapaParse)
│   ├── opdrachten/             # 27 opdracht-HTML's met rubrics (A1-A7, B1-B4, C1-C5, D1-D2, E1-E2, F1-F4, Eind1-2)
│   ├── docenten.html           # Docentendashboard: inbox + beoordelingsmodal (120KB)
│   ├── leerlingportaal.html    # Leerlingoverzicht: cijfers, status, feedback (102KB)
│   ├── inleveren.html          # Inleverformulier
│   └── login.html              # Firebase Auth met 2FA-support
├── Natuurkunde/          # Per klas (3H, 4H, 4V, 5H, 6V) met practica en theorie
├── Fotografie/           # Fotogalerij en portfolio
├── Technasium/           # STEM-projecten (Floating Future, Prothese, etc.)
├── _includes/            # Gedeelde headers/footers
│   ├── site-header.html              # Algemene nav
│   ├── site-header-informatica.html  # + Firebase auth, 2FA-redirect, gebruikersweergave
│   └── site-footer-informatica.html
├── private_scripts/      # Python Firebase-scripts (NIET in git)
│   ├── save_ai_drafts.py       # AI-concepten → Firestore (JSON: id, pts, c)
│   ├── fetch_ai_drafts.py      # Lees pending AI-beoordelingen
│   └── (diverse test/update scripts)
├── server.py             # Flask admin-API (2FA-reset, token-auth)
├── firestore.rules       # Firestore security rules
└── docs/                 # Planningsdocumenten
```

## Firebase / Firestore

### Collecties

**`submissions`** — inleveringen
- `userEmail` (lowercase: `lln10656@northgo-college.nl`)
- `assignmentId`, `assignmentUrl`, `status` (`pending`/`grading`/`checked`)
- `gradingDraft` (`selectedCells`, `comment`), `gradedByAI`, `gradingBy`
- `grade`, `finalRubric`, `teacherComment`, `period`

**`results`** — leerlinggegevens
- `email` (LLN uppercase, domein lowercase: `LLN10656@northgo-college.nl`)
- `name`, `class` (bijv. `"Vwo 4"`, `"Havo 5"`)

### Admin-accounts (hardcoded in firestore.rules + server.py)
- `servaas.winder@northgo-college.nl`
- `jaimy.treffers@northgo-college.nl`

### Security
- Leerlingen kunnen alleen eigen submissions lezen/maken, niet beoordelen
- 2FA verplicht (site-header-informatica.html redirect)
- Admin-only: schrijven naar `results`, alle submissions bewerken

## Beoordelingssysteem

- **Rubric-formule**: staat onderaan elke opdracht-HTML, meestal `Cijfer = (punten / max) * 9 + 1`
- Categorieën met `(weging 2)` tellen dubbel
- **AI-beoordelingen**: gele cellen i.p.v. blauwe, 🤖 banner in modal
- **Te laat**: checkbox in UI, maximaal cijfer 6.0
- **Herkansing**: vorige scores als minimum, nooit strenger

## Conventies

- **Taal**: code en commits in het Engels; opmerkingen aan leerlingen in het Nederlands
- **AI-drafts**: via `save_ai_drafts.py`, max 2 tegelijk, geen speciale Unicode (em-dash etc. breekt JSON)
- **Rubric-indexen**: string `"0"`, `"1"`, etc. (niet `"row-0"`)

## Branches

- `main` — productie
- `feature/ai-nakijken` — AI-beoordelingsfeature (nog niet gemerged)

## Roadmap

- Themaoverhaul
- Migratie naar Railway + PostgreSQL
