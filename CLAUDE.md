# Website — servaaswinder.nl

Schoolwebsite (Jekyll) voor Natuurkunde, Fotografie en Technasium.
Gehost via GitHub Pages.

Het vak Informatica is verhuisd naar https://northgo-informatica.nl (juli 2026).
Alles onder `Informatica/` is nu een redirect-stub daarheen; het oude
beoordelingssysteem (Firebase submissions/results, Flask-server, private_scripts)
is verwijderd. De data-backup staat buiten de repo bij de eigenaar.

## Stack

- **Frontend**: Jekyll (Ruby), vanilla JS
- **CI/CD**: GitHub Actions (`pages.yml` → build + deploy naar GitHub Pages)
- **Dev**: `bundle exec jekyll serve --livereload` (port 4000)

## Projectstructuur

```
├── Natuurkunde/          # Per klas (3H, 4H, 4V, 5H, 6V) met practica en theorie
│   ├── archief/2526/     # Planningen van vorig schooljaar
│   └── simulaties/       # Interactieve simulaties (straling, etmaal, spanning)
├── Fotografie/           # Fotogalerij en portfolio
├── Technasium/           # STEM-projecten (Floating Future, Prothese, etc.)
├── Informatica/          # Alleen redirect-stubs naar northgo-informatica.nl
├── docent/               # Privépagina's (demos.html + login.html, Firebase Auth)
├── _includes/            # Gedeelde headers/footers (site-header.html, *-nk.html)
├── firestore.rules       # Rules van Firebase-project "leerling-accounts" (bijna alles dicht)
└── docs/                 # Planningsdocumenten
```

## Firebase (restgebruik)

Het Firebase-project "leerling-accounts" wordt alleen nog gebruikt voor
`docent/demos.html`: Servaas logt in (Firebase Auth + TOTP-2FA via
`docent/login.html`) en de pagina leest het Firestore-document
`docent/demonstraties`. Alle overige collecties zijn leeg en de rules staan
dicht. `serviceAccountKey.json` staat alleen lokaal (gitignored).

## Conventies

- **Taal**: code en commits in het Engels; teksten op de site in het Nederlands
- **Styling**: `nk.css` (nieuwe stijl, Natuurkunde) en `style.css` (oude stijl) — consolidatie loopt

## Branches

- `main` — productie

## Roadmap

- Themaoverhaul (CSS-consolidatie style.css vs nk.css)
- ~~Gamification (XP, opdrachtenboom, badges)~~ — vervallen; Informatica is verhuisd
