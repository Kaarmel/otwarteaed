#!/bin/sh
# Składa dwie strony statyczne do wdrożenia: dist/otwarteaed (dane + kreator) i dist/gdzieaed (mapa dla mieszkańców).
set -e
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist/otwarteaed/hub dist/gdzieaed
rsync -a --exclude='.*' otwarteaed/ dist/otwarteaed/
for f in hub/*.mjs hub/schemat.json; do case "$f" in hub/zbierz.mjs) ;; *) cp "$f" dist/otwarteaed/hub/ ;; esac; done
rsync -a --exclude='.*' --exclude=package.json public/ dist/gdzieaed/
# Materiały zgłoszenia (prezentacja, logo, księga znaku, kampania) pod otwarteaed.pl/materialy/
mkdir -p dist/otwarteaed/materialy/logo dist/otwarteaed/materialy/dla_dysponentow
cp kampania/znak-aed-otwarte.svg docs/prezentacja.pdf docs/opis_projektu.md docs/ograniczenia.md docs/oswiadczenie_ai.md docs/propozycja_psp_osp.md kampania/ksiega_znaku.pdf kampania/naklejki.pdf dist/otwarteaed/materialy/
cp kampania/logo/otwarte-aed-* dist/otwarteaed/materialy/logo/
(cd grafiki && zip -qr ../dist/otwarteaed/materialy/otwarte-aed-grafiki.zip . -x 'zrodla/*')
cp kampania/dla_dysponentow/*.svg kampania/dla_dysponentow/*.png kampania/dla_dysponentow/*.pdf dist/otwarteaed/materialy/dla_dysponentow/
printf '/dane/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=3600\n/*.mjs\n  Content-Type: text/javascript; charset=utf-8\n' > dist/otwarteaed/_headers
printf '/dane/*\n  Cache-Control: public, max-age=3600\n' > dist/gdzieaed/_headers
echo "dist gotowy: $(find dist/otwarteaed -type f | wc -l) + $(find dist/gdzieaed -type f | wc -l) plików"
