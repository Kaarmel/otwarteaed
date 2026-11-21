# otwarteaed.pl

Niezależny, otwarty zbiór danych o defibrylatorach AED w Polsce. Importer w Pythonie (tylko stdlib), raport jakości i statyczna strona z wyszukiwaniem AED oraz generatorem karty A4. Bez frameworków i backendu. Nie jest urzędową ewidencją ani potwierdzeniem sprawności lub dostępności urządzenia. W nagłym wypadku dzwoń 112.

## Uruchomienie

W bieżącym katalogu, Python 3.9 lub nowszy:

```sh
python3 importuj.py
python3 test_importu.py
python3 -m http.server 8000 --bind 127.0.0.1 -d public
```

Otwórz <http://localhost:8000>. Mapa i generator wymagają internetu (biblioteki unpkg/cdnjs i kafelki OpenStreetMap); eksporty są lokalne. Testy parsera JS wymagają dostępnego polecenia `node` (Node.js 22+ zalecany). Geolokalizacja działa na localhost lub HTTPS, po zgodzie w przeglądarce. Telefon potrzebuje bezpiecznego kontekstu HTTPS do geolokalizacji; samo otwarcie strony przez adres IP lokalnego serwera zwykle nie wystarczy.

Opcjonalnie `python3 importuj.py --odswiez` pobiera świeży OSM z Overpass (User-Agent, maksymalnie 3 próby, odstępy 2 i 4 s, timeout połączenia 240 s). Odpowiedź z błędem/`remark` lub pusta nie zastępuje danych. Kopia trafia wyłącznie do `.cache/osm_aed_pl.json` w tym projekcie i służy bieżącemu importowi. Zwykły import zawsze korzysta z pierwotnego wsadu, nie z cache. Źródłowy katalog `../HackNation 2026/11_misja-aed_MC/pobrane/` pozostaje tylko do odczytu.

## Pliki wynikowe i schemat

`public/dane/` zawiera:

- `aed_mapa.json` — lekki indeks mapy: tablica `[lon, lat, status, aed_id, krótka_nazwa]`, nazwa do 28 znaków, współrzędne do 6 miejsc. Status deklaracji: 0 = brak godzin, 1 = dosłowne 24/7, 2 = inne podane godziny, 3 = private/no. To nie jest obliczony status „teraz”. **928 567 B przed gzip** na dostarczonym wsadzie; importer przerywa przed nadpisaniem eksportów przy rozmiarze ≥ 1 000 000 B.
- `szczegoly/00.json` … `99.json` — słowniki pełnych rekordów po `aed_id`; plik wyznaczają ostatnie dwie cyfry źródłowego ID, dopełnione zerem. Brak wiarygodnego przypisania do województw we wsadach: ten podział pozwala pobierać szczegóły bez dopisywania niepewnych granic administracyjnych. Przeglądarka pobiera najwyżej trzy pliki dla trzech wyników i pamięta je do zamknięcia strony.
- `aed.csv` — UTF-8, nagłówki, przecinek jako separator; brak wartości to pusta komórka, flagi rozdzielone średnikiem.
- `aed.geojson` — FeatureCollection, WGS84/RFC 7946, geometria Point `[lon, lat]`; brak poprawnych współrzędnych daje `geometry: null`. Bez pola `crs`.
- `jakosc.json` — liczby rekordów, rekordów z flagami i wystąpień flag, także per źródło; słownik flag.
- `zrodla.json` — źródła, licencje, atrybucje, daty pobrania oraz opis przekształceń.

Wspólny schemat: `aed_id, name, lat, lon, address, access, opening_hours, indoor, location_description, operator, source, source_record_id, source_url, license, retrieved_at, quality_flags`.

Brak tekstu to JSON `null`, brak deklaracji `access`/`indoor` to `unknown`. `quality_flags` jest tablicą w GeoJSON. **Nigdy nie uzupełniamy braku godzin wartością 24/7.** Nazwa, opis lokalizacji i operator pochodzą wyłącznie z pól źródłowych; dostawca danych nie staje się automatycznie operatorem AED. Surowe pliki pozostają w katalogu wejściowym.

`aed_id` ma postać `źródło:ID`, dla OSM zawiera typ obiektu, np. `osm:node/477958354`. Legionowo nie ma ID: numerujemy wiersze od 1; taki identyfikator jest stabilny tylko dla danego pliku i może się zmienić po zmianie kolejności. Miejskie `source_url` wskazuje zasób, OSM konkretny obiekt.

`retrieved_at` oznacza pobranie, nie kontrolę w terenie. Dla wsadów miejskich znamy z rozpoznania tylko dzień 2026-11-21; dla OSM czas z `osm_pobranie_log.json`: 2026-11-21T15:55:45Z. Świeże OSM dostaje rzeczywisty czas pobrania. `generated_at` raportu oznacza uruchomienie importera.

## Źródła i licencje

| Źródło / plik wejściowy | Rekordy we wsadzie | Licencja i atrybucja |
| --- | ---: | --- |
| [OpenStreetMap](https://www.openstreetmap.org/copyright), `osm_aed_pl.json` | 18 301 | **© współtwórcy OpenStreetMap, ODbL** ([ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)) |
| [Krosno, zasób 54632](https://api.dane.gov.pl/1.4/resources/54632), `dane_resource_54632.csv` | 21 | Urząd Miasta Krosna, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [Przemyśl, zasób 62093](https://api.dane.gov.pl/1.4/resources/62093), `dane_resource_62093.geojson` | 21 | Urząd Miejski w Przemyślu, CC0 1.0 |
| [Marki, zasób 68353](https://api.dane.gov.pl/1.4/resources/68353), `dane_resource_68353.csv` | 8 | Urząd Miasta Marki, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| [Legionowo, zasób 2625221](https://api.dane.gov.pl/1.4/resources/2625221), `dane_resource_2625221.csv` | 24 | Urząd Miasta Legionowo, CC0 1.0 |

Łącznie **18 375 obserwacji**, nie liczba unikalnych urządzeń. Licencje i daty wsadów przyjęto z dostarczonego `rozeznanie_danych.md`; danych nie pobieramy ponownie w zwykłym imporcie. Miejskie dane dotyczą odpowiednio 2024-02-19 (Krosno), 2024-11-06 (plik Przemyśla), 2025-07-10 (Marki) i 2026-09-14 (Legionowo).

**Cały eksport nie jest CC0 ani CC BY.** Zawiera dane OSM objęte ODbL; zachowanie licencji per rekord nie zwalnia z warunków ODbL przy rozpowszechnianiu bazy pochodnej. Zachowaj atrybucje i warunki źródeł. Przekształcenia obejmują normalizację schematu, rozpakowanie CSV Marek, naprawę osi i flagi jakości, bez scalania. Strona podaje także atrybucję podkładu OSM. Biblioteki: [Leaflet 1.9.4](https://leafletjs.com/download), [Leaflet.markercluster 1.5.3](https://github.com/Leaflet/Leaflet.markercluster/tree/v1.5.3) z unpkg i [QRCode.js 1.0.0](https://cdnjs.com/libraries/qrcodejs/1.0.0) z cdnjs. Wszystkie skrypty i arkusze bibliotek mają dokładne wersje, `crossorigin="anonymous"` i SRI SHA-384 policzone z pobranych plików. QR powstaje lokalnie; nie korzystamy z zewnętrznego generatora QR. Symbol AED w `public/aed.svg` jest własnym rysunkiem, inspirowanym oznakowaniem AED, bez deklaracji certyfikacji ISO.

## Kontrola jakości i ograniczenia

- `outside_poland`: poza przybliżoną obwiednią 49.0–54.84°N, 14.12–24.15°E. To prosta kontrola zakresu, **nie dokładna granica Polski**: nie wykryje wszystkich punktów u sąsiadów ani anomalii wewnątrz kraju.
- `coordinates_swapped`: zamieniamy osie tylko wtedy, gdy pierwotna para jest poza obwiednią, a odwrócona do niej trafia. W Markach naprawiamy 7 wpisów. Oryginał zostaje w pliku wejściowym.
- `same_coordinates_different_addresses`: dokładnie te same współrzędne przy różnych niepustych adresach; bez przybliżania lub geokodowania. Porównanie adresów pomija wielkość liter i skrajne spacje.
- `missing_opening_hours`: brak deklaracji godzin. W wynikach parsujemy wyłącznie prosty podzbiór składni OSM `opening_hours` (opis poniżej). Zielony oznacza wyłącznie dosłowne `24/7`; żółty dowolny inny podany zapis godzin, szary brak godzin, czerwony ma pierwszeństwo dla `access=private/no`.
- `restricted_access`: deklaracja `private` lub `no`. Inne ograniczenia (np. klienci) pozostają w polu `access` i karcie punktu.
- `duplicate_candidate`: odległość po powierzchni kuli **poniżej 30 m**, różne źródła. Flaga na obu rekordach, bez scalania i bez deduplikacji wewnątrz jednego źródła. Statystyka liczy rekordy, nie pary; kandydat nie oznacza potwierdzonego duplikatu.
- `missing_coordinates`: nieliczbowe, brakujące lub wykraczające poza WGS84 współrzędne. Rekord zostaje w obu eksportach, geometria GeoJSON jest `null`.
- `outside_declared_city`: dodatkowa kontrola znanego błędu Marek — ponad 50 km od ich centrum. Wpis nr 7 ma współrzędne z Krosna i pozostaje bez automatycznego przeniesienia. Nie weryfikujemy granic wszystkich gmin.

Mapa pomija geometrie z `missing_coordinates`, `outside_poland` i `outside_declared_city`; eksport zawiera wszystkie rekordy. Najbliższe 3 wpisy wyszukujemy lokalnie, pomijając dodatkowo `private/no`. Odległość w linii prostej nie uwzględnia wejść, tras, przeszkód, godzin ani faktycznego dostępu. Nie scalamy wyników z różnych źródeł. To narzędzie do przeglądania danych, nie system dyspozytorski.

Nie ma backendu, logowania ani analityki. Współrzędne użytkownika są używane wyłącznie w pamięci przeglądarki do obliczeń. Zewnętrzne CDN i serwer kafelków widzą zwykłe żądania sieciowe; kafelki ujawniają oglądany obszar mapy. Po wyborze lokalizacji mapa pokazuje punkt startowy i najbliższe wpisy. Wyszukiwarka Nominatim otrzymuje wpisany adres, a kliknięta nawigacja Google Maps lub OSM — punkt startowy i cel. Nie wpisuj prywatnych informacji w polu wyszukiwania.


## Trzy zakładki

- `#znajdz` — mapa z lekkiego indeksu, „Najbliższy AED” po zgodzie na geolokalizację, adres wyszukiwany dopiero po zatwierdzeniu. Wynik: trzy najbliższe wpisy bez `access=private/no`, opis lokalizacji, godziny, status teraz oraz linki „Prowadź pieszo” do Google Maps (`travelmode=walking`) i OSM (`engine=fossgis_osrm_foot`).
- `#dla-firm` — generator karty A4 w języku PL. Wyszukaj adres lub kliknij punkt na mapie, wpisz nazwę miejsca i **sprawdź pełny adres dla dyspozytora**. Kliknięcie punktu nie robi odwrotnego geokodowania: adres wpisujesz ręcznie. Po zmianie punktu lub formularza poprzednia karta traci ważność; wygeneruj ją ponownie.
- `#dane` — eksporty CSV/GeoJSON, data aktualizacji, flagi jakości na źródło, licencje i schemat wszystkich pól. Linki pobierania działają także bez bibliotek mapy.

Link `#znajdz?lat=50.037334&lon=22.004001` uruchamia wyszukiwanie z przekazanego punktu bez pytania o geolokalizację. QR karty prowadzi zawsze na **https://otwarteaed.pl/#znajdz?lat=..&lon=..**. Przed publikacją domeny ten link nie musi działać; lokalnie testuj ten sam hash na localhost. Nie publikowano witryny w ramach tej pracy.

### Godziny i dojście

`public/aed.js` ma jeden parser używany przez stronę i testy w Node. Obsługuje dokładne `24/7`, jeden dzień (`Fr 22:00-02:00`) lub jeden zakres dni (`Mo-Fr 08:00-16:00`, `Mo-Su 08:00-16:00`), także przez północ i koniec tygodnia. Koniec przedziału jest wyłączny. Strefa: **Europe/Warsaw**, z czasem letnim. Status w wynikach odświeża się co minutę. Brak godzin, błędny zapis, kilka zakresów, wyjątki świąteczne, komentarze i pozostała składnia dają **„godziny nieznane”**, nigdy „dostępny”. Proste zakresy nie uwzględniają świąt ani zamknięć niewpisanych w źródle. Kolory całej mapy nadal opisują deklaracje źródła, a nie aktualną dostępność.

Karta drukuje godziny zamiast nietrwałego statusu „teraz”. Nieznany format zachowuje jako zapis źródła i ostrzega „godziny nieznane — sprawdź na miejscu”. Inne ograniczenia dostępu (np. `customers`) są pokazywane wprost. Same godziny nie potwierdzają dostępu ani sprawności AED.

Odległość liczymy po powierzchni kuli w linii prostej. **Orientacyjny czas** = odległość × 1,3 / 5 km/h, zaokrąglony w górę do minut (minimum 1). Nie wyznaczamy lokalnie trasy i nie uwzględniamy przejść, pięter, ogrodzeń ani wejść. Linki nawigacyjne przekazują punkty zewnętrznemu dostawcy.

### Druk i PDF

Wygenerowana karta zawiera własny symbol AED, nazwę i duży adres miejsca, 1–3 AED z godzinami i opisami, mapkę z numerami zgodnymi z listą, QR, numery 112/999/998/997, instrukcję pierwszej pomocy oraz atrybucje. Daty pobrania nie są kontrolą w terenie. Jeśli AED nie ma nazwy lub opisu, karta jawnie pokazuje brak danych. Długie opisy zachowujemy, więc skrajnie rozbudowany wpis może wymagać wybrania 1–2 AED, aby zmieścić wydruk na jednej stronie.

Przycisk „Drukuj / Zapisz jako PDF” czeka na kafelki i wywołuje `window.print()`. CSS `@media print` ukrywa formularze i drukuje samą kartę. Wybierz **A4, pionowo, skalę 100%, bez nagłówków i stopek przeglądarki**. PDF zapisuje przeglądarka, bez biblioteki PDF. Kafelki i atrybucja OSM pozostają na wydruku; awaria pobierania mapy blokuje przycisk. Przy użyciu Ctrl+P trzeba samodzielnie sprawdzić pełne załadowanie mapy. Dla przykładu Rynek 1, Rzeszów: `public/przyklad_karty.png`.

Pole e-mail jest **wyłączone**, opisane „wkrótce”, bez formularza wysyłki i bez zapisu danych. Opcjonalne tłumaczenia EN/UA nie zostały dodane.

### Weryfikacja medyczna — warunek przed publikacją

**Treść pierwszej pomocy jest WYMAGAJĄCA WERYFIKACJI przez ratownika/lekarza przed publikacją.** Widoczny znacznik wersji roboczej pozostaje także na karcie. To własny skrót BLS dla dorosłych, nie oficjalny materiał ERC i nie zamiennik szkolenia. Weryfikacji wymagają również polskie sformułowania, scenariusz prawidłowego oddechu i numery alarmowe w kontekście instrukcji.

Źródła do przeglądu: [ERC Guidelines 2025](https://www.erc.edu/science-research/guidelines/guidelines-2025/), [ERC 2025 Adult BLS, DOI](https://doi.org/10.1016/j.resuscitation.2025.110771) oraz [wytyczne BLS 2025 RCUK](https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/adult-basic-life-support-guidelines). ERC 2025 podkreśla wezwanie pomocy już po braku reakcji, przed oceną oddechu. Dlatego krok 2 rozpoczyna telefon na 112, krok 3 ocenę oddechu (do 10 s), a krok 4 rozmowę na głośniku i wysłanie innej osoby po AED. Pozostałe parametry: 30:2, środek klatki, 5–6 cm, 100–120/min; bez oddechów, jeśli ratownik nie potrafi ich wykonać; AED zgodnie z poleceniami. Nie kopiujemy grafik ani tekstu ERC.

## Opcjonalny eksport OSM przez OpenAEDMap

```sh
python3 importuj.py --zrodlo-openaedmap
```

Pobiera `https://openaedmap.org/api/v1/countries/PL.geojson` zamiast Overpass i normalizuje publiczne dane GeoJSON (`@osm_type`, `@osm_id`, tagi) do istniejącego importera. Tak jak Overpass: identyfikujący User-Agent, timeout 240 s, maksymalnie 3 próby, odstępy 2 i 4 s. Brakujące ID, geometria lub pusty wynik przerywają import. Cache: wyłącznie lokalne `.cache/openaedmap_pl.json`. Nie łączymy dwóch źródeł OSM; miejskie źródła pozostają dołączone. Flagi `--odswiez` i `--zrodlo-openaedmap` wzajemnie się wykluczają. Zwykły import nadal bierze oryginalny wsad, nie cache.

Eksport jest dziennym zrzutem OSM, licencja **ODbL**, atrybucja **„© współtwórcy OpenStreetMap, przez OpenAEDMap”**, zapisana w `zrodla.json` i na karcie. Czas pobrania nie oznacza czasu eksportu ani kontroli urządzeń. Nie skopiowano kodu backendu OpenAEDMap (AGPL).

## Duży ruch i usługi zewnętrzne

Strona pobiera indeks < 1 MB zamiast pełnego GeoJSON (~10 MB), grupuje markery i pobiera szczegóły wyłącznie na żądanie. CSV i GeoJSON są przeznaczone do świadomego pobierania. Hosting może włączyć gzip/Brotli i cache HTTP; w tej pracy nie zmieniano konfiguracji hostingu. Przy aktualizacji trzeba wdrożyć **cały katalog danych razem**, aby indeks i szczegóły były spójne.

**Publiczny Nominatim nie jest usługą do dużego ruchu.** [Zasady Nominatim](https://operations.osmfoundation.org/policies/nominatim/) wymagają łącznie maksymalnie **1 żądania/s dla całej aplikacji**, rozpoznawalnego Referer/User-Agent, atrybucji, pamiętania wyników i zakazują autocomplete. Użytkownik świadomie wybrał Nominatim do tej strony. Implementacja wysyła jedno zapytanie na zatwierdzenie, bez retry, z blokadą 1,1 s w danej karcie i pamięcią wyników w RAM. **Statyczny klient nie może zagwarantować globalnego limitu dla wszystkich odwiedzających.** Przed kampanią lub dużym ruchem zmień usługę na dostawcę z odpowiednią pojemnością albo wyłącz wyszukiwanie (`{"endpoint":null}` w `public/geokodowanie.json`). Endpoint można zmienić w tym pliku bez zmiany JS, przy zgodnym API. Klikanie punktu na mapie i obliczenia najbliższych nie wymagają geokodera.

Podobnie publiczne kafelki OSM nie gwarantują pojemności: [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/). Przeglądarka zachowuje zwykły cache HTTP, nie robimy masowego pobierania ani trybu offline. Przy dużym ruchu należy dobrać dostawcę podkładu. Atrybucja musi pozostać widoczna, również na druku. Lokalny http.server jest wyłącznie do testów.

## Sprawdzanie w przeglądarce

Po uruchomieniu lokalnego serwera można wykonać `node test_przegladarki.mjs`. Test używa wyłącznie API Node i protokołu Chrome DevTools, izolowanego profilu w `.cache/chrome-test`, bez npm. Domyślnie szuka Chrome na macOS; inną zgodną przeglądarkę wskaż przez `CHROME_PATH`. Sprawdza zakładki, hash z punktem, 3 wyniki, linki piesze, generator dla publicznego adresu Rynek 1 w Rzeszowie, kafelki w print media, A4 i brak przepełnienia przy 390 px. Zapisuje `public/przyklad_karty.png`, roboczy PDF i zrzuty telefonu w `.cache/`. Zewnętrzne CDN i kafelki wymagają sieci; test zgłasza ich awarie. Nie wyszukuje automatycznie adresów w Nominatim.
