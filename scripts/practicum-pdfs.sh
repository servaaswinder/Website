#!/usr/bin/env bash
# Maakt de PDF's van de practicumpagina's opnieuw (printopmaak via ?print).
# Draai dit na elke inhoudelijke wijziging van zo'n pagina, met `bundle exec jekyll serve` actief op poort 4000.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="${BASE:-http://localhost:4000}"
pdf() { # $1 = pagina (zonder .html), $2 = uitvoerbestand, $3 = querystring
	"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$2" "$BASE/$1.html$3" 2>/dev/null
	echo "$2"
}
pdf Natuurkunde/4V/luchtweerstand-deel1     Natuurkunde/4V/luchtweerstand-deel1.pdf "?print"
pdf Natuurkunde/4V/luchtweerstand           Natuurkunde/4V/luchtweerstand-deel2.pdf "?print"
pdf Natuurkunde/4V/nichroom                 Natuurkunde/4V/nichroom.pdf "?print"
pdf Natuurkunde/4V/diode-karakteristiek     Natuurkunde/4V/diode-karakteristiek.pdf "?print"
pdf Natuurkunde/6V/planck                   Natuurkunde/6V/planck.pdf "?print"
pdf Natuurkunde/4V/luchtweerstand-vouwmallen Natuurkunde/4V/vouwmallen-luchtweerstand.pdf ""
