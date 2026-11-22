# otwarte AED — Każda minuta ma adres.

**Misja AED — Dane na ratunek · HackNation 2026 · Ministerstwo Cyfryzacji**

Hub danych o defibrylatorach AED dla portalu dane.gov.pl. Zbiera dane z wielu rozproszonych źródeł, sprowadza je do jednego wzorcowego zakresu, uzupełnia adresy z rejestru PRG, scala duplikaty i publikuje zbiór w formatach dane.gov.pl, razem z plikiem XML do automatycznego importu. Kreator pozwala gminie lub innemu dysponentowi opublikować własne dane w kilku krokach. Kampania „otwarte AED” zachęca dysponentów do udostępniania potwierdzonych danych.

- **Prototyp:** https://otwarteaed.pl (hub danych, kreator, kampania) · https://gdzieaed.pl (mapa dla mieszkańców)
- **Wszystkie materiały zgłoszenia:** https://otwarteaed.pl/materialy/

## Wymagania zadania i gdzie są spełnione

| Wymaganie (treść zadania) | Gdzie |
|---|---|
| Szczegółowy opis i tytuł projektu | [docs/opis_projektu.md](docs/opis_projektu.md) |
| Prezentacja: zrzuty ekranu jako dowody wymagań technicznych, kroki użytkownika, ograniczenia | [docs/prezentacja.pdf](docs/prezentacja.pdf): wymagania na slajdzie 2, dowody na slajdach 5–11, kroki użytkownika na 16, ograniczenia na 18 |
| Prototyp rozwiązania | https://otwarteaed.pl, https://gdzieaed.pl; kod w tym repozytorium |
| Wzorcowy zakres danych (XLSX) | [otwarteaed/dane/wzorcowy_zakres_danych.xlsx](otwarteaed/dane/wzorcowy_zakres_danych.xlsx); szablony w [otwarteaed/dane/szablony/](otwarteaed/dane/szablony/) |
| Kod źródłowy | to repozytorium (`hub/`, `otwarteaed/`, `public/`, `test/`) |
| Logotyp JPG, PNG, PDF i format otwarty (SVG) | [kampania/logo/](kampania/logo/) |
| Księga znaku (PDF) | [kampania/ksiega_znaku.pdf](kampania/ksiega_znaku.pdf) |
| Dane w formatach odczytywalnych maszynowo | CSV UTF-8, XLSX, GeoJSON, XML, JSON w [otwarteaed/dane/](otwarteaed/dane/) |
| Zgodność z zasadami działania dane.gov.pl | [otwarteaed/dane/dane_gov_pl.xml](otwarteaed/dane/dane_gov_pl.xml) i plik `.md5`; XML jest walidowany oficjalnym XSD 1.13 w testach |
| WCAG, responsywność, UX | Lighthouse (dostępność) 100/100 na obu stronach; zrzuty 390 px na slajdzie 11 |
| Zakres wykorzystania AI (regulamin zadania, §2 pkt 8) | [docs/oswiadczenie_ai.md](docs/oswiadczenie_ai.md), slajd 19 |
| Nazwa akcji, hasło, logotyp; zachęta dla dysponentów | „otwarte AED”, „Każda minuta ma adres.”; [kampania/dla_dysponentow/](kampania/dla_dysponentow/): odznaka, posty, list, plan kampanii z miernikami; [kampania/naklejki.pdf](kampania/naklejki.pdf) |
| Ograniczenia | [docs/ograniczenia.md](docs/ograniczenia.md) |

## Jak sprawdzić w 2 minuty

Film demonstracyjny (2 min): https://youtu.be/6z07MNqQFEI

1. Otwórz https://otwarteaed.pl i kliknij **„Wypróbuj na prawdziwym pliku Marek z dane.gov.pl”**. Kreator rozpozna plik gminy, naprawi zamienione osie, doda adresy i TERYT z PRG i przygotuje CSV, XML i MD5.
2. Pobierz https://otwarteaed.pl/dane/dane_gov_pl.xml i sprawdź go oficjalnym schematem portalu:
   ```sh
   curl -sO https://otwarteaed.pl/dane/dane_gov_pl.xml
   curl -sO https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd
   xmllint --noout --schema otwarte_dane_latest.xsd dane_gov_pl.xml
   ```
3. Otwórz https://otwarteaed.pl/dane/wzorcowy_zakres_danych.xlsx w Excelu.

## Uruchomienie lokalne

Wymagania: Node.js 22 lub nowszy, `xmllint` (dla testu XSD). Bez instalowania pakietów npm.

```sh
npm test                                   # 82 testy, także na prawdziwych plikach z dane.gov.pl
node hub/zbierz.mjs --offline --bez-zapytan # przebieg na zamrożonych danych z wejscie/ → otwarteaed/dane/
node hub/zbierz.mjs                        # najnowsze zasoby z dane.gov.pl i nowe adresy z PRG
npm run strony                             # buduje dist/otwarteaed i dist/gdzieaed
python3 -m http.server 8000 -d dist/otwarteaed   # http://localhost:8000
```

Jak dodać nowe źródło danych (także plik z datą w nazwie): [docs/jak_dodac_zrodlo.md](docs/jak_dodac_zrodlo.md).

## Struktura

| Katalog | Zawartość |
|---|---|
| `hub/` | rdzeń harvestera (moduły ES, działają w Node i w przeglądarce): odczyt plików, rozpoznawanie układu, normalizacja, adresy PRG, scalanie, jakość, eksport, własny zapis XLSX i MD5 |
| `zrodla/`, `szablony/` | profile źródeł danych i dwa szablony dla gmin |
| `wejscie/`, `baza/` | zamrożone pliki wejściowe i baza adresów PRG |
| `otwarteaed/` | strona otwarteaed.pl: dane, kreator, kampania; `otwarteaed/dane/` to wynik harvestera |
| `public/` | strona gdzieaed.pl (mapa) |
| `kampania/` | logo, księga znaku, naklejki, materiały dla dysponentów |
| `docs/` | opis, prezentacja, ograniczenia, oświadczenie o AI, propozycja PSP/OSP |

## Licencje danych

Zbiór zintegrowany zawiera dane © współtwórców OpenStreetMap (ODbL 1.0) oraz dane dysponentów: Krosno, Przemyśl, Legionowo (CC0 1.0), Marki, ZTM w Gdańsku (CC BY 4.0), m.st. Warszawa — Stołeczne Centrum Bezpieczeństwa (CC BY). Adresy: PRG, GUGiK. Krój pisma: Atkinson Hyperlegible (SIL OFL).

W nagłym wypadku dzwoń 112. To nie jest urzędowa ewidencja AED.
