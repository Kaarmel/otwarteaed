# Jak dodać nowe źródło danych do harvestera

Każde źródło to jeden plik JSON w katalogu `zrodla/`. Kodu nie trzeba zmieniać. Najprościej:

1. Wgraj plik źródła do kreatora na https://otwarteaed.pl.
2. Popraw dopasowanie kolumn.
3. Pobierz „profil źródła” i zapisz go jako `zrodla/<id>.json`.

## Przykład: plik w BIP z datą w nazwie

```json
{
  "id": "gmina_przyklad",
  "nazwa": "Urząd Gminy Przykład",
  "rodzaj": "zrodlo",
  "potwierdzenie": "dysponent",
  "licencja": "CC-BY-4.0",
  "licencja_url": "https://creativecommons.org/licenses/by/4.0/",
  "atrybucja": "Urząd Gminy Przykład",
  "url_zrodla": "https://bip.gmina-przyklad.pl/defibrylatory",
  "pobierz": { "url": "https://bip.gmina-przyklad.pl/pliki/aed_{RRRR-MM-DD}.csv", "dni_wstecz": 31 },
  "kolumny": {
    "nazwa_obiektu": ["Obiekt"],
    "szerokosc": ["Szer."],
    "dlugosc": ["Dł."]
  }
}
```

## Sposoby pobierania (`pobierz`)

| Klucz | Znaczenie |
|---|---|
| `url` | Adres pliku. Może zawierać datę w nazwie (znaczniki opisane niżej). Hub szuka najnowszego istniejącego pliku od dziś wstecz, przez `dni_wstecz` dni (domyślnie 31). |
| `dane_gov_pl` | `{ "zbior": 3624, "format": "csv" }`. Hub pobiera najnowszy zasób zbioru przez API dane.gov.pl 1.4. |
| `plik` | Plik lokalny. Używany w trybie `--offline` i jako zapas, gdy pobranie się nie uda. |

Znaczniki daty w `url`:

| Znacznik | Przykład |
|---|---|
| `{RRRR-MM-DD}` | 2026-11-21 |
| `{RRRRMMDD}` | 20261121 |
| `{RRRR}` | 2026 |
| `{MM}` | 11 |
| `{DD}` | 21 |

Plik publikowany co miesiąc, np. `aed_{RRRR}-{MM}.csv`, daje jeden adres na miesiąc. Hub sprawdza wtedy tylko bieżący i poprzedni miesiąc.

## Czego nie trzeba ustawiać

Hub rozpoznaje sam:

- kodowanie (UTF-8 albo Windows-1250);
- separator (`,` `;` tabulator `|`);
- przecinek albo kropkę dziesiętną we współrzędnych;
- stopnie i minuty;
- układ PL-1992;
- zamienione osie;
- CSV zapisany w jednej kolumnie;
- formaty XLSX, GeoJSON, KML i eksport OSM.

## Pola profilu

- `kolumny` przypisuje każdemu polu wzorca (`hub/schemat.json`) listę możliwych nagłówków z pliku źródła.
- `mapowanie_stale` ustawia wartość stałą, np. `{"operator": "Gmina Przykład"}`.
- `obszar` to prostokąt `[minSzer, minDł, maxSzer, maxDł]` wokół gminy. Pomaga odróżnić gminy o identycznych nagłówkach.
