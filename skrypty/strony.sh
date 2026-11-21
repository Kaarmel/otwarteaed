#!/bin/sh
# Składa dwie strony statyczne do wdrożenia: dist/otwarteaed (dane + kreator) i dist/gdzieaed (mapa dla mieszkańców).
set -e
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist/otwarteaed/hub dist/gdzieaed
rsync -a --exclude='.*' otwarteaed/ dist/otwarteaed/
for f in hub/*.mjs hub/schemat.json; do case "$f" in hub/zbierz.mjs) ;; *) cp "$f" dist/otwarteaed/hub/ ;; esac; done
rsync -a --exclude='.*' --exclude=package.json public/ dist/gdzieaed/
printf '/dane/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=3600\n/*.mjs\n  Content-Type: text/javascript; charset=utf-8\n' > dist/otwarteaed/_headers
printf '/dane/*\n  Cache-Control: public, max-age=3600\n' > dist/gdzieaed/_headers
echo "dist gotowy: $(find dist/otwarteaed -type f | wc -l) + $(find dist/gdzieaed -type f | wc -l) plików"
