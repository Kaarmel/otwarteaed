# otwarteaed.pl — hub danych AED: projekt (21.11.2026)

**Status: zatwierdzony przez użytkownika 21.11 ok. 15:24, ze zmianami opisanymi w sekcji 11.**

Źródła decyzji: [POMYSLY_usera_2026-11-21_mentorzy.md](../../../POMYSLY_usera_2026-11-21_mentorzy.md) (wytyczne mentorów, dosłownie), [POMYSLY_usera_2026-11-21_odpowiedzi_15-24.md](../../../POMYSLY_usera_2026-11-21_odpowiedzi_15-24.md), odpowiedzi użytkownika z 21.11 ok. 15:00, treść zadania `MC DZD - Pełna treść zadania konkursowego.pdf`, instrukcja COI „Instrukcja przygotowania pliku XML” (dane.gov.pl, wersja 1.0.6 z 18.11.2025).

## 1. Po co to jest

Nie ma kompletnej mapy AED w Polsce. Dane są rozproszone: OSM (18 301 punktów), kilka gmin na dane.gov.pl (Krosno, Przemyśl, Marki, Legionowo, Warszawa), miejskie mapy i tabele. Każde źródło ma inny format: inne nazwy kolumn, przecinek albo kropka w liczbach, zamienione osie (Marki), CSV zapisany wewnątrz jednej kolumny (Marki), brak adresów (99,4% punktów OSM nie ma żadnego tagu `addr:*`, stąd problem np. w Głogowie Małopolskim).

**otwarteaed.pl** to hub, który:
1. zbiera dane z wielu źródeł (URL, URL z datą w nazwie, zbiór na dane.gov.pl, plik od gminy);
2. sam rozpoznaje format i szablon, a użytkownik zatwierdza dopasowanie kilkoma kliknięciami;
3. sprowadza wszystko do jednego wzorcowego zakresu danych (jeden format współrzędnych, jeden format adresu z kodami TERYT);
4. scala duplikaty bez utraty informacji;
5. publikuje jeden zbiór wysokiej jakości: **CSV UTF-8 + XML w formacie importu dane.gov.pl + XLSX dla jury**;
6. jest w pełni weryfikowalny: przy każdej wartości wiadomo, skąd pochodzi i co z nią zrobiono.

**gdzieaed.pl** (obecny projekt w `public/`) zostaje miejscem dla mieszkańców, firm i gmin: mapa, najbliższe AED, karty do druku, materiały kampanii. Według mentorów karty są poza zakresem oceny, więc nie są priorytetem, ale zostają.

Ocena to całokształt („przełomowe i maksymalnie przydatne”). Innowacja: gminy dostają proste szablony, a strona sama rozpoznaje, w jakim szablonie są dane, i proponuje dopasowanie.

## 2. Cele, nie-cele, anty-cele

**Cele**
- G1. Wzorcowy zakres danych o AED (schemat v1): jedno źródło prawdy w `hub/schemat.json`, z którego powstaje `wzorcowy_zakres_danych.xlsx` (wymagany plik) i z którego korzysta walidator.
- G2. Harvester (CLI w Node) zbierający wszystkie źródła z rejestru profili i publikujący zbiór scalony.
- G3. Kreator w przeglądarce dla gminy lub dysponenta: plik albo URL → wykryty szablon → podgląd z błędami → pobranie CSV + XML (+ zapisany profil źródła).
- G4. Trzy szablony dla gmin (Prosty, Pełny, Adresowy) do pobrania jako CSV i XLSX.
- G5. Jednolite adresy dla całej Polski z PRG (GUGiK), z własną bazą (pamięcią) wyników.
- G6. Inteligentne scalanie duplikatów bez utraty danych.
- G7. Weryfikowalność: pochodzenie, dziennik przekształceń, raport jakości, testy na prawdziwych plikach, sumy kontrolne.
- G8. Propozycja: PSP zbiera od OSP dane o AED (dokument 1–2 strony + slajd); narzędziem zgłaszania jest hub z szablonem.
- G9. Kampania: nazwa, hasło, logo (jpg/png/pdf/svg), księga znaku (pdf), naklejki na drzwi z chwytliwym hasłem. Bez zmuszania ludzi.
- G10. Oddanie: opis i tytuł projektu, prezentacja ≥ 5 slajdów (zrzuty, kroki użytkownika, ograniczenia), kod, oświadczenie o użyciu AI.

**Nie-cele**
- Własne wyznaczanie tras, konta użytkowników, backend z bazą danych, zbieranie e-maili, wysyłka kart.
- Automatyczna edycja OSM.
- Sytuacje łamania prawa (np. AED zamknięte na klucz z historii w zadaniu). Mentorzy kazali ich nie rozważać.

**Anty-cele (porażka, nawet jeśli „działa”)**
- Scalanie, które gubi informację ze źródła.
- Kara w ocenie jakości za brak godzin lub dostępu (mentor: brak danych = przyjmujemy, że otwarte).
- Narzędzie, które działa tylko na naszych 5 plikach, a na nowym pliku gminy się sypie.
- Podgląd w kreatorze pokazuje co innego niż opublikowany plik.
- Gmina musi wypełniać skomplikowany formularz.

## 3. Ograniczenia

- Statycznie: hosting Cloudflare Pages (już skonfigurowany), bez serwera. Harvester uruchamiany lokalnie lub w zaplanowanym zadaniu CI; wyniki są plikami.
- Node 22 (już jest). Jedyna zewnętrzna biblioteka: SheetJS (czytanie i zapis XLSX), jeden plik w `vendor/`, ten sam w przeglądarce i w Node. Mapa: Leaflet jak dotąd.
- Licencje: OSM jest na ODbL; gminy na CC0 lub CC BY 4.0; portal w próbce API pokazuje tylko CC0 i CC BY. Atrybucje muszą zostać zachowane.
- Usługi zewnętrzne: GUGiK UUG (adresy PRG), dane.gov.pl API 1.4, Overpass lub eksport OpenAEDMap. UUG i API dane.gov.pl przyjmują zapytania z przeglądarki (sprawdzone przez recenzenta), więc kreator może sam pytać o adresy i zasoby portalu, bez serwera. Grzecznie: własny User-Agent, limit równoległych zapytań, pamięć wyników.
- Termin oddania: **do potwierdzenia przez użytkownika**. Plan ma linie cięcia (sekcja 9).
- Repozytorium musi działać po czystym sklonowaniu: surowe pliki wejściowe leżą w repo (`wejscie/`), tryb `--offline` korzysta tylko z nich.
- Zwycięzca przenosi prawa na Ministra Cyfryzacji; domeny w razie potrzeby przechodzą na ministerstwo (decyzja użytkownika). Zapisujemy to w ograniczeniach.

## 4. Rozważone podejścia

| | Podejście | Plusy | Minusy |
|---|---|---|---|
| **A (wybrane)** | Jeden rdzeń w JavaScript (moduły ES), uruchamiany w przeglądarce (kreator) i w Node (harvester). Źródła i szablony to deklaratywne profile JSON | Podgląd = wynik; jedna logika i jedne testy; brak serwera | Przepisanie `importuj.py` (343 linie) |
| B | Harvester w Pythonie, kreator w osobnym JS | Zostaje działający importer | Ta sama logika dwa razy; rozjazd podglądu i wyniku |
| C | Python w przeglądarce (Pyodide) | Jeden język | ok. 10 MB ładowania, wolno na telefonie |

Wybór A to decyzja wykonawcy (użytkownik mówi o efektach, nie o technologii; ponadto „tamtego kodu nie używamy”). Stary `importuj.py` i `test_importu.py` przechodzą na emeryturę po przeniesieniu logiki.

## 5. Projekt

### 5.1 Struktura repozytorium (propozycja)

```
hub/                 rdzeń (moduły ES, wspólne dla Node i przeglądarki)
  schemat.json       wzorcowy zakres danych v1 (pola, typy, wymagalność, słowniki)
  czytaj.mjs         CSV/XLSX/JSON/GeoJSON/KML/OSM → wiersze (+ wykrywanie kodowania, separatora, zagnieżdżonego CSV)
  wykryj.mjs         dopasowanie wierszy do profilu/szablonu, wynik w %
  normalizuj.mjs     współrzędne, daty, godziny, dostęp, tekst
  adresy.mjs         PRG (GUGiK UUG) + pamięć wyników
  scal.mjs           wykrywanie i scalanie duplikatów
  waliduj.mjs        flagi i ocena jakości
  eksport.mjs        CSV, GeoJSON, XLSX, XML dane.gov.pl, sumy kontrolne
  zbierz.mjs         CLI: node hub/zbierz.mjs [--offline] [--zrodlo id]
zrodla/*.json        profile źródeł (jedno źródło = jeden plik)
szablony/*.json      profile 3 szablonów gmin (+ wygenerowane .csv i .xlsx)
wejscie/             zamrożone surowe pliki (tryb offline, testy)
baza/adresy_prg.json pamięć wyników PRG (klucz: współrzędne zaokrąglone do 5 miejsc)
otwarteaed/          strona danych: kreator, pobieranie, raport jakości, opis schematu
public/  (→ gdzieaed) obecna mapa i karty, czytają wyniki huba
docs/                projekt, plan, propozycja PSP/OSP, oświadczenie AI, ograniczenia
kampania/            logo, księga znaku, naklejki
```

Podział na dwie strony i dokładne nazwy plików może zmienić wykonawca.

### 5.2 Wzorcowy zakres danych v1

Rekord AED (scalony). Nazwy pól po polsku, snake_case, bez polskich znaków. Wymagane minimum (oznaczone *):

- Identyfikacja: `aed_id`* (stały identyfikator), `zrodla`* (lista identyfikatorów obserwacji), `liczba_zrodel`.
- Położenie: `szerokosc`*, `dlugosc`* (WGS84, kropka dziesiętna, 6 miejsc), `lokalizacja_opis` (gdzie dokładnie: piętro, ściana, kapsuła), `wewnatrz` (tak/nie/brak_danych), `poziom`.
- Adres (jednolity, z PRG): `ulica`, `numer`, `kod_pocztowy`, `miejscowosc`, `gmina`, `powiat`, `wojewodztwo`, `teryt_gmina`, `simc`, `ulic`, `adres_zrodlo` (PRG / źródło), `adres_odleglosc_m`, `adres_zrodlowy` (dosłownie ze źródła).
- Dostępność: `godziny` (składnia opening_hours lub dosłowny tekst źródła), `dostep` (publiczny / klienci / ograniczony / brak_danych), `status_dostepnosci` (pochodny, patrz 5.6).
- Obiekt i kontakt: `nazwa_obiektu`, `operator`, `telefon`.
- Sprawność (opcjonalne, dla dysponentów): `data_weryfikacji`, `termin_elektrod`, `termin_baterii`, `mobilny` (tak/nie, np. pojazd).
- Metryczka: `licencja`, `atrybucja`, `data_danych`, `data_pobrania`, `flagi_jakosci`, `ocena_jakosci` (0–100).

`wzorcowy_zakres_danych.xlsx` (generowany ze `schemat.json`) ma arkusze: **Pola** (nazwa, opis, typ, format, wymagalność, przykład, odpowiednik OSM), **Słowniki** (dozwolone wartości), **Przykład** (kilka prawdziwych rekordów), **Szablony** (które pola ma każdy z 3 szablonów). Dokładny zestaw pól może dopracować wykonawca, ale wymagane minimum i zasady nazewnictwa zostają.

### 5.3 Trzy szablony dla gmin

1. **Prosty** (7 kolumn, do wypełnienia w Excelu): nazwa_obiektu, adres, szerokosc, dlugosc, lokalizacja_opis, godziny, telefon. Współrzędne mogą mieć przecinek.
2. **Pełny** (wzorcowy): wszystkie pola schematu, łącznie z dostępem, datą weryfikacji, terminami elektrod i baterii. Dla gmin, PSP/OSP i dużych dysponentów.
3. **Adresowy** (bez współrzędnych): ulica, numer, kod, miejscowość (opcjonalnie TERC/SIMC jak Legionowo), opis, godziny. Współrzędne uzupełnia hub z PRG (geokodowanie GUGiK); gdy się nie da, flaga `brak_wspolrzednych` i rekord nie trafia na mapę.

Każdy szablon to profil JSON z listą akceptowanych nazw kolumn (aliasów), dzięki czemu gmina może mieć własne nazwy, a hub i tak je rozpozna.

### 5.4 Profile źródeł i wykrywanie

Profil źródła (`zrodla/<id>.json`) opisuje:
- skąd pobrać: `url`, albo `url` z wzorcem daty (np. `.../{RRRR}{MM}{DD}/aed.csv`; hub szuka najnowszej istniejącej), albo `dane_gov_pl`: id zbioru i format (hub pyta API 1.4 o najnowszy zasób; adresy Krosna i Marek mają datę w ścieżce, więc to jest odporne na zmiany), albo plik lokalny;
- format: typ, kodowanie (auto: UTF-8 / Windows-1250 / UTF-8 z BOM), separator (auto), separator dziesiętny (auto), kolejność osi (auto), układ współrzędnych (auto: WGS84 lub PL-1992/EPSG:2180, przeliczany do WGS84);
- mapowanie kolumn źródła na pola schematu;
- licencję, atrybucję i dysponenta.

**Wykrywanie** (w kreatorze i w harvesterze, ten sam kod):
1. Rozpoznanie pliku: kodowanie, separator, nagłówek, CSV wewnątrz jednej kolumny (Marki), XLSX, GeoJSON, KML.
2. Porównanie nagłówków (małe litery, bez polskich znaków, bez spacji) z aliasami wszystkich profili i szablonów → wynik w %.
3. Badanie treści kolumn: liczby w zakresie Polski → szerokość lub długość; zamiana osi, gdy tylko odwrócona para trafia do Polski; liczby 6-cyfrowe → PL-1992; kody 7-cyfrowe → SIMC.
4. Propozycja: „To wygląda na szablon Prosty (92%)”, kolumny wstępnie przypisane, użytkownik może poprawić z listy rozwijanej, a podgląd od razu pokazuje błędy.
5. Wynik: znormalizowany CSV + XML do dane.gov.pl + profil JSON (do dodania do rejestru źródeł).

### 5.5 Normalizacja

- **Współrzędne** zawsze WGS84 z kropką i 6 miejscami. Akceptujemy kropkę i przecinek, parę w jednym polu („50,15 21,96”), stopnie z minutami i sekundami, przedrostki i przyrostki N/E, PL-1992. Zamiana osi tylko wtedy, gdy odwrócona para trafia do Polski (flaga). Poza Polską → flaga, bez naprawy.
- **Daty** do ISO 8601 (RRRR-MM-DD) z dd.mm.rrrr, dd-mm-rrrr, rrrrmmdd.
- **Tekst**: przycięte spacje, ujednolicone cudzysłowy, puste wartości → brak.
- **Adres** z PRG, patrz 5.7.

### 5.6 Dostępność: „brak danych = otwarte”

Nigdy nie nadpisujemy wartości ze źródła: puste godziny zostają puste. `status_dostepnosci` jest polem pochodnym:
- `24/7` → zielony;
- `brak_danych` (brak godzin i dostępu) → **zielony**, z dopiskiem „brak danych — przyjęto: dostępny”;
- `godziny` (podane inne godziny) → żółty, a na mapie stan „teraz” liczony jak dotąd;
- `ograniczony` (access=private/no) → czerwony.

Brak danych o dostępności **nie obniża** `ocena_jakosci` (waga 0); jest tylko informacją w raporcie. Na gdzieaed.pl trzeba zmienić legendę i logikę kolorów.

### 5.7 Jednolite adresy dla całej Polski (PRG)

- Dla każdego rekordu ze współrzędnymi: zapytanie GUGiK UUG `GetAddressReverse` (promień 50 m). Pusta odpowiedź → drugie podejście z promieniem 200 m i flagą `adres_przyblizony`. Nadal pusto → zostaje adres źródłowy albo brak, z flagą `brak_adresu`.
- Wynik: ulica, numer, kod, miejscowość, kody TERYT/SIMC/ULIC, jednostka (województwo, powiat, gmina), odległość. Kody TERYT rozstrzygają niejednoznaczne nazwy (Głogów ≠ Głogów Małopolski).
- **Baza adresów** `baza/adresy_prg.json` przechowuje wyniki; kolejne przebiegi pytają tylko o nowe lub przesunięte punkty. W ten sposób hub działa offline i jest powtarzalny.
- Rekordy bez współrzędnych (szablon Adresowy): `GetAddress` (geokodowanie), przyjmowane przy dokładności 1 (dokładny numer), inaczej flaga.
- Atrybucja: „Adresy: PRG, GUGiK”.

### 5.8 Scalanie duplikatów („inteligentnie i nic nie tracąc”)

- Dwa poziomy danych: **obserwacje** (każdy rekord każdego źródła, znormalizowany, z surowym oryginałem i dziennikiem przekształceń) oraz **AED** (rekordy scalone). Obserwacje publikujemy osobno (`aed_obserwacje.csv`), więc nic nie ginie.
- Kandydaci: obserwacje z **różnych** źródeł w odległości < 30 m. Obserwacji z tego samego źródła nie scalamy (dwa AED w jednym budynku to dwa urządzenia), tylko je oznaczamy.
- Ocena podobieństwa: odległość, ten sam punkt adresowy PRG, podobieństwo nazwy, operatora i opisu (znormalizowane słowa). Scalamy powyżej progu; w szarej strefie flaga `mozliwy_duplikat` bez scalania. Progi stroi wykonawca na danych (Krosno, Przemyśl i Legionowo pokrywają się z OSM; 20 z 21 punktów Krosna to dziś kandydaci).
- Wybór wartości pola: niepusta wygrywa z pustą; przy konflikcie pierwszeństwo ma dysponent (gmina, instytucja) przed OSM, a OSM przed resztą; wartości odrzucone trafiają do `konflikty` (pole: wartość: źródło).
- `aed_id` scalonego rekordu jest stały między przebiegami (np. wyprowadzony z identyfikatora obserwacji o najwyższym priorytecie). Sposób wybiera wykonawca, ale musi być deterministyczny.

### 5.9 Jakość i weryfikowalność

- Flagi (z wagami): brak współrzędnych, poza Polską, zamienione osie (naprawione), PL-1992 przeliczone, identyczne współrzędne przy różnych adresach (kopie z szablonu, przypadek Marki i Krosna), adres przybliżony, brak adresu, możliwy duplikat, szczegóły dostępności (waga 0).
- `ocena_jakosci` 0–100 dla rekordu oraz średnia dla źródła; raport `jakosc.json` i strona z raportem dla każdego źródła („Twój plik ma zamienione osie w 7 z 8 rekordów”), tonem pomocy, nie kary.
- Każda wartość ma pochodzenie: `zrodla`, `adres_zrodlo`, a w obserwacjach surowy oryginał i lista przekształceń.
- `SHA256SUMS` dla wszystkich plików wynikowych; `zrodla.json` z datą pobrania, sumą kontrolną wejścia i URL.
- Testy `node --test` na zamrożonych prawdziwych plikach: wykrycie profilu dla Krosna, Przemyśla, Marek, Legionowa i OSM; Marki: zagnieżdżony CSV i 7 zamienionych osi; przecinek dziesiętny; PL-1992; brak godzin → `brak_danych` i zielony; scalanie nie gubi obserwacji (liczba obserwacji wejściowych = suma `zrodla`); XML zgodny z instrukcją COI; ten sam wynik w trybie offline przy dwóch przebiegach.

### 5.10 Wyniki (pliki)

- `aed.csv`: zbiór scalony, UTF-8, nagłówek, przecinek jako separator, kropka dziesiętna. **Format główny.**
- `aed_obserwacje.csv`: wszystkie obserwacje z pochodzeniem.
- `aed.xlsx` dla jury: arkusze AED, Obserwacje, Źródła, Jakość, Słownik pól.
- `wzorcowy_zakres_danych.xlsx` (wymagany) oraz szablony `szablon_prosty|pelny|adresowy` w .csv i .xlsx.
- `dane_gov_pl.xml`: plik importu według instrukcji COI 1.0.6: `<p:datasets>` → `<dataset status="published">` z `extIdent`, tytułem i opisem PL/EN, `url`, kategorią **HEAL**, `tags`, `updateFrequency`, flagami `has*`; zasoby (`<resource>`) wskazują `aed.csv`, `aed_obserwacje.csv`, `aed.xlsx` i `aed.geojson` z `availability`, `dataDate`, `specialSigns`. Kreator generuje taki sam XML dla zbioru pojedynczej gminy.
- `aed.geojson` i lekki `aed_mapa.json` dla mapy gdzieaed.pl.
- `jakosc.json`, `zrodla.json`, `SHA256SUMS`.
- **Licencja**: zbiór scalony z OSM jest na ODbL (atrybucja wszystkich źródeł). Dodatkowo `aed_dysponenci.csv` bez danych OSM, na CC BY 4.0, zgodny z licencjami portalu. Do potwierdzenia z organizatorami, która wersja trafia na portal.

### 5.11 Źródła na start

- Zamrożone i działające: OSM (18 301), Krosno (21), Przemyśl (21), Marki (8), Legionowo (24).
- Do dodania, jeśli starczy czasu: Warszawa (profil gotowy, wymaga tokena API w zmiennej środowiskowej; bez tokena pomijamy z komunikatem), Łódź KML (136, licencja nieustalona → flaga licencji, poza `aed_dysponenci.csv`), ZTM Gdańsk (278 pojazdów, bez współrzędnych → `mobilny=tak`, tylko w raporcie i obserwacjach).
- Raport „źródła do pozyskania” (Kraków, Gdańsk, Wrocław, InPost, Poczta Polska, PKP Intercity, MOP A2, PSP/OSP) z informacją, czego brakuje (licencja, eksport).

### 5.12 Propozycja PSP / OSP

Dokument 1–2 strony + 1 slajd: wytyczne Komendanta Głównego PSP, żeby jednostki OSP (najpierw w KSRG) raz w roku zgłaszały AED (lokalizacja, dostępność, terminy elektrod i baterii) przez szablon Pełny. KW PSP agreguje dane i publikuje je na dane.gov.pl tym samym mechanizmem XML co deweloperzy; hub waliduje i scala. Szersza propozycja: dysponenci publiczni publikują listy AED w tym samym trybie (plik + XML, portal pobiera sam).

### 5.13 Kampania (gdzieaed.pl)

**Uwaga z treści zadania:** akcja z nazwą, hasłem i logo (25% oceny) ma „zachęcić dysponentów do dzielenia się danymi w portalu dane.gov.pl”. Dysponenci to gminy, firmy, szkoły i OSP, które mają AED. Kampania musi więc przede wszystkim mówić do nich („pokaż swój AED, wrzuć listę, zajmie to 2 minuty”), a mieszkańcy są odbiorcą drugim. Grupa docelowa i to, która marka niesie logo, czeka na decyzję użytkownika.

- Nazwa i hasło: do wymyślenia z użytkownikiem; robocza propozycja kierunku: „Gdzie AED?”.
- Logo: jpg, png, pdf, svg. Księga znaku pdf: kolory, pole ochronne, minimalny rozmiar, niedozwolone użycia, 3–5 zdań koncepcji.
- Naklejki na drzwi i przy planie ewakuacji (A6/A5, PDF do druku): krótkie hasło + strzałka + odległość do najbliższego AED + QR do gdzieaed.pl. Cel: kilka sekund uwagi, bez zmuszania.
- Obecna strona gdzieaed.pl czyta wyniki huba (nowa logika kolorów, adresy PRG).
- Film: opcjonalnie, krótki (15–30 s), tylko jeśli zostanie czas.

## 6. Co zdecydował użytkownik
- Hub otwarteaed.pl; CSV UTF-8 + XML (format ministerstwa, dane.gov.pl) + XLSX dla jury.
- „Ma być dużo danych i dobrze”: zbiór scalony zawiera OSM.
- Brak danych o dostępności: nie nadpisywać, pokazać „brak danych”, nie obniżać oceny, kolor zielony („domyślamy się, że otwarte”).
- Duplikaty scalać inteligentnie, nic nie gubiąc.
- Jeden format danych geograficznych; adresy sprawdzić dla całej Polski, zbierać inteligentnie, z bazą, jeśli dużo się zmienia.
- otwarteaed.pl = dane; gdzieaed.pl = mieszkańcy oraz kampania dla mieszkańców, firm i gmin.
- Starego kodu importera nie używamy.
- Domeny w razie potrzeby przechodzą na ministerstwo.

## 7. Decyzje wykonawcy (do sprawdzenia przez użytkownika)
- Podejście A: jeden rdzeń JS dla przeglądarki i Node.
- SheetJS jako jedyna biblioteka do XLSX (brak `openpyxl`; ta sama biblioteka czyta Excele gmin w przeglądarce).
- Adresy z PRG (GUGiK UUG), promień 50 m, potem 200 m z flagą.
- Próg scalania 30 m + podobieństwo; bez scalania w obrębie jednego źródła.
- Kategoria XML: HEAL; dwa warianty licencyjne (ODbL pełny, CC BY bez OSM).
- Szablon Adresowy z geokodowaniem GUGiK.
- \`.gitignore\` przestaje wykluczać \`*.pdf\` i \`*.png\` w katalogach \`kampania/\` i \`docs/\` (logo, księga znaku i zrzuty muszą trafić do oddania).

## 8. Otwarte pytania do organizatorów (nie blokują pracy)
- Która licencja jest dopuszczalna na portalu dla zbioru z danymi OSM (ODbL)?
- Czy portal ma środowisko testowe importu XML?
- Termin oddania i forma (repozytorium, pliki, link).

## 9. Kolejność i linie cięcia

**P0 (musi być)**
- Porządki w repo.
- `schemat.json` + `wzorcowy_zakres_danych.xlsx`.
- Rdzeń: czytanie, wykrywanie, normalizacja, adresy PRG z bazą, scalanie, walidacja, eksport CSV/XML/XLSX.
- 5 źródeł.
- Kreator z wykrywaniem 3 szablonów.
- Testy.
- Logo + księga znaku.
- Prezentacja ≥ 5 slajdów, opis, oświadczenie AI, ograniczenia.

**P1**
- gdzieaed.pl na nowych danych.
- Naklejki.
- Propozycja PSP/OSP.
- Warszawa i Łódź.
- Raport „źródła do pozyskania”.

**P2**
- Film.
- Kolejne źródła.
- Własny XSD do walidacji XML.
- Zaplanowane automatyczne przebiegi.

Logo, księga znaku i prezentacja mają stałe bloki czasu w planie, nie „na koniec”: logo i hasło to 25% oceny.

## 10. Zostawione wykonawcy
Dokładne nazwy plików i katalogów; algorytm podobieństwa nazw i progi; wygląd kreatora (z zasadami WCAG, mobile, mało tekstu, piktogramy jak w gdzieaed.pl); sposób generowania stałego `aed_id`; techniczny sposób wdrożenia dwóch stron.


## 11. Zmiany po zatwierdzeniu (21.11, 15:24) — mają pierwszeństwo przed sekcjami 1–10

**Terminy:** draft o 18:00 (najpóźniej 20:00), wersja finalna do 9:00 w niedzielę 22.11 (najpóźniej 11:00).

**Mechanizm dane.gov.pl, tak jak działa dziś u dewelopera (sprawdzone na żywym wdrożeniu dewelopera):**
- Dostawca wystawia pod stałym adresem plik `*.xml` w przestrzeni nazw `urn:otwarte-dane:harvester:1.13` i obok plik `*.md5` (sam skrót MD5 małymi literami; według „Przewodnika automatycznego dodawania danych XML” MC v1.02, rozdz. III pkt 3, adres to adres XML z rozszerzeniem `.md5`).
- Dostawca składa do MC wniosek z adresem XML. Portal cyklicznie czyta `.md5`; gdy się zmieni, pobiera XML i importuje zbiory i zasoby (stałe `extIdent`).
- Zasoby to pliki CSV z datą w nazwie (`availability=local`: portal pobiera kopię).
- **Oficjalny schemat XSD 1.13** jest publiczny: https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd. Testy pobierają go do `.cache/` (poza repo). **Z projektu dewelopera nic nie kopiujemy** (decyzja użytkownika: wzorujemy się na mechanizmie, kod piszemy sami). Żywy XML dewelopera przechodzi `xmllint --schema`. Nasz XML musi przechodzić ten sam test (część testów).
- Licencje w XSD (`dbOrCopyrightedLicenseChosen`): CC0 1.0, CC BY 4.0, CC BY-SA 4.0, CC BY-NC 4.0, CC BY-NC-SA 4.0, CC BY-ND 4.0. ODbL nie ma na liście, ale `dbOrCopyrighted` to tekst do 4000 znaków. Decyzja użytkownika: „ma być więcej danych, przyjmij jak trzeba”. Zbiór scalony (z OSM) publikujemy z warunkami ODbL w `dbOrCopyrighted` + atrybucja w `source`; zasób tylko z danymi dysponentów: `CC BY 4.0`.
- Zasoby mogą mieć `regions/terytIdent` (do 20 kodów TERYT). Wykorzystujemy kody z PRG (np. województwa).
- Kreator generuje dla gminy ten sam komplet: CSV z datą + XML + MD5 + instrukcję „wystaw pod adresem X i złóż wniosek”.

**Szablony:** zamiast trzech dwa, podzielone logicznie według tego, co dysponent ma:
1. **„Mam współrzędne”** (wzorcowy, pełny);
2. **„Mam tylko adresy”** (współrzędne z PRG).

Każdy inny format i tak przechodzi przez automatyczne wykrywanie.

**Kolory:** zielony = 24/7 oraz brak danych (przyjęto: dostępny); inny kolor tylko dla ustalonych, ograniczonych godzin. Czerwony dla access=private/no zostaje, do potwierdzenia przez użytkownika.

**Dane potwierdzone:** mentorka z MC: kampania nie może brzmieć jak „wrzuć AED”, bo dane muszą być potwierdzone; MC rozważa projekt, w którym PSP wymusza na OSP publikację miejsc AED. Dlatego:
- nowe pole `potwierdzenie`: `dysponent` (dane urzędowe lub od właściciela) / `spolecznosc` (OSM) / `brak`;
- kampania mówi do dysponentów (gminy, PSP/OSP, instytucje), a nie do przypadkowych osób;
- propozycja PSP/OSP (5.12) to mocny element pitchu.

**Nazwa i hasło (decyzja wykonawcy, do akceptacji):**
- Kampania i hub: **„otwarte AED”**, nawiązanie do „Otwartych Danych” i dane.gov.pl.
- Wersja dla mieszkańców: gdzieaed.pl.
- Hasło robocze: **„Każda minuta ma adres.”**

**Logo:**
- 5 szkiców z Antigravity (pomocnik image-generator), każdy z innym kierunkiem i ziarnem (`kampania/logo/szkice/`).
- Wybrany szkic przerysowujemy ręcznie do czystego SVG, a z niego robimy PNG, JPG i PDF.
- Styl: czysty, urzędowo-cyfrowy (gov.pl, mObywatel, dane.gov.pl), inspiracja lucaslima.design.
- Bez godła, flagi i barw narodowych.
