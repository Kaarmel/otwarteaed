# Kontynuacja pracy — stan na 21.11.2026, 16:50

Plik dla nowego czatu: tu jest wszystko, czego potrzeba, żeby kontynuować bez zgadywania.

## Cel i ocena

Zadanie HackNation 2026 „Misja AED – Dane na ratunek” (Ministerstwo Cyfryzacji, Departament Zarządzania Danymi).

| Kryterium | Waga |
|---|---|
| Zgodność z zasadami dane.gov.pl | 30% |
| Logotyp i hasło | 25% |
| Kreatywność | 15% |
| Zgodność z tematem | 15% |
| Wzorcowy zakres danych | 10% |
| Prezentacja | 5% |

**Terminy:** draft o 20:00 21.11 (dobrze o 18, na pewno o 19); finał do 9:00 22.11 (najpóźniej 11:00).

## Wymagane materiały i ich stan

| Materiał | Stan | Gdzie |
|---|---|---|
| Tytuł i opis | gotowe | `docs/opis_projektu.md` |
| Prezentacja ≥ 5 slajdów (zrzuty, kroki użytkownika, ograniczenia) | **do zrobienia** | zrzuty w `docs/zrzuty/` |
| Prototyp | gotowe, na żywo | https://otwarteaed.pl, https://gdzieaed.pl |
| XLSX ze wzorcowym zakresem danych | gotowe | `otwarteaed/dane/wzorcowy_zakres_danych.xlsx` |
| Kod źródłowy | gotowe | repo, gałąź `feat/hub` (repo PRYWATNE do wysyłki) |
| Logo JPG/PNG/PDF/SVG | gotowe | `kampania/logo/` |
| Księga znaku PDF | gotowe | `kampania/ksiega_znaku.pdf` |
| Oświadczenie o AI (§2 pkt 8) | gotowe | `docs/oswiadczenie_ai.md` |
| Naklejki A6 PDF (dodatek) | do zrobienia | wzór na str. 7 księgi znaku |

## Decyzje użytkownika (obowiązują)

- otwarteaed.pl to hub danych (harvester); gdzieaed.pl to strona dla cywilów, firm, gmin i kampanii.
- Nazwa „otwarte AED”. Hasło „Każda minuta ma adres.” (zatwierdzone). Logo A ze średnikiem (zatwierdzone).
- Kolory:
  - zielony: 24/7 oraz brak danych (brak danych = przyjęto dostępny, waga 0, źródła nie nadpisujemy);
  - żółty: określone godziny;
  - pomarańczowy: prywatne lub ograniczone.
- Dla ministerstwa CSV UTF-8 i XML; dla jury XLSX.
- 2 logiczne szablony dla gmin: „mam współrzędne” i „mam tylko adresy”, z automatycznym wykrywaniem.
- Duplikaty scalamy inteligentnie, nic nie ginie (obserwacje zostają w `aed_obserwacje.csv`).
- Adresy z PRG (GUGiK UUG) dla całej Polski, z bazą `baza/adresy_prg.json`.
- Kampania NIE może brzmieć „wrzuć AED”, bo dane potwierdza dysponent. Hasło dla dysponentów: „Pokaż swój AED. Opublikuj dane na dane.gov.pl.” Nie zmuszamy ludzi.
- Propozycja: PSP zobowiązuje OSP do publikacji lokalizacji AED (`docs/propozycja_psp_osp.md`).
- Bez łamania prawa (scenariusz zamkniętego AED pomijamy).
- Karty (naklejki) są poza punktacją, ale zostają na gdzieaed.pl.
- Całe XLSX, MD5 i CSV piszemy sami, bez bibliotek.
- NIE kopiujemy kodu dewelopera (GreenParkPotockiego). Wzorować się wolno. Nie cytujemy go, bo to prywatny kod klienta.
- XSD nie leży w repo; test pobiera go do `.cache/` z https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd.
- Bez orła, godła, flagi i barw narodowych.
- Domenę można później przenieść na ministerstwo.
- Praca autonomiczna; można dopytywać, użytkownik zwykle się zgadza.

## Architektura (skrót)

**Rdzeń `hub/*.mjs`** to moduły ES działające w Node 22 i w przeglądarce. Kreator używa tego samego kodu, więc podgląd jest identyczny z plikiem.

| Moduł | Rola |
|---|---|
| `czytaj.mjs` | CSV (separator, kodowanie UTF-8 lub Windows-1250, BOM, CSV zagnieżdżony w kolumnie), XLSX, OSM JSON, GeoJSON, KML |
| `wykryj.mjs` | wykrywa profil źródła lub szablon gminy (wynik = 0.55 wymagane + 0.35 pokrycie + 0.1 obszar) |
| `normalizuj.mjs` | liczby z przecinkiem, DMS, PL-1992 → WGS84, zamiana osi, daty, dostęp, status |
| `adresy.mjs` | GUGiK UUG: reverse 50 m, potem 200 m; geokodowanie adresu; nigdy nie nadpisuje adresu źródła |
| `scal.mjs` | duplikaty < 30 m z różnych źródeł; priorytet dysponent > społeczność; konflikty zapisane; `aed_id` = `PL-AED-` + md5(obs_id)[0:10] |
| `jakosc.mjs` | flagi z wagami, ocena 0–100, komunikaty dla źródeł z odmianą |
| `eksport.mjs` | CSV (RFC 4180, neutralizacja formuł), GeoJSON, indeks mapy, XML dane.gov.pl (XSD 1.13, 2 zbiory), XML dla dysponenta, szczegóły dla gdzieaed |
| `xlsx.mjs` | własny ZIP i deflate (CompressionStream), zapis i odczyt XLSX |
| `md5.mjs` | własne MD5 |
| `zbierz.mjs` | CLI (`npm run zbierz -- --offline --bez-zapytan`) |

- **Profile źródeł** (`zrodla/*.json`): osm, krosno, marki, przemysl, legionowo. Wejścia są zamrożone w `wejscie/`.
- **Szablony** (`szablony/*.json`): `mam_wspolrzedne`, `mam_adresy`.
- **Schemat** `hub/schemat.json`: 39 pól. Wymagane: `aed_id`, `zrodla`, `szerokosc`, `dlugosc`.
- **Wyjście** `otwarteaed/dane/`: aed.csv, aed_DATA.csv, aed_obserwacje.csv, aed_dysponenci*.csv, aed.geojson, aed_mapa.json, jakosc.json, zrodla.json, historia.json, dane_gov_pl.xml, dane_gov_pl.md5, aed.xlsx, wzorcowy_zakres_danych.xlsx, szablony/, SHA256SUMS.
- **Strony:**
  - `otwarteaed/`: hub, kreator w 4 krokach, przycisk „Wypróbuj na prawdziwym pliku Marek”, `#przyklad`.
  - `public/`: gdzieaed.pl, mapa i karty.
- **Wyniki:** 18 375 obserwacji → 18 326 AED; 48 z kilku źródeł. Status: 24/7 3798, brak_danych 8917, godziny 2518, ograniczony 3093. 73 od dysponentów. Średnia ocena 99,4.

## Polecenia

```sh
npm test                                   # 70 testów (node --test "test/*.test.mjs"), plus node --test test_aed.mjs
npm run zbierz -- --offline --bez-zapytan  # powtarzalna przebudowa danych (bez sieci)
sh skrypty/strony.sh                       # buduje dist/otwarteaed i dist/gdzieaed
# deploy (Cloudflare Pages):
set -a; . ~/.config/cloudflare/otwarteaed.env; set +a; export CLOUDFLARE_ACCOUNT_ID=9e9a6eb713d934cd91b11dcbc95ec24a
npx -y wrangler@4 pages deploy dist/otwarteaed --project-name otwarteaed --branch main --commit-dirty=true
npx -y wrangler@4 pages deploy dist/gdzieaed  --project-name gdzieaed  --branch main --commit-dirty=true
# podgląd lokalny: python3 -m http.server 8791 (port 8765 zajęty przez inny projekt)
```

- Zrzuty 390 px robimy przez stronę z iframe, bo headless Chrome ma minimalne okno ok. 485 px.
- Klucze Cloudflare i OVH leżą w `~/.config/`, POZA Google Drive. Nigdy nie trafiają do repo.
- Global API Key tylko w ostateczności (użyty raz do DNS za zgodą użytkownika).

## Do zrobienia (kolejność)

1. **Prezentacja** (skill pptx) z plikiem `docs/prezentacja.pptx` i PDF. Slajdy:
   1. problem i liczby;
   2. przepływ huba;
   3. kreator dla gminy;
   4. zgodność z dane.gov.pl (XSD 1.13, MD5, ten sam mechanizm co deweloperzy);
   5. wzorcowy zakres danych i 2 szablony;
   6. jakość i scalanie (przykład Marek: 7 zamienionych osi, punkt z Krosna);
   7. kampania (logo, hasło, gdzieaed, naklejki);
   8. PSP/OSP;
   9. ograniczenia;
   10. kroki użytkownika.
2. Naklejki A6: `kampania/naklejki.html` → PDF.
3. Końcowy przegląd całej gałęzi (code-review), poprawki, potem skill `finishing-a-development-branch`.
4. Merge `feat/hub` → `main`. Repo publiczne dopiero przy wysyłce do jury (decyzja użytkownika).
5. Draft do 20:00: linki i `docs/opis_projektu.md`. Finał do 9:00.
6. Opcjonalnie: więcej źródeł (Warszawa API, Łódź KML, ZTM Gdańsk), film.

## Notatki

- Ledger planu: `.superpowers/sdd/2026-11-21-otwarteaed-hub/progress.md` (gitignored). Zadania 0–9 są zrobione, odstępstwa mają linie „Ruling”.
- Specyfikacja: `docs/superpowers/specs/2026-11-21-otwarteaed-hub-design.md`. Sekcja 11 nadpisuje sekcje 1–10.
- Plan: `docs/superpowers/plans/2026-11-21-otwarteaed-hub.md`.
- Dosłowne prompty użytkownika: `POMYSLY_usera_2026-11-21_*.md` (gitignored).
- Przegląd bezpieczeństwa przy pushu 03e8692 nie przeszedł z powodu limitu API (429); log: `~/.claude/security/log.txt`.
