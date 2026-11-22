# Teksty do formularza HackTribe (zgłoszenie finalne)

Liczby: stan na 21.11.2026, wieczór. Od tej pory hub odświeża dane co 2 godziny, więc liczby na stronie mogą się nieco różnić.

## Project Name

otwarte AED — Każda minuta ma adres.

## Problem

W Polsce nie ma jednej, potwierdzonej listy defibrylatorów AED, a dane o nich są rozproszone:

- OpenStreetMap ma ok. 18,3 tys. punktów AED, ale 99,4% z nich nie ma adresu, a 63% nie ma godzin dostępności.
- Na dane.gov.pl dane o AED publikuje kilku dysponentów (Krosno, Przemyśl, Marki, Legionowo, Warszawa, ZTM Gdańsk). Każdy robi to w innym formacie: CSV z nagłówkami ze spacjami, GeoJSON, cały wiersz CSV zapisany w jednej kolumnie, kody TERC, API z tokenem albo baza pojazdów.
- W pliku Marek 7 z 8 par współrzędnych ma zamienione osie, a jeden punkt leży w Krośnie.

Nie ma też państwowej ewidencji AED ani wzorca, według którego gmina czy straż mogłaby opublikować dane. Dlatego danych nie da się po prostu połączyć, a dysponenci nie wiedzą, jak je udostępnić.

## Solution

otwarte AED to hub danych (harvester) i kampania, które razem zbierają dane o AED w portalu dane.gov.pl.

1. **Harvester** pobiera dane z wielu źródeł:
   - OpenStreetMap;
   - zbiory gmin i ZTM Gdańsk z dane.gov.pl;
   - pliki z datą w nazwie;
   - API.
   
   Rozpoznaje układ pliku, ujednolica współrzędne (przecinek, stopnie, PL-1992, zamienione osie) i dodaje adres oraz TERYT z rejestru PRG. Scala duplikaty bez utraty danych, a każdemu rekordowi daje ocenę jakości. Publikuje jeden zbiór w CSV UTF-8, XLSX i GeoJSON oraz plik XML z MD5. XML jest zgodny z oficjalnym schematem dane.gov.pl, więc portal może pobierać dane automatycznie. Dane odświeżają się co 2 godziny.
2. **Wzorcowy zakres danych:** 39 pól, słowniki wartości i dwa proste szablony dla gmin („mam współrzędne” i „mam tylko adresy”), w XLSX.
3. **Kreator na otwarteaed.pl:** gmina, PSP/OSP albo szkoła wgrywa swój plik i widzi błędy oraz adresy z PRG. Potem pobiera gotowe CSV, XML i MD5 do publikacji. Plik nie opuszcza komputera.
4. **Kampania „otwarte AED”** z hasłem „Każda minuta ma adres.” jest skierowana do dysponentów („Pokaż swój AED. Opublikuj potwierdzone dane na dane.gov.pl.”). Obejmuje:
   - logo i księgę znaku;
   - odznakę do BIP;
   - posty, list do gmin i naklejki;
   - plan na 12 miesięcy z miernikami, które hub liczy automatycznie;
   - propozycję, by PSP zbierała dane od OSP.

Dodatkowo mapa gdzieaed.pl pokazuje mieszkańcom i firmom najbliższy AED na tych samych danych.

## What's done so far and goal of your project

Zrobione podczas HackNation 2026:

- **Hub:**
  - 19 361 obserwacji z 7 źródeł → 19 071 AED, w tym 18 793 na mapie i 278 w pojazdach;
  - 98% AED na mapie ma adres z PRG;
  - 1059 AED potwierdzonych przez dysponenta.
- **XML dla dane.gov.pl:** przechodzi walidację oficjalnym XSD 1.13 portalu.
- **Kreator dla gmin** z przykładem na prawdziwym pliku Marek.
- **Wzorcowy zakres danych** w XLSX.
- **Strony:** otwarteaed.pl i gdzieaed.pl, dostępność w Lighthouse 100/100.
- **Kampania:** logo (komplet plików SVG, PNG, PDF i EPS w RGB i CMYK), księga znaku, materiały dla dysponentów, białe plamy z pismami do gmin, naklejki.
- **Jakość kodu:** 82 testy automatycznych; aktualizacja co 2 godziny przez GitHub Actions, z walidacją i autonaprawą przed każdą publikacją.


Cel: przekazać ministerstwu gotowy mechanizm, który zbiera dane o AED w jednym zbiorze na dane.gov.pl, i kampanię, która przekona dysponentów do publikowania potwierdzonych danych.

**Idea stage:** „Work in progress”, jak w drafcie.

## Cover image

`docs/zgloszenie/okladka_800x600.jpg` (4:3, zalecane 800×600).

## Your video presentation

https://youtu.be/6z07MNqQFEI

## Website

https://otwarteaed.pl

## [Obowiązkowe] Link do repozytorium z kodem

https://github.com/Kaarmel/otwarteaed

Uwaga: jury musi mieć dostęp do repozytorium. Przed oceną trzeba je upublicznić albo dodać jurorów.

## [Opcjonalne] Instrukcje jak otworzyć projekt

1. Otwórz https://otwarteaed.pl i kliknij „Wypróbuj na prawdziwym pliku Marek z dane.gov.pl”. Kreator rozpozna plik gminy, naprawi zamienione osie, doda adresy i TERYT z PRG i przygotuje CSV, XML i MD5.
2. Wszystkie materiały zgłoszenia są na https://otwarteaed.pl/materialy/: prezentacja, wzorcowy zakres danych XLSX, logo SVG/PNG/JPG/PDF i komplet plików ZIP (RGB i CMYK), księga znaku, kampania i oświadczenie o AI.
3. Plik dla dane.gov.pl: https://otwarteaed.pl/dane/dane_gov_pl.xml (+ .md5). Walidacja:
   `xmllint --noout --schema otwarte_dane_latest.xsd dane_gov_pl.xml`.
4. Kod lokalnie (Node 22, bez instalowania pakietów): `npm test`, potem `node hub/zbierz.mjs --offline --bez-zapytan`, potem `npm run strony`.
5. Mapa dla mieszkańców: https://gdzieaed.pl.

## [Opcjonalne] Prezentacja

`docs/prezentacja.pdf` (4,9 MB, limit 10 MB).

## [Opcjonalne] Dodatkowe pole na materiały

https://otwarteaed.pl/materialy/
