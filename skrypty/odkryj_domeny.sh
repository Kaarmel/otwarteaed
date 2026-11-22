#!/usr/bin/env bash
# Odkrywa otwarteaed.pl i gdzieaed.pl: buduje strony z tego repozytorium, wdraża je na Cloudflare Pages
# i wznawia automatyczną aktualizację danych (GitHub Actions, co 2 godziny; pierwszy przebieg od razu).
# Użycie: bash skrypty/odkryj_domeny.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Token Cloudflare (tylko Pages) leży poza repozytorium: ~/.config/cloudflare/otwarteaed.env
set -a; . ~/.config/cloudflare/otwarteaed.env; set +a
unset CLOUDFLARE_GLOBAL_API_KEY
export CLOUDFLARE_ACCOUNT_ID="$(curl -sS https://api.cloudflare.com/client/v4/accounts -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])")"
WORKFLOW="Aktualizacja danych"
bash skrypty/strony.sh
npx -y wrangler@4 pages deploy dist/otwarteaed --project-name otwarteaed --branch main --commit-dirty=true
npx -y wrangler@4 pages deploy dist/gdzieaed --project-name gdzieaed --branch main --commit-dirty=true
if gh workflow enable "$WORKFLOW" && gh workflow run "$WORKFLOW"; then echo "GitHub Actions wznowione, świeże dane za ok. 5 minut."
else echo "UWAGA: włącz ręcznie: GitHub → Actions → $WORKFLOW → Enable workflow, potem Run workflow"; fi
echo "Sprawdzenie (powinno być 200):"; curl -sI https://otwarteaed.pl | head -1; curl -sI https://gdzieaed.pl | head -1
