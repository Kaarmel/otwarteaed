# otwarte AED — hub danych o defibrylatorach dla dane.gov.pl

**Misja AED — Dane na ratunek · HackNation 2026**

- Hub danych i kreator dla gmin: **https://otwarteaed.pl** (podgląd: https://otwarteaed.pages.dev)
- Mapa dla mieszkańców i firm: **https://gdzieaed.pl** (podgląd: https://gdzieaed.pages.dev)

## Problem

Nie ma jednej listy defibrylatorów w Polsce.

- **OpenStreetMap** ma 18 301 punktów AED, ale 99,4% z nich nie ma adresu, a 63% nie ma godzin dostępności.
- **Gminy na dane.gov.pl** opublikowały łącznie 74 rekordy, w czterech różnych układach:
  - Krosno: osobne kolumny, nagłówki ze spacjami;
  - Przemyśl: GeoJSON;
  - Marki: cały wiersz CSV w jednej kolumnie, 7 z 8 par współrzędnych zamienionych;
  - Legionowo: kody TERC i SIMC.
- **Każdy wydawca robi to inaczej**, więc danych nie da się po prostu połączyć.

## Rozwiązanie

### 1. Harvester otwarteaed.pl

Zbiera dane z wielu źródeł i robi z nich jeden zbiór wysokiej jakości.

- **Rejestr źródeł:** każde źródło to mały plik JSON (`zrodla/*.json`). Opisuje skąd pobrać dane (plik, adres URL z datą w nazwie albo zbiór dane.gov.pl, z którego bierze się najnowszy zasób), licencję, atrybucję i dopasowanie kolumn.
- **Automatyczne rozpoznawanie formatu:**
  - kodowanie UTF-8 lub Windows-1250;
  - separator `,` `;` tabulator lub `|`;
  - CSV zapisany wewnątrz jednej kolumny;
  - pliki XLSX, GeoJSON, KML i eksport OSM.
- **Jeden format współrzędnych:** WGS84 z kropką dziesiętną. Hub obsługuje:
  - przecinek dziesiętny;
  - stopnie, minuty i sekundy;
  - parę liczb w jednym polu;
  - zamienione osie (naprawiane tylko wtedy, gdy odwrócona para trafia do Polski);
  - układ PL-1992 (przeliczany według wzorów Krügera).
- **Jednolite adresy dla całej Polski z PRG** (GUGiK, usługa UUG):
  - ulica, numer, kod pocztowy, miejscowość, gmina, powiat, województwo oraz kody TERYT, SIMC i ULIC;
  - kody TERYT rozróżniają miejscowości o podobnych nazwach (Głogów i Głogów Małopolski);
  - wyniki trafiają do bazy adresów (`baza/adresy_prg.json`), więc kolejne przebiegi pytają tylko o nowe punkty;
  - adres podany przez źródło nigdy nie jest nadpisywany.
- **Scalanie duplikatów:**
  - obserwacje z różnych źródeł położone bliżej niż 30 m, z tym samym punktem adresowym PRG i podobną nazwą, stają się jednym AED;
  - dwa AED z tego samego źródła nigdy nie są scalane, bo mogą to być dwa urządzenia w jednym budynku;
  - przy konflikcie wygrywa dysponent, a odrzucone wartości trafiają do pola `konflikty`. **Nic nie ginie:** `aed_obserwacje.csv` zawiera każdy rekord źródłowy z surowym oryginałem i listą przekształceń.
- **Jakość:**
  - każdy rekord dostaje flagi i ocenę 0–100;
  - każde źródło dostaje komunikat w rodzaju „Zamienione osie w 7 z 8 rekordów — naprawiliśmy je automatycznie”.
  - Zgodnie z ustaleniem z mentorami **brak danych o dostępności oznacza: przyjęto, że AED jest dostępny**. Pole źródła zostaje puste, nie obniża to oceny, a na mapie punkt jest zielony.
- **Publikacja w formacie dane.gov.pl:**
  - `aed.csv` (UTF-8, format główny) oraz kopia z datą w nazwie;
  - `aed.xlsx` dla jury, z arkuszami AED, Obserwacje, Źródła, Jakość i Słownik pól;
  - `aed.geojson`;
  - `dane_gov_pl.xml` z plikiem `.md5`. To ten sam mechanizm automatycznego zasilania portalu, z którego od 2025 r. korzystają deweloperzy. **Plik XML przechodzi walidację oficjalnym schematem portalu** (`https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd`, wersja 1.13);
  - `SHA256SUMS` z sumami kontrolnymi wszystkich plików.

### 2. Kreator dla gmin i dysponentów

Działa w przeglądarce na otwarteaed.pl i korzysta z tego samego kodu co harvester, więc podgląd jest dokładnie tym, co zostanie opublikowane.

1. Wgraj plik w takiej postaci, w jakiej go masz, albo podaj jego adres.
2. Strona rozpoznaje układ, np. „Rozpoznano: Mam współrzędne (92%)”, i proponuje dopasowanie kolumn, które można poprawić.
3. Podgląd pokazuje błędy, adresy z PRG i status dostępności.
4. Pobierasz CSV, XML i MD5 do wystawienia na swojej stronie, a do tego profil źródła dla harvestera.

Nic nie trafia na nasz serwer.

### 3. Wzorcowy zakres danych

- `wzorcowy_zakres_danych.xlsx`: 39 pól, słowniki wartości i przykłady z prawdziwych danych.
- Dwa szablony dla gmin, podzielone według tego, co dysponent ma:
  - **„Mam współrzędne”:** wymagane nazwa obiektu, szerokość i długość;
  - **„Mam tylko adresy”:** wymagane nazwa, miejscowość i numer budynku; współrzędne uzupełnia hub z PRG.
- Każdy inny układ pliku też jest rozpoznawany automatycznie.

### 4. Kampania „otwarte AED” i gdzieaed.pl

gdzieaed.pl to strona dla mieszkańców i firm:
- mapa wszystkich AED;
- przycisk „Najbliższy AED” z czasem dojścia;
- karta A4 do powieszenia obok planu ewakuacji.

Kampania zachęca dysponentów (gminy, PSP i OSP, instytucje) do publikowania **potwierdzonych** danych na dane.gov.pl.

## Wynik na dziś (2026-11-21)

| | |
|---|---:|
| Obserwacje z 5 źródeł | 18 375 |
| AED po scaleniu | 18 326 |
| AED potwierdzone przez kilka źródeł | 48 |
| AED z adresem (PRG) | 18 022 (98%) |
| Całodobowe / brak danych (przyjęto: dostępne) / ograniczone godziny / prywatne | 3798 / 8917 / 2518 / 3093 |
| Średnia ocena jakości | 99.4 |

## Kroki użytkowników

- **Gmina lub dysponent:**
  1. Wchodzi na otwarteaed.pl i otwiera sekcję „Opublikuj dane swojej gminy”.
  2. Wgrywa swój plik Excel lub CSV.
  3. Sprawdza dopasowanie kolumn i błędy.
  4. Pobiera CSV, XML i MD5 i wystawia je na swojej stronie (np. w BIP).
  5. Składa wniosek do MC o automatyczne pobieranie. Od tej chwili portal i hub pobierają dane same.
- **Ministerstwo, czyli portal dane.gov.pl:** pobiera `https://otwarteaed.pl/dane/dane_gov_pl.xml`. Gdy zmieni się `.md5`, importuje nowe zasoby z datą w nazwie.
- **Mieszkaniec:** otwiera gdzieaed.pl i klika „Najbliższy AED” albo wpisuje adres, a potem idzie trasą pieszą. Dzwoni 112.
- **Firma:** generuje na gdzieaed.pl kartę A4 z najbliższymi AED, adresem do podania dyspozytorowi i krokami pierwszej pomocy.
- **Analityk:** pobiera CSV lub XLSX i może sprawdzić każdą wartość w `aed_obserwacje.csv` oraz sumy w `SHA256SUMS`.

## Weryfikowalność

- **70 testów automatycznych** (`npm test`), także na prawdziwych plikach z dane.gov.pl:
  - wykrywanie profilu;
  - CSV z Marek;
  - przeliczenie PL-1992;
  - scalanie bez utraty danych;
  - walidacja XML oficjalnym XSD;
  - powtarzalność wyniku (dwa przebiegi dają identyczne `SHA256SUMS`).
- **Pochodzenie każdej wartości:** pola `zrodla`, `adres_zrodlo` i `konflikty`, a w obserwacjach także surowy oryginał i lista przekształceń.
- **Zamrożone pliki wejściowe** leżą w `wejscie/`, a `zrodla.json` zawiera sumę SHA-256 każdego wejścia.

## Technologia

- **Język:** JavaScript (moduły ES). Ten sam rdzeń działa w przeglądarce i w Node 22.
- **Bez zewnętrznych bibliotek w hubie.** Własne są: zapis i odczyt XLSX (ZIP + deflate z API przeglądarki), MD5 oraz przeliczenie PL-1992.
- **Hosting:** statyczny, Cloudflare Pages.

Uruchomienie:

```sh
npm test                        # testy
node hub/zbierz.mjs --offline   # przebieg na zamrożonych danych → otwarteaed/dane/
node hub/zbierz.mjs             # pobranie najnowszych zasobów z dane.gov.pl + nowe adresy z PRG
npm run strony                  # dist/otwarteaed i dist/gdzieaed do wdrożenia
```

## Ograniczenia

Opisane w [ograniczenia.md](ograniczenia.md).
