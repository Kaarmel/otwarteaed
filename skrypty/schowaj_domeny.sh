#!/usr/bin/env bash
# Chowa otwarteaed.pl i gdzieaed.pl przed oceną: wdraża stronę przekierowującą na Google
# i wstrzymuje automatyczną aktualizację (inaczej GitHub Actions przywróciłby strony co 2 godziny).
# Odkrycie: bash skrypty/odkryj_domeny.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Token Cloudflare (tylko Pages) leży poza repozytorium: ~/.config/cloudflare/otwarteaed.env
set -a; . ~/.config/cloudflare/otwarteaed.env; set +a
unset CLOUDFLARE_GLOBAL_API_KEY
export CLOUDFLARE_ACCOUNT_ID="$(curl -sS https://api.cloudflare.com/client/v4/accounts -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])")"
WORKFLOW="Aktualizacja danych"
T="$(mktemp -d)"
cat > "$T/index.html" <<'EOF'
<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=https://www.google.com/"><title>Przekierowanie</title></head><body><script>location.replace("https://www.google.com/")</script></body></html>
EOF
printf '/* https://www.google.com/ 302\n' > "$T/_redirects"
printf '/*\n  X-Robots-Tag: noindex\n' > "$T/_headers"
gh workflow disable "$WORKFLOW" || echo "UWAGA: nie udało się wstrzymać GitHub Actions (zrób to ręcznie: Actions → $WORKFLOW → Disable workflow)"
for p in otwarteaed gdzieaed; do npx -y wrangler@4 pages deploy "$T" --project-name "$p" --branch main --commit-dirty=true; done
echo "Schowane. Sprawdzenie:"; curl -sI https://otwarteaed.pl | head -3; curl -sI https://gdzieaed.pl | head -3
