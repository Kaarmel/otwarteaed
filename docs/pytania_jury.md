# 20 najtrudniejszych pytań jury i odpowiedzi

Ściąga do finału (5 minut pitchu i pytania). Każda odpowiedź zgadza się z kodem i danymi na 21.11.2026.

## Dane i dane.gov.pl

**1. Czym to się różni od zwykłej mapy z OpenStreetMap albo OpenAEDMap?**
Mapa tylko pokazuje punkty. My robimy trzy rzeczy, których mapa nie robi:
- wzorcowy zakres danych dla dysponentów;
- kreator, w którym gmina publikuje swoje dane na dane.gov.pl;
- harvester, który łączy dane urzędowe z OSM w jeden zbiór w formacie portalu.

OSM to tylko jedno z 7 źródeł. Rekordy od dysponentów mają pierwszeństwo przy scalaniu.

**2. Jak dokładnie dane trafiają na dane.gov.pl?**
Tym samym mechanizmem automatycznego importu, którego od 2025 r. używają deweloperzy:
- publikujemy plik XML zgodny z oficjalnym schematem portalu (XSD 1.13) i obok plik .md5;
- ministerstwo raz wpisuje adres tego XML;
- portal sprawdza sumę MD5 i przy zmianie pobiera nowe zasoby;
- każdy dzień to nowy zasób CSV z datą w nazwie i własnym identyfikatorem (extIdent), więc historia zostaje.

**3. Skąd pewność, że XML przejdzie import?**
Każdy przebieg testów waliduje go programem xmllint oficjalnym schematem pobranym z dane.gov.pl. Plik na żywo pod otwarteaed.pl/dane/dane_gov_pl.xml też przechodzi walidację, a prezentacja ma zrzut wyniku. Tak samo walidujemy XML, który kreator generuje dla gminy.

**4. OpenStreetMap ma licencję ODbL, której nie ma w słowniku licencji portalu. Jak to pogodzić?**
- Publikujemy dwa zbiory.
- „AED od dysponentów” jest bez OSM, na CC BY 4.0. Ten rekomendujemy jako główny.
- Zbiór zintegrowany z OSM ma warunki ODbL opisane w polu dbOrCopyrighted, bo słownik licencji XSD ich nie przewiduje.
- Każdy rekord ma pole z licencją swojego źródła.
- O tym, czy portal przyjmie zbiór z OSM, decyduje ministerstwo. Zbiór urzędowy działa niezależnie od tej decyzji.

**5. Jak często dane są aktualne?**
- **Hub:** co 2 godziny automat (GitHub Actions) pobiera świeży OSM, najnowsze zasoby gmin z dane.gov.pl, dane z API Warszawy i adresy PRG dla nowych punktów, a potem wdraża strony.
- **Portal:** dostaje nowy zasób raz dziennie (updateFrequency = daily).
- **Awarie:** gdy jakieś źródło nie odpowiada (np. przeciążony serwer OSM), hub używa ostatniej sprawdzonej kopii, zamiast publikować dziurę.

**6. Co jeśli gmina opublikuje na dane.gov.pl zły plik, np. wykaz aptek zamiast defibrylatorów?**
To się zdarzyło naprawdę: zbiór Legionowa „Zdrowie” ma też wykaz aptek, a pierwszy automatyczny przebieg wziął nowszy plik. Hub ma teraz dwa zabezpieczenia:
- bierze tylko zasoby z „defibrylator” albo „AED” w tytule;
- sprawdza, czy pobrany plik pasuje do profilu źródła. Jeśli nie pasuje, zostaje ostatni dobry plik.

**7. Jak scalacie duplikaty i co, jeśli scalicie dwa różne AED?**
- **Kiedy scalamy:** tylko obserwacje z różnych źródeł położone bliżej niż 30 m. Liczy się odległość, ten sam punkt adresowy PRG i podobieństwo nazw. Do ok. 17 m wystarczy sama bliskość, dalej potrzebny jest wspólny adres albo nazwa.
- **Kiedy nie scalamy:** dwóch rekordów z tego samego źródła nigdy, bo mogą to być dwa urządzenia w jednym budynku.
- **Strefa niepewna:** dostaje flagę „możliwy duplikat” zamiast scalenia.
- **Nic nie ginie:** każda obserwacja zostaje w aed_obserwacje.csv. Błędne scalenie widać i da się je odwrócić.

**8. Która wartość wygrywa przy scaleniu?**
Dysponent (gmina, instytucja) wygrywa ze społecznością (OSM). Odrzucona wartość trafia do pola „konflikty” z informacją, skąd pochodzi, np. „godziny: 24/7 (osm:node/…)”. Juror może sprawdzić każdą wartość.

**9. Skąd adresy i dlaczego im ufać?**
- **Źródło:** państwowy rejestr PRG (GUGiK, usługa UUG). Dostajemy najbliższy punkt adresowy z ulicą, numerem, gminą, powiatem i kodami TERYT, SIMC, ULIC.
- **Zasięg:** do 50 m. Do 200 m adres dostaje flagę „adres przybliżony”.
- **Adres źródła:** nigdy go nie nadpisujemy, a z PRG zawsze bierzemy jednostki administracyjne.
- **Wynik:** 98% AED na mapie ma adres.

**10. „Brak danych o dostępności = przyjęto, że dostępny”. Czy to nie jest niebezpieczne?**
To ustalenie z mentorami ministerstwa. Tłumaczymy je tak:
- nie wpisujemy „24/7”, tylko osobny status „brak_danych”;
- pole godzin zostaje puste, a na mapie widać napis „brak danych — przyjęto: dostępny”;
- ukrycie 9 tys. takich AED zabrałoby ludziom połowę mapy;
- prywatne urządzenia mają osobny kolor;
- kampania i kreator zachęcają dysponentów, żeby dopisali godziny.

## Wzorcowy zakres i kreator

**11. Dlaczego 39 pól? Czy to nie za dużo dla małej gminy?**
- Gmina wypełnia tylko 3 pola z jednego z dwóch szablonów:
  - „Mam współrzędne”: nazwa obiektu, szerokość, długość;
  - „Mam tylko adresy”: nazwa obiektu, miejscowość, numer.
- Resztę uzupełnia hub (adres, TERYT, status) albo jest opcjonalna, np. termin elektrod czy data weryfikacji.
- 39 pól to pełny model dla analityków i służb.

**12. Co jeśli gmina ma swój Excel w innym układzie, a nie nasz szablon?**
Kreator rozpoznaje układ sam:
- kodowanie i separator;
- XLSX, GeoJSON, KML;
- przecinek albo kropkę we współrzędnych, układ PL-1992, zamienione osie;
- nawet CSV zapisany w jednej kolumnie.

Proponuje dopasowanie kolumn, które urzędnik tylko poprawia. Przykład na prawdziwym, wadliwym pliku Marek działa jednym kliknięciem.

**13. Co dzieje się z plikiem gminy w kreatorze? RODO, bezpieczeństwo?**
Plik zostaje w przeglądarce urzędnika, bo kreator działa na tym samym kodzie co hub, bez naszego serwera. Na zewnątrz idą tylko współrzędne punktów do publicznej usługi adresowej GUGiK. Dane o AED to dane o urządzeniach i obiektach, nie o osobach.

**14. A jeśli w danych są dane osobowe, np. imię i nazwisko jako operator w OSM?**
To realne ryzyko w danych społecznościowych: pole „operator” w OSM bywa wypełnione nazwą osoby fizycznej prowadzącej działalność. W zbiorze dla portalu można wyłączyć pola „operator” i „telefon” dla rekordów z OSM i zostawić je tylko dla danych od dysponentów. To zmiana jednej listy pól w eksporcie.

**15. Jak bronicie się przed fałszywymi wpisami?**
- Hub pobiera dane tylko ze źródeł zapisanych w rejestrze profili (`zrodla/`), a nie od anonimowych użytkowników.
- Kreator tylko przygotowuje pliki. Opublikować może je wyłącznie dysponent: na swojej stronie lub w BIP i przez wniosek do ministerstwa.
- Kampania celowo nie mówi „zgłoś AED”, tylko „pokaż swój AED”.
- Dane OSM mają oznaczenie „społeczność”, a nie „dysponent”.

## Wdrożenie, utrzymanie, koszty

**16. Kto będzie to utrzymywał i ile to kosztuje?**
- Strony są statyczne (Cloudflare Pages), a aktualizację robi GitHub Actions. Nie ma bazy danych ani serwera, a koszt jest zerowy w ramach darmowych limitów.
- Kod jest otwarty, bez zewnętrznych bibliotek w hubie i z 77 testami.
- Domeny i całość przekażemy ministerstwu (regulamin, §4: przeniesienie praw).
- Nowe źródło dodaje się plikiem JSON, bez programowania.

**17. Jak to wdrożyć w ministerstwie w ciągu 30 dni?**
1. Dzień 1: MC wpisuje adres naszego XML do automatycznego importu albo przejmuje domenę i repozytorium.
2. Tydzień 1: list do gmin, które już publikują (Krosno, Przemyśl, Marki, Legionowo, Warszawa), żeby przeszły na wzorcowy zakres; dostają odznakę.
3. Miesiąc 1: pismo przez ePUAP do wszystkich gmin z linkiem do kreatora i webinar.
4. Równolegle: propozycja wytycznych KG PSP dla OSP.

**18. Czy służby ratownicze (SWD PRM, dyspozytorzy) mogą z tego korzystać?**
- **Dyspozytor** może już dziś wpisać adres zdarzenia na gdzieaed.pl i zobaczyć najbliższe AED.
- **Systemy** mogą pobierać aed.geojson albo aed.csv z kodami TERYT pod stałymi adresami, bez klucza i z CORS (`docs/api.md`).
- **Integracja z SWD PRM** wymaga uzgodnienia z jego operatorem. Dostarczamy otwarty, stabilny format, ale do systemu się nie podpinamy.

**19. Skąd wiadomo, że AED działa? Ile tych danych jest naprawdę sprawdzonych?**
Nie wiemy tego i mówimy to wprost: to nie urzędowa ewidencja, tylko deklaracja źródła. Każdy rekord pokazuje:
- kto go potwierdził: 1 059 AED od dysponentów i 18 tys. ze społeczności;
- ocenę jakości 0–100 z listą powodów obniżenia;
- pola na termin elektrod, baterii i datę weryfikacji.

Celem kampanii jest właśnie zwiększenie liczby AED potwierdzonych przez dysponentów. To mierzymy automatycznie.

**20. Dlaczego średnik w logo? Czy przeciętny człowiek to zrozumie?**
Najpierw widać serce i błyskawicę, czyli AED. Średnik to drugi plan dla dysponentów: separator kolumn w pliku CSV, w którym publikują dane, więc znak łączy dane z ratunkiem. Na naklejkach dla ludzi używamy układu międzynarodowego znaku AED w naszym stylu, żeby był rozpoznawalny od pierwszego spojrzenia. Hasło „Każda minuta ma adres.” mówi wszystko bez logo.

## Pytania zapasowe

- **Identyfikator AED nie jest w pełni stały.** Gdy dojdą dane dysponenta dla punktu z OSM, AED dostaje nowy `aed_id` (od najważniejszej obserwacji). Stara obserwacja zostaje w aed_obserwacje.csv. Do poprawy: tabela przejść identyfikatorów.
- **Legionowo nie ma identyfikatorów w pliku**, więc numerujemy wiersze. Zmiana kolejności w pliku zmienia identyfikator obserwacji.
- **AED w pojazdach** (278 w autobusach i tramwajach ZTM Gdańsk) nie mają stałej pozycji, więc nie ma ich na mapie. Są w zbiorze z `mobilny = tak`.
- **API Warszawy** z serwerów GitHuba bywa nieosiągalne. Wtedy używamy ostatniej kopii, zapisanej 21.11.
