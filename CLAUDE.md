# Website — servaaswinder.nl

Schoolwebsite (Jekyll, vanilla JS) voor Natuurkunde, Fotografie en Technasium.
GitHub Pages; `main` is productie, `.github/workflows/pages.yml` bouwt en deployt.

## Structuur

```
├── Natuurkunde/          # Per klas (3H, 4H, 4V, 5H, 6V); archief/2526/, simulaties/, Verslagen/
├── Fotografie/           # Fotogalerij
├── Technasium/           # Projectpagina's
├── Informatica/          # Alleen redirect-stubs naar northgo-informatica.nl — niet uitbreiden
├── docent/               # demos.html + login.html (Firebase Auth + TOTP)
├── _includes/            # head-nk, site-header-nk, site-footer-nk, practicum-*
└── firestore.rules       # Firebase "leerling-accounts": alleen collectie docent/ open (lezen: 2 docenten, schrijven: Servaas)
```

## Conventies

- Code en commits in het Engels; teksten op de site in het Nederlands.
- Styling: alleen `nk.css`; paginaspecifiek in een klein `<style>`-blok met nk-CSS-variabelen.
- `serviceAccountKey.json` nooit committen (staat in .gitignore).

## Practicumpagina's (4V: nichroom, diode-karakteristiek, luchtweerstand deel 1 en 2; 6V: planck)

- Opmaak in `_includes/practicum-css.html`, knop "Printbare versie" in `_includes/practicum-print.html`, animatie in `_includes/terminale-snelheid.html`.
- De knop linkt naar een vaste PDF naast de pagina. Na elke inhoudelijke wijziging: `scripts/practicum-pdfs.sh` (met `jekyll serve` op poort 4000; buiten macOS `CHROME=<pad naar chromium>`) en de PDF's meecommitten.
- `vouwmallen-luchtweerstand.pdf` komt uit `4V/luchtweerstand-vouwmallen.html` (maten in mm, ware grootte).

## Verificatie — pas "klaar" als dit slaagt

1. `bundle exec jekyll build --destination _site` zonder fouten.
2. `python3 scripts/check_links.py _site` → `0 kapotte interne link(s)` (verplicht bij verplaatsen/verwijderen/hernoemen van bestanden; checkt `href` en `src`).
3. Pagina gewijzigd: `bundle exec jekyll serve` (poort 4000) en de pagina met Playwright/Chromium openen; screenshot bekijken, ook op telefoonbreedte.
4. Practicumpagina gewijzigd: PDF's opnieuw gemaakt en de nieuwe PDF bekeken.
