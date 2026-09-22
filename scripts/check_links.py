#!/usr/bin/env python3
"""Controleert interne links (href én src) in de gebouwde site.

Gebruik: python3 scripts/check_links.py [_site]
Faalt (exit 1) als een link naar een bestand wijst dat niet in de build zit,
bijvoorbeeld na het verplaatsen van PDF's naar Drive.
"""
import os
import re
import sys
import urllib.parse

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '_site')
EXTERN = re.compile(r'^(https?:|mailto:|tel:|javascript:|data:|//|\{)')
LINK = re.compile(r'(?:href|src)\s*=\s*"([^"#?]+)')


def bestaat(pad):
    return (os.path.exists(pad) or os.path.exists(pad + '.html')
            or os.path.exists(os.path.join(pad, 'index.html')))


kapot = {}
for map_, _, bestanden in os.walk(ROOT):
    for naam in bestanden:
        if not naam.endswith('.html'):
            continue
        pagina = os.path.join(map_, naam)
        with open(pagina, errors='ignore') as f:
            inhoud = f.read()
        for url in LINK.findall(inhoud):
            if EXTERN.match(url):
                continue
            url = urllib.parse.unquote(url)
            doel = os.path.join(ROOT, url.lstrip('/')) if url.startswith('/') else os.path.join(map_, url)
            if not bestaat(os.path.normpath(doel)):
                kapot.setdefault(url, set()).add(os.path.relpath(pagina, ROOT))

for url, paginas in sorted(kapot.items()):
    print(f'KAPOT: {url}\n   op: {", ".join(sorted(paginas))}')
print(f'{len(kapot)} kapotte interne link(s)')
sys.exit(1 if kapot else 0)
