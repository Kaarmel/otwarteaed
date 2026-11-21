# otwarteaed.pl — hub danych AED: plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hub, który zbiera dane o AED z wielu źródeł, rozpoznaje ich format, ujednolica, uzupełnia adresy z PRG, scala duplikaty bez utraty danych i publikuje CSV UTF-8 + XML/MD5 dla dane.gov.pl + XLSX, z kreatorem dla gmin w przeglądarce.

**Architecture:** Jeden rdzeń w modułach ES (`hub/*.mjs`), bez zależności od Node w logice, więc ten sam kod działa w kreatorze (przeglądarka) i w CLI (`node hub/zbierz.mjs`). Wejście/wyjście (pliki, sieć) wstrzykujemy jako argumenty (`fetch`, bajty), dzięki czemu testy działają offline. Strony są statyczne: `otwarteaed/` (dane + kreator) i `public/` (gdzieaed.pl, obecna mapa i karty).

**Tech Stack:** Node 22 (`node --test`), JavaScript ES2022, SheetJS 0.20.3 (`vendor/xlsx.mjs`, jedyna biblioteka), `xmllint` (walidacja XSD w testach), Leaflet (już w `public/`).

**Spec:** `docs/superpowers/specs/2026-11-21-otwarteaed-hub-design.md` (sekcja 11 ma pierwszeństwo przed 1–10).

## Global Constraints

- Terminy: **draft 18:00 (najpóźniej 20:00) 21.11; finał 9:00 (najpóźniej 11:00) 22.11**. Zadania 0–8 i 11 (szkic) muszą być w drafcie.
- Współrzędne wynikowe: WGS84, kropka dziesiętna, 6 miejsc po przecinku; `[lon, lat]` w GeoJSON.
- CSV wynikowy: UTF-8 bez BOM, nagłówek, separator `,`, cudzysłowy według RFC 4180, kropka dziesiętna, puste = pusta komórka.
- Nigdy nie nadpisujemy wartości źródła; pola pochodne są osobne. Brak godzin/dostępu → `status_dostepnosci = "brak_danych"`, kolor zielony, waga w ocenie jakości 0.
- XML: przestrzeń nazw `urn:otwarte-dane:harvester:1.13`, musi przechodzić `xmllint --noout --schema .cache/otwarte_dane_latest.xsd`. MD5 małymi literami, w pliku obok XML z rozszerzeniem `.md5` (sam skrót + `\n`).
- Kategoria zbioru: `HEAL`. `extIdent` maks. 36 znaków, stały między przebiegami.
- Licencje: zasób scalony (z OSM) → warunki ODbL w `dbOrCopyrighted` + atrybucje w `source`; zasób `aed_dysponenci.csv` → `dbOrCopyrightedLicenseChosen` = `CC BY 4.0`.
- Nazwy pól po polsku, snake_case, ASCII.
- Usługi zewnętrzne z własnym User-Agent `otwarteaed-hub/1.0 (+https://otwarteaed.pl)`, maks. 8 równoległych zapytań do GUGiK.
- Bez godła, flagi i barw narodowych w materiałach kampanii.
- Każdy plik z `hub/` musi dać się zaimportować w przeglądarce (żadnego `node:*` poza `hub/zbierz.mjs` i testami).

## Review Focus

1. Eksport z polskiego Excela: CSV w Windows-1250, separator `;`, przecinek dziesiętny → poprawne polskie znaki i liczby (test w Task 2 i 3).
2. Nagłówki z BOM, spacjami na początku i inną wielkością liter (Krosno ma `" Szerokość geograficzna"`) → rozpoznane (test w Task 4).
3. Wiersz z pustymi albo tekstowymi współrzędnymi („brak”) → obserwacja zostaje, flaga `brak_wspolrzednych`, bez wyjątku, poza mapą (test w Task 3 i 7).
4. GUGiK niedostępny lub przekroczony czas → przebieg kończy się na bazie adresów, flaga `brak_adresu`, bez wyjątku (test w Task 5).
5. Dwa AED z tego samego źródła w tym samym budynku (identyczne współrzędne) → nie są scalane (test w Task 6).

---

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `hub/schemat.json` | Wzorcowy zakres danych v1: pola, typy, wymagalność, słowniki, opis, przykład, odpowiednik OSM |
| `hub/czytaj.mjs` | Bajty pliku → `{format, naglowki, wiersze, meta}` (CSV, XLSX, JSON, GeoJSON, OSM JSON, KML) |
| `hub/normalizuj.mjs` | Liczby, współrzędne (przecinek, DMS, zamiana osi, PL-1992), daty, status dostępności, wiersz → obserwacja |
| `hub/wykryj.mjs` | Dopasowanie nagłówków i treści do profili/szablonów, wynik 0–1 + proponowane mapowanie |
| `hub/adresy.mjs` | GUGiK UUG: adres odwrotny i geokodowanie, baza wyników |
| `hub/scal.mjs` | Kandydaci duplikatów, podobieństwo, scalanie z pochodzeniem i konfliktami |
| `hub/jakosc.mjs` | Flagi z wagami, ocena 0–100, raport per źródło |
| `hub/eksport.mjs` | CSV, GeoJSON, lekki indeks mapy, XLSX (arkusze), XML dane.gov.pl |
| `hub/md5.mjs` | MD5 w czystym JS (przeglądarka nie ma MD5 w WebCrypto) |
| `hub/zbierz.mjs` | CLI: profile → pobranie/odczyt → potok → pliki w `otwarteaed/dane/` + kopia indeksu do `public/dane/` |
| `.cache/otwarte_dane_latest.xsd` | Oficjalny XSD pobierany w testach z https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd (nie w repo; bez sieci test XSD jest pomijany z komunikatem) |
| `zrodla/{osm,krosno,przemysl,marki,legionowo}.json` | Profile źródeł |
| `szablony/{mam_wspolrzedne,mam_adresy}.json` | Profile 2 szablonów gmin |
| `wejscie/` | Zamrożone surowe pliki (kopie z `../../11_misja-aed_MC/pobrane/`) |
| `baza/adresy_prg.json` | Baza wyników PRG |
| `otwarteaed/index.html`, `otwarteaed/kreator.mjs`, `otwarteaed/styl.css` | Strona danych i kreator |
| `test/*.test.mjs` | Testy `node --test` |
| `public/app.js`, `public/aed.js` | gdzieaed.pl: nowe statusy i kolory |
| `kampania/` | Logo (svg/png/jpg/pdf), księga znaku (pdf), naklejki |
| `docs/opis_projektu.md`, `docs/oswiadczenie_ai.md`, `docs/propozycja_psp_osp.md`, `docs/ograniczenia.md` | Dokumenty do oddania |

### Wspólne typy (używane przez wszystkie zadania)

```js
// Profil (zrodla/*.json i szablony/*.json)
{ id: "krosno", nazwa: "Urząd Miasta Krosna", rodzaj: "zrodlo" | "szablon",
  potwierdzenie: "dysponent" | "spolecznosc",
  licencja: "CC0-1.0", atrybucja: "Urząd Miasta Krosna",
  pobierz?: { plik?: "wejscie/dane_resource_54632.csv", url?: "https://...{RRRR}{MM}{DD}...", dane_gov_pl?: { zbior: 3624, format: "csv" } },
  format?: { typ?: "csv"|"xlsx"|"json"|"geojson"|"osm"|"kml", kodowanie?: "auto", separator?: "auto", dziesietny?: "auto" },
  kolumny: { szerokosc: ["Szerokość geograficzna", "lat", ...], dlugosc: [...], nazwa_obiektu: [...], ... } }  // pole schematu → aliasy

// Obserwacja (jeden rekord jednego źródła po normalizacji)
{ obs_id: "krosno:12", zrodlo: "krosno", potwierdzenie, licencja, atrybucja,
  szerokosc: number|null, dlugosc: number|null, ...pola schematu (string|null),
  adres_zrodlowy: string|null, status_dostepnosci: "24/7"|"brak_danych"|"godziny"|"ograniczony",
  flagi: string[], przeksztalcenia: string[], surowe: object }

// AED (rekord scalony) = pola schematu + { aed_id, zrodla: string[], liczba_zrodel, konflikty: string[], flagi_jakosci: string[], ocena_jakosci: number }
```

---

### Task 0: Porządki w repozytorium

**Files:**
- Create: `wejscie/` (kopie: `osm_aed_pl.json`, `dane_resource_54632.csv`, `dane_resource_62093.geojson`, `dane_resource_68353.csv`, `dane_resource_2625221.csv`, `osm_pobranie_log.json`), `vendor/xlsx.mjs`, `package.json` (`{"type":"module","scripts":{"test":"node --test test/"}}`)
- Modify: `.gitignore` (nie wykluczać `kampania/**`, `docs/**`), usunąć `codex_log.txt`, `codex_log_2.txt`, `kolejka_codex.sh`, `ZADANIE_codex*.md` (przenieść do `docs/archiwum/`, opisać w oświadczeniu AI)
- Test: `test/wejscie.test.mjs`

- [ ] **Step 1:** Test `wejscie zawiera wszystkie pliki`: dla każdej nazwy powyżej `existsSync("wejscie/"+n)` === true; `import("../vendor/xlsx.mjs")` ma `read` i `write`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Skopiować pliki; pobrać `https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs` do `vendor/xlsx.mjs`; poprawić `.gitignore`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `chore: dane wejściowe w repo, SheetJS, porządki`.

### Task 1: Wzorcowy zakres danych + plik xlsx

**Files:**
- Create: `hub/schemat.json`, `hub/eksport.mjs` (na razie tylko `doXLSX`), `otwarteaed/dane/wzorcowy_zakres_danych.xlsx` (generowany przez `node hub/zbierz.mjs --tylko-schemat`)
- Test: `test/schemat.test.mjs`

**Interfaces:**
- Produces: `schemat.json` = `{ wersja: "1.0", pola: [{ nazwa, opis, typ: "tekst"|"liczba"|"data"|"slownik"|"lista", format?, wymagane: boolean, slownik?: string[], przyklad, osm?: string, szablony: ("mam_wspolrzedne"|"mam_adresy")[] }] }`; `doXLSX(arkusze: {nazwa: string, wiersze: (string|number|null)[][]}[]) -> Uint8Array` w `hub/eksport.mjs`.

- [ ] **Step 1:** Test: schemat zawiera pola wymagane `aed_id, szerokosc, dlugosc, zrodla` (`wymagane: true`) oraz wszystkie pola z sekcji 5.2 specyfikacji i `potwierdzenie` (słownik `dysponent, spolecznosc, brak`), `status_dostepnosci` (słownik `24/7, brak_danych, godziny, ograniczony`); każda nazwa pasuje do `/^[a-z0-9_]+$/`. Test: `doXLSX([{nazwa:"Pola", wiersze:[["a"],["b"]]}])` odczytany przez `XLSX.read` ma arkusz `Pola` z `A2 === "b"`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Napisać `schemat.json` i `doXLSX` (`XLSX.utils.aoa_to_sheet`, `XLSX.write({type:"array", bookType:"xlsx"})`). Generator `wzorcowy_zakres_danych.xlsx` z arkuszami **Pola**, **Słowniki**, **Szablony**, **Przykład** (przykład uzupełnić w Task 7).
- [ ] **Step 4:** `npm test` → PASS; otworzyć xlsx w Numbers/Excel do wzrokowej kontroli.
- [ ] **Step 5:** Commit `feat: wzorcowy zakres danych v1 + xlsx`.

### Task 2: Czytanie plików

**Files:**
- Create: `hub/czytaj.mjs`
- Test: `test/czytaj.test.mjs`

**Interfaces:**
- Produces: `czytajPlik(bajty: Uint8Array, nazwa: string, format?: object) -> { format: string, naglowki: string[], wiersze: object[], meta: { kodowanie: string, separator?: string, zagniezdzony?: boolean } }`. Dla GeoJSON wiersz = `properties` + `__lon`, `__lat` z geometrii Point; dla OSM wiersz = `tags` + `__lon`, `__lat` (`lat/lon` lub `center`) + `__id` (`node/123`); dla KML = `name`, `description`, `__lon`, `__lat`.

- [ ] **Step 1:** Testy:
  - `wejscie/dane_resource_68353.csv` (Marki): `meta.zagniezdzony === true`, 8 wierszy, nagłówki zawierają `"Numer Id"`;
  - Krosno: 21 wierszy;
  - Przemyśl GeoJSON: 21 wierszy, każdy ma liczby `__lon`, `__lat`;
  - OSM: 18 301 wierszy, pierwszy ma `__id` zaczynające się od `node/` albo `way/`;
  - bajty `new TextEncoder`-niezależne: bufor Windows-1250 dla `"nazwa;szer\nŁódź;51,77"` (zakodowany ręcznie: `Ł`=0xA3, `ó`=0xF3, `ź`=0x9F) → `meta.kodowanie === "windows-1250"`, `meta.separator === ";"`, `wiersze[0].nazwa === "Łódź"`;
  - CSV z BOM UTF-8 → pierwszy nagłówek bez `\uFEFF`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować:
  - kodowanie: `new TextDecoder("utf-8",{fatal:true})`, przy błędzie `"windows-1250"`;
  - separator: najczęstszy spośród `, ; \t |` w pierwszych 5 liniach poza cudzysłowami;
  - parser CSV według RFC 4180;
  - CSV zagnieżdżony: gdy jest dokładnie 1 kolumna, a jej wartości zawierają separator, sparsować ponownie zawartość komórek;
  - XLSX przez `XLSX.read` + `sheet_to_json({header:1})`, pierwszy niepusty wiersz jako nagłówek;
  - KML przez wyrażenia regularne na `<Placemark>` (bez DOMParser, żeby działało w Node).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: czytanie CSV/XLSX/GeoJSON/OSM/KML z wykrywaniem kodowania`.

### Task 3: Normalizacja

**Files:**
- Create: `hub/normalizuj.mjs`
- Test: `test/normalizuj.test.mjs`

**Interfaces:**
- Consumes: profil (typy wspólne), wiersz z Task 2.
- Produces:
  - `parsujLiczbe(s: string|number|null) -> number|null`;
  - `parsujWspolrzedne(a, b, {kolejnosc?: "lat,lon"|"lon,lat"|"auto"}) -> { szerokosc: number|null, dlugosc: number|null, flagi: string[] }`;
  - `pl1992DoWgs84(x: number, y: number) -> {szerokosc, dlugosc}`;
  - `normalizujDate(s) -> string|null` (RRRR-MM-DD);
  - `statusDostepnosci({godziny, dostep}) -> "24/7"|"brak_danych"|"godziny"|"ograniczony"`;
  - `normalizujWiersz(wiersz: object, profil: Profil, mapowanie: Record<string,string>, indeks: number) -> Obserwacja`.

- [ ] **Step 1:** Testy z wartościami:
  - `parsujLiczbe("50,1509") === 50.1509`, `parsujLiczbe(" 21.96 ") === 21.96`, `parsujLiczbe("brak") === null`.
  - `parsujWspolrzedne("21.105177","52.322235")` → `szerokosc 52.322235`, `dlugosc 21.105177`, flagi zawierają `zamienione_osie`.
  - `parsujWspolrzedne("50°09'03\"N","21°57'44\"E")` → szerokość ≈ 50.150833 (±1e-6).
  - `parsujWspolrzedne("50,15 21,96", null)` (para w jednym polu) → 50.15 / 21.96.
  - `pl1992DoWgs84(500000, 250000)` → szerokość ≈ 51.7 ±0.5, długość ≈ 16.0 ±1. Dokładnie: punkt odniesienia z CS2000/PL-1992 `x=600000 (northing), y=500000 (easting)` → `szerokosc ≈ 52.0`, `dlugosc ≈ 19.0` z tolerancją 0.01 (środek odwzorowania 19°E; northing 600000 ≈ 52°N, ponieważ false northing = −5 300 000).
  - Wynik poza obwiednią PL i bez sensownej zamiany → flaga `poza_polska`, wartości zachowane.
  - `normalizujDate("21.11.2026") === "2026-11-21"`, `normalizujDate("20261121") === "2026-11-21"`.
  - `statusDostepnosci({godziny:null,dostep:null}) === "brak_danych"`, `{godziny:"24/7"}` → `"24/7"`, `{godziny:"Mo-Fr 08:00-16:00"}` → `"godziny"`, `{dostep:"private"}` → `"ograniczony"`.
  - `normalizujWiersz` dla wiersza z pustymi współrzędnymi → obserwacja z `szerokosc: null` i flagą `brak_wspolrzednych`, bez wyjątku; `surowe` === wiersz wejściowy; `obs_id` = `${profil.id}:${idZrodla ?? indeks+1}`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować:
  - obwiednia PL: 49.0–54.84°N, 14.12–24.15°E (jak w README);
  - PL-1992: odwrotne odwzorowanie Gaussa-Krügera na GRS80, `k0 = 0.9993`, `L0 = 19°`, false easting `500000`, false northing `-5300000`; wartości > 1000 traktować jako PL-1992;
  - wartości dostępu mapować na słownik (`yes/public` → publiczny, `customers/permit` → klienci, `private/no` → ograniczony);
  - każdą zmianę dopisać do `przeksztalcenia`, np. `"zamiana osi"`, `"przecinek→kropka"`, `"PL-1992→WGS84"`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: normalizacja współrzędnych, dat i dostępności`.

### Task 4: Profile i wykrywanie szablonu

**Files:**
- Create: `hub/wykryj.mjs`, `zrodla/osm.json`, `zrodla/krosno.json`, `zrodla/przemysl.json`, `zrodla/marki.json`, `zrodla/legionowo.json`, `szablony/mam_wspolrzedne.json`, `szablony/mam_adresy.json`
- Test: `test/wykryj.test.mjs`

**Interfaces:**
- Consumes: `czytajPlik` (Task 2).
- Produces: `normalizujNaglowek(s) -> string` (małe litery, bez diakrytyków, bez BOM i spacji/podkreśleń); `wykryjProfil(naglowki: string[], wiersze: object[], profile: Profil[]) -> { id: string, wynik: number, mapowanie: Record<string,string>, brakujaceWymagane: string[] }[]`, posortowane malejąco po `wynik`.

- [ ] **Step 1:** Testy:
  - każdy z 5 plików w `wejscie/` → pierwszy wynik to jego własny profil, `wynik >= 0.8`;
  - Krosno z nagłówkiem `" Szerokość geograficzna"` → `mapowanie.szerokosc === " Szerokość geograficzna"`;
  - nagłówki `["Nazwa obiektu","Ulica","Nr","Kod","Miejscowość"]` → pierwszy wynik `mam_adresy`;
  - nagłówki `["nazwa","lat","lon","opis"]` → pierwszy `mam_wspolrzedne`;
  - kolumny o nieznanych nazwach `["kol1","kol2"]` z wartościami `"50,1"` i `"21,9"` → mapowanie wykrywa `szerokosc: "kol1"`, `dlugosc: "kol2"` po treści.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować. Wynik = (liczba trafionych pól ważonych: wymagane ×2) / (maksimum dla profilu). Treść: kolumna z ≥ 80% liczb w 49–55 → kandydat szerokości, w 14–25 → długości. Profile źródeł mają aliasy dokładnie takie jak nagłówki plików; szablony mają szerokie listy aliasów (np. `szerokosc: ["szerokosc","szerokosc geograficzna","lat","latitude","y","wsp_y"]`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: profile źródeł, 2 szablony gmin, wykrywanie`.

### Task 5: Adresy z PRG + baza

**Files:**
- Create: `hub/adresy.mjs`, `baza/adresy_prg.json` (wypełnia przebieg w Task 7)
- Test: `test/adresy.test.mjs`

**Interfaces:**
- Produces:
  - `kluczAdresu(szer, dl) -> string` (`"50.15095,21.96241"`, 5 miejsc);
  - `async adresOdwrotny(szer, dl, {fetch, promien=50}) -> AdresPRG|null`;
  - `async geokoduj(tekst, {fetch}) -> {szerokosc, dlugosc, adres: AdresPRG}|null`;
  - `async uzupelnijAdresy(obserwacje, baza: Record<string, AdresPRG|null>, {fetch, rownolegle=8, limitMs=8000}) -> {zapytan: number, zBazy: number, bledow: number}`, który dopisuje do obserwacji pola adresu i `adres_zrodlo`.
- `AdresPRG = {ulica, numer, kod_pocztowy, miejscowosc, gmina, powiat, wojewodztwo, teryt_gmina, simc, ulic, adres_odleglosc_m}`.
- URL odwrotny: `https://services.gugik.gov.pl/uug/?request=GetAddressReverse&location=POINT(${dl}%20${szer})&srid=4326&radius=${promien}` (UWAGA: spacja musi być zakodowana jako `%20`; kolejność lon lat). Pole `jednostka` ma postać `{Polska,podkarpackie,rzeszowski,"Głogów Małopolski"}`, `teryt` = 6 znaków.

- [ ] **Step 1:** Testy z `fetch` podstawionym (zwraca zapisaną odpowiedź dla Głogowa Małopolskiego z rekonesansu: `city "Głogów Małopolski", street "Rynek", number "1A", teryt "181606", simc "0974328", ulic "19253", code "36-060", distance "5.88"`):
  - `adresOdwrotny(50.1509467, 21.9624141)` → `miejscowosc "Głogów Małopolski"`, `wojewodztwo "podkarpackie"`, `powiat "rzeszowski"`, `teryt_gmina "181606"`, `adres_odleglosc_m ≈ 5.9`;
  - pusta odpowiedź przy 50 m → drugie zapytanie z `radius=200` i flaga `adres_przyblizony`;
  - `fetch` rzucający wyjątek → `uzupelnijAdresy` zwraca `bledow > 0`, obserwacja dostaje flagę `brak_adresu`, brak wyjątku;
  - drugi przebieg z tą samą bazą wykonuje 0 zapytań (`zapytan === 0`).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować z pulą 8 obietnic i `AbortSignal.timeout(limitMs)`. Gdy źródło ma własny adres, zostaje w `adres_zrodlowy`; pola jednolite pochodzą z PRG (`adres_zrodlo: "PRG"`), a jeśli PRG nic nie zwraca, z PRG nie bierzemy nic (`adres_zrodlo: "zrodlo"`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: jednolite adresy z PRG z bazą wyników`.

### Task 6: Scalanie duplikatów

**Files:**
- Create: `hub/scal.mjs`
- Test: `test/scal.test.mjs`

**Interfaces:**
- Consumes: Obserwacja[] (po Task 5).
- Produces: `odlegloscM(a, b) -> number` (haversine); `podobienstwo(a: Obserwacja, b: Obserwacja) -> number` (0–1); `scal(obserwacje: Obserwacja[], {progM=30, progScal=0.5, progSzary=0.3, priorytet=["dysponent","spolecznosc"]}) -> AED[]`.

- [ ] **Step 1:** Testy:
  - dwie obserwacje z różnych źródeł 10 m od siebie z tym samym `simc+ulic+numer` → 1 AED, `liczba_zrodel 2`, `zrodla` zawiera oba `obs_id`;
  - dwie obserwacje z **tego samego** źródła o identycznych współrzędnych → 2 AED;
  - obserwacje 200 m od siebie → 2 AED;
  - konflikt: `godziny "24/7"` (OSM) vs `"Mo-Fr 08:00-16:00"` (dysponent) → wynik ma godziny dysponenta, a `konflikty` zawiera `"godziny: 24/7 (osm:node/1)"`;
  - pole puste u dysponenta i niepuste w OSM → wartość z OSM;
  - suma długości `zrodla` po scaleniu === liczba obserwacji wejściowych (nic nie ginie);
  - `aed_id` deterministyczny: dwa uruchomienia → identyczne identyfikatory.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować:
  - siatka przestrzenna (komórka ok. 0,0005°) i porównanie z sąsiadami;
  - podobieństwo: 0.5 za ten sam punkt PRG (`simc+ulic+numer`), 0.3 × (1 − d/progM) za odległość, 0.2 × Jaccard słów (nazwa + operator + opis, bez polskich znaków, słowa ≥ 3 litery);
  - łączenie przez union-find;
  - wynik w szarej strefie → flaga `mozliwy_duplikat` na obu rekordach;
  - `aed_id` = `"PL-AED-" + md5(obs_id rekordu o najwyższym priorytecie, przy remisie najmniejszy leksykograficznie).slice(0,10)`, `md5` z `hub/md5.mjs`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: inteligentne scalanie z pochodzeniem`.

### Task 7: Jakość, eksport, XML dane.gov.pl, CLI zbierz

**Files:**
- Create: `hub/jakosc.mjs`, `hub/md5.mjs`, `hub/zbierz.mjs`
- Modify: `hub/eksport.mjs`
- Output: `otwarteaed/dane/{aed.csv, aed_RRRR-MM-DD.csv, aed_obserwacje.csv, aed_dysponenci.csv, aed.geojson, aed.xlsx, aed_mapa.json, jakosc.json, zrodla.json, dane_gov_pl.xml, dane_gov_pl.md5, SHA256SUMS, wzorcowy_zakres_danych.xlsx}`, `szablony/*.csv`, `szablony/*.xlsx`, kopia `aed_mapa.json` do `public/dane/`
- Test: `test/eksport.test.mjs`, `test/zbierz.test.mjs`

**Interfaces:**
- Consumes: wszystko z Task 1–6.
- Produces:
  - `md5(tekst: string) -> string` (32 znaki hex);
  - `ocenJakosc(aed) -> {flagi_jakosci, ocena_jakosci}`;
  - `raportJakosci(aed, obserwacje) -> object`;
  - `doCSV(rekordy, pola: string[]) -> string`;
  - `doGeoJSON(aed) -> object`;
  - `doIndeksuMapy(aed) -> array` (`[lon, lat, kodStatusu, aed_id, nazwa≤28]`, `kodStatusu`: 0 `brak_danych`, 1 `24/7`, 2 `godziny`, 3 `ograniczony`);
  - `doXML({dataDate: string, bazaUrl: string, zasoby: {extIdent, plik, tytul, opis, licencja?: "CC BY 4.0", warunkiOdbl?: boolean}[]}) -> string`;
  - CLI: `node hub/zbierz.mjs [--offline] [--bez-adresow] [--tylko-schemat] [--baza-url https://otwarteaed.pl/dane/]`.

- [ ] **Step 1:** Testy:
  - `md5("abc") === "900150983cd24fb0d6963f7d28e17f72"` oraz zgodność z `node:crypto` dla 1000 losowych napisów UTF-8;
  - `doCSV` z wartością zawierającą przecinek i cudzysłów → poprawnie zacytowana, `1.5` zapisane z kropką;
  - `doXML(...)` zapisany do pliku tymczasowego przechodzi `xmllint --noout --schema .cache/otwarte_dane_latest.xsd` (`execFileSync`, kod 0), ma `<category>HEAL</category>`, `extIdent` ≤ 36 znaków;
  - `ocenJakosc` dla rekordu z samym brakiem godzin → `ocena_jakosci === 100` (waga 0); z `brak_wspolrzednych` → < 50;
  - `test/zbierz.test.mjs`: `node hub/zbierz.mjs --offline --bez-adresow` kończy się kodem 0; `aed_obserwacje.csv` ma 18 375 wierszy danych; `aed.csv` ma mniej wierszy niż obserwacje i więcej niż 18 000; dwa przebiegi dają identyczne `SHA256SUMS` (poza polami czasu wygenerowania, które trzymać tylko w `jakosc.json`); wynik ma 7 rekordów Marek z przekształceniem `zamiana osi`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować.
  - MD5 według RFC 1321 na bajtach UTF-8.
  - XML według struktury żywego `oferta.xml` dewelopera:
    - `<ns2:datasets xmlns:ns2="urn:otwarte-dane:harvester:1.13">`;
    - jeden `<dataset status="published">`: `extIdent "otwarteaed_aed_polska"`, tytuł i opis PL/EN, `url https://otwarteaed.pl`, `updateFrequency daily`, `categories/HEAL`, `tags` (AED, defibrylatory, zdrowie, ratownictwo; pl i en);
    - `<conditions>` z `source` (wszystkie atrybucje) i `dbOrCopyrighted` (warunki ODbL dla zasobów z OSM);
    - zasoby: dzienny CSV `aed_RRRR-MM-DD.csv` (`extIdent "otwarteaed_aed_RRRRMMDD"`), `aed_dysponenci.csv`, `aed.xlsx`, `aed.geojson`; `availability local`, `dataDate`, `specialSigns/X`.
    - Kolejność i nazwy elementów sprawdzić z XSD (`xs:all` w datasecie; `conditions` ma własny typ: `source`, `modification`, `responsibilities`, `dbOrCopyrighted`, `dbOrCopyrightedLicenseChosen`, `personalData`).
  - `dane_gov_pl.md5` = `md5(xml) + "\n"`.
  - Przebieg z adresami (`node hub/zbierz.mjs` bez `--bez-adresow`) zapisuje `baza/adresy_prg.json`. Uruchomić go raz w tle, przed draftem, i zacommitować bazę.
  - Arkusz **Przykład** w `wzorcowy_zakres_danych.xlsx` dostaje 5 prawdziwych rekordów.
- [ ] **Step 4:** `npm test` → PASS; `xmllint` OK; ręcznie otworzyć `aed.xlsx`.
- [ ] **Step 5:** Commit `feat: eksport CSV/XML/MD5/XLSX i CLI zbierania` (razem z wygenerowanymi plikami w `otwarteaed/dane/` i `baza/`).

### Task 8: Strona otwarteaed.pl i kreator

**Files:**
- Create: `otwarteaed/index.html`, `otwarteaed/kreator.mjs`, `otwarteaed/styl.css`
- Test: `test/kreator.test.mjs` (logika `przebiegKreatora` bez DOM)

**Interfaces:**
- Consumes: `czytajPlik`, `wykryjProfil`, `normalizujWiersz`, `uzupelnijAdresy`, `ocenJakosc`, `doCSV`, `doXML`, `md5`, `doXLSX`.
- Produces: `async przebiegKreatora({bajty, nazwa, profile, mapowanie?, dysponent: {nazwa, url, teryt?}, fetch}) -> {propozycje, obserwacje, raport, pliki: {csv: string, xml: string, md5: string, profil: object}}` w `otwarteaed/kreator.mjs`.

- [ ] **Step 1:** Test: `przebiegKreatora` dla `wejscie/dane_resource_68353.csv` (Marki) → `propozycje[0].id === "marki"`, raport zgłasza 7 zamienionych osi, `pliki.xml` przechodzi `xmllint` z XSD, `pliki.md5 === md5(pliki.xml)`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Zaimplementować logikę, potem UI:
  - **(1)** upuść plik albo wklej URL;
  - **(2)** „Rozpoznano: szablon X (92%)” + listy rozwijane mapowania;
  - **(3)** tabela podglądu (pierwsze 20 wierszy) z oznaczonymi błędami i kafelkami jakości;
  - **(4)** przyciski „Pobierz CSV”, „Pobierz XML + MD5”, „Pobierz profil”, instrukcja w 3 krokach: wystaw pliki pod stałym adresem, złóż wniosek do MC, portal pobiera sam.
  - Pozostałe sekcje strony: pobieranie zbioru (CSV, XLSX, XML, GeoJSON), raport jakości per źródło (`jakosc.json`), opis schematu (`<details>`), szablony do pobrania.
  - WCAG: kontrast ≥ 4.5:1, etykiety, obsługa klawiatury; responsywnie od 360 px; minimum tekstu.
- [ ] **Step 4:** `npm test` → PASS; `python3 -m http.server 8000 -d .` i ręcznie: Marki → 4 kroki działają na komputerze i 390 px; zrzuty ekranu do `docs/zrzuty/`.
- [ ] **Step 5:** Commit `feat: otwarteaed.pl z kreatorem dla gmin`.

### Task 9: gdzieaed.pl na nowych danych

**Files:**
- Modify: `public/app.js`, `public/aed.js`, `public/index.html` (legenda)
- Test: `test_aed.mjs` (rozszerzyć)

- [ ] **Step 1:** Test w `test_aed.mjs`: kod statusu 0 (`brak_danych`) → kolor zielony (ten sam co 1), etykieta „brak danych — przyjęto: dostępny”; 2 → kolor godzin; 3 → czerwony.
- [ ] **Step 2:** `node test_aed.mjs` → FAIL.
- [ ] **Step 3:** Zmienić kolory i legendę; dymek pokazuje adres z PRG i `potwierdzenie`; mapa ładuje `public/dane/aed_mapa.json` z huba; szczegóły ze zbioru huba.
- [ ] **Step 4:** `node test_aed.mjs` → PASS; ręcznie: Głogów Małopolski pokazuje adres „Rynek 1A”.
- [ ] **Step 5:** Commit `feat: gdzieaed.pl na danych huba, nowe kolory`.

### Task 10: Logo i księga znaku

**Files:**
- Create: `kampania/logo/otwarte-aed.svg` (+ wersje poziome i pionowe, monochromatyczna), `kampania/logo/otwarte-aed.png` (1024 px, przezroczyste tło), `.jpg`, `.pdf`, `kampania/ksiega_znaku.html` → `kampania/ksiega_znaku.pdf`

- [ ] **Step 1:** Przejrzeć 5 szkiców z `kampania/logo/szkice/` z użytkownikiem i wybrać jeden.
- [ ] **Step 2:** Przerysować ręcznie do SVG (siatka 24 jednostek, maks. 6 kształtów, bez gradientów); sprawdzić czytelność przy 16 px.
- [ ] **Step 3:** Wyeksportować PNG, JPG i PDF (Chrome headless `--print-to-pdf` albo `rsvg-convert`, w zależności od tego, co jest dostępne).
- [ ] **Step 4:** Księga znaku:
  - kolory (HEX/RGB/CMYK, kontrast);
  - pole ochronne = wysokość litery „o”;
  - minimalny rozmiar 16 px / 8 mm;
  - niedozwolone użycia: 6 przykładów;
  - koncepcja w 3–5 zdaniach.
  - Eksport do PDF i wzrokowa kontrola.
- [ ] **Step 5:** Commit `feat: logo otwarte AED i księga znaku`.

### Task 11: Dokumenty do oddania i prezentacja

**Files:**
- Create: `docs/opis_projektu.md`, `docs/oswiadczenie_ai.md`, `docs/propozycja_psp_osp.md`, `docs/ograniczenia.md`, `docs/prezentacja.pptx` (skill `anthropic-skills:pptx`), `kampania/naklejki.html` → `kampania/naklejki.pdf`
- Modify: `README.md` (nowe uruchomienie: `npm test`, `node hub/zbierz.mjs --offline`)

- [ ] **Step 1 (draft, przed 18:00):** `opis_projektu.md` (tytuł, problem, rozwiązanie, kroki użytkownika: gmina w kreatorze, harvester, portal, mieszkaniec na gdzieaed.pl), szkic `oswiadczenie_ai.md` (Claude Code, Codex, Antigravity: co zrobiły, co zweryfikował człowiek), `ograniczenia.md`.
- [ ] **Step 2:** `propozycja_psp_osp.md` (1–2 strony, sekcja 5.12 specyfikacji).
- [ ] **Step 3:** Prezentacja ≥ 5 slajdów, każdy z dowodem (zrzut ekranu lub wynik):
  1. problem i liczby (99,4% bez adresu, 63% bez godzin);
  2. hub i przepływ danych;
  3. kreator gminy (zrzuty);
  4. zgodność z dane.gov.pl (XML przechodzi XSD 1.13, MD5, ten sam mechanizm co deweloperzy);
  5. wzorcowy zakres danych i szablony;
  6. jakość i scalanie (przykład Marek);
  7. kampania (logo, hasło, naklejki, gdzieaed.pl);
  8. propozycja PSP/OSP;
  9. ograniczenia.
- [ ] **Step 4:** Naklejki A6 (3 warianty haseł) do PDF.
- [ ] **Step 5:** Commit `docs: opis, oświadczenie AI, PSP/OSP, prezentacja`.
