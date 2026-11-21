# Dane dla systemów: służby ratownicze, aplikacje, GIS

Wszystkie pliki są statyczne, mają stałe adresy i nagłówek `Access-Control-Allow-Origin: *`, więc system może je pobierać bezpośrednio, bez klucza API.

| Adres | Zawartość | Użycie |
|---|---|---|
| `https://otwarteaed.pl/dane/aed.geojson` | wszystkie AED, WGS84, `[długość, szerokość]`, wszystkie pola wzorca | systemy mapowe i GIS, np. warstwa w systemie dyspozytorskim |
| `https://otwarteaed.pl/dane/aed.csv` | to samo w CSV UTF-8 (format główny) | import do baz danych i arkuszy |
| `https://otwarteaed.pl/dane/aed_mapa.json` | lekki indeks: `[lon, lat, kod_statusu, aed_id, nazwa]` | aplikacje mobilne: wyszukiwanie najbliższego AED na urządzeniu |
| `https://otwarteaed.pl/dane/aed_dysponenci.csv` | tylko AED potwierdzone przez dysponentów (bez OSM), CC BY 4.0 | systemy, które przyjmują wyłącznie dane urzędowe |
| `https://otwarteaed.pl/dane/jakosc.json`, `zrodla.json` | raport jakości, źródła, licencje, sumy SHA-256 wejść | monitorowanie |
| `https://otwarteaed.pl/hub/schemat.json` | opis pól i słowników wzorcowego zakresu | walidacja po stronie odbiorcy |
| `https://otwarteaed.pl/dane/SHA256SUMS` | sumy kontrolne plików | sprawdzenie integralności |

## Przydatne pola

| Pole | Do czego służy |
|---|---|
| `teryt_gmina` | filtr obszaru, np. rejon operacyjny |
| `status_dostepnosci` | `24/7`, `godziny`, `ograniczony` albo `brak_danych` |
| `potwierdzenie` | `dysponent` albo `spolecznosc` |
| `mobilny` | `tak` dla AED w pojazdach, które nie mają stałej pozycji |
| `ocena_jakosci`, `flagi_jakosci` | ocena rekordu 0–100 i powody obniżenia |

**Wyszukiwanie najbliższego AED** liczy się po stronie odbiorcy: odległość haversine na `aed_mapa.json`, ok. 18 tys. punktów. Tak działa gdzieaed.pl.

**Integracja z systemami ratowniczymi** (np. SWD PRM) wymaga uzgodnienia z ich operatorem. Hub dostarcza dane w otwartym, stabilnym formacie z kodami TERYT. Nie łączy się z tymi systemami bezpośrednio.
