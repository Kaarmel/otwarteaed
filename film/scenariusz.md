# Film otwarte AED: scenariusz i tekst lektora

> **Wersja do oddania (22.11, 06:35):** `film/out/otwarte-aed-film-v4.mp4` (1:57). Bez MD5 w terminalu i w głosie, bo treść zadania nie wymaga MD5; dowodem zgodności jest walidacja XSD.
> - **Obraz:** 2560×1440, 30 kl./s, H.264 CRF 16. Nagrany przez `node film/nagraj.mjs`, z ruchem kamery, kurtynami przejść, kursorem i animowanymi planszami.
> - **Głos:** prawdziwy głos autora, oczyszczony w ElevenLabs (Voice Isolator). Początek pochodzi z nagrania „Stroma 2”, a od zdania „Dodaje adres” i od „Sprawdziliśmy” z nagrania „Stroma”. Układ cięć jest w `film/out/glos-prawdziwy-v3-uklad.json`.
> - **Muzyka:** podkład wygenerowany w ElevenLabs Music, automatycznie ściszany pod głosem. Głośność całości −14 LUFS.
> - **Napisy do YouTube:** `film/napisy.srt`.

- **Plik:** `film/out/otwarte-aed-film.mp4`, 2:00, 1920×1080, 30 kl./s, z napisami ekranowymi i bez dźwięku.
- **Nagranie:** `node film/nagraj.mjs` (prawdziwy interfejs otwarteaed.pl, Chrome sterowany przez DevTools Protocol).
- **Lektor:** tekst z czasami w `film/lektor.srt`, 246 słów, ok. 130 słów na minutę. Czytaj spokojnie; tam, gdzie ekran sam mówi (demo), zostaw pauzę.

## Budowa: lejek informacji

Od ogółu do szczegółu, a najmocniejsze dowody na końcu. Pierwsze 6 sekund obiecuje, co widz zobaczy.

| Czas | Scena | Na ekranie | Lektor |
|---|---|---|---|
| 0:00–0:06 | Tytuł | logo, „Każda minuta ma adres.”, obietnica filmu | Dwie minuty: od wadliwego pliku gminy do danych gotowych dla dane.gov.pl. |
| 0:06–0:20 | 1 · Problem | 18 301 punktów OSM bez adresu, 7 źródeł w różnych formatach, 7 z 8 złych osi | Przy zatrzymaniu krążenia liczy się każda minuta. Defibrylatora może użyć każdy, jeśli wie, gdzie on jest. Dziś dane o AED są rozproszone: w OpenStreetMap, w plikach gmin, w API miast. Każde w innym formacie. |
| 0:20–0:38 | 2 · Rozwiązanie | otwarteaed.pl: baner, „Co chcesz zrobić?”, „Jak to działa” | otwarte AED to hub danych. Zbiera dane z siedmiu źródeł i sprowadza je do jednego wzorca. Dodaje adres i kod TERYT z rejestru PRG, łączy duplikaty i co dwie godziny publikuje jeden zbiór dla całej Polski. |
| 0:38–0:50 | 3 · Wzorcowy zakres | sekcja wzorca, plik XLSX | Dla dysponentów zaprojektowaliśmy wzorcowy zakres danych: trzydzieści dziewięć pól i dwa proste szablony, dla gminy ze współrzędnymi i dla gminy, która ma tylko adresy. |
| 0:50–1:14 | 4 · Demo | kreator: plik Marek, „Rozpoznano 93%”, zielona ramka naprawy, pliki do pobrania | Sprawdźmy to na prawdziwym pliku z dane.gov.pl. Marki zapisały cały wiersz w jednej kolumnie i zamieniły osie współrzędnych. Kreator sam rozpoznaje plik, odwraca osie w siedmiu z ośmiu rekordów i oznacza szkołę, której punkt leży dwieście dziewięćdziesiąt trzy kilometry dalej, w Krośnie. Gmina pobiera gotowe pliki CSV, XML i MD5. |
| 1:14–1:32 | 5 · Zgodność z dane.gov.pl | xmllint „validates”, MD5, kontrola przed publikacją | To nie jest tylko podgląd. Plik XML przechodzi walidację oficjalnym schematem portalu dane.gov.pl, a suma MD5 się zgadza. Portal może pobierać dane automatycznie, a przed każdą publikacją hub sam sprawdza wynik. |
| 1:32–1:52 | 6 · Kampania | znak i hasło, białe plamy (5 z 2479, 351), pismo do gminy | Najważniejsze jest jednak, żeby dysponenci chcieli publikować. Dziś robi to tylko pięć z dwóch tysięcy czterystu siedemdziesięciu dziewięciu gmin. Hub wskazuje trzysta pięćdziesiąt jeden gmin bez żadnego AED w zbiorze. Dla każdej przygotowuje pismo do wysłania przez ePUAP. Do tego odznaka, posty i naklejki. |
| 1:52–2:00 | Zakończenie | logo, „Każda minuta ma adres.”, otwarteaed.pl | otwarte AED. Jeden otwarty zbiór danych o defibrylatorach dla całej Polski. Bo każda minuta ma adres. |

## Jak nagrać głos

1. **Nagranie:** QuickTime → Plik → Nowe nagranie audio. Czytaj z `film/lektor.srt` przy włączonym filmie.
2. **Połączenie:** `ffmpeg -i film/out/otwarte-aed-film.mp4 -i glos.m4a -c:v copy -c:a aac -shortest film/out/otwarte-aed-film-glos.mp4`.
3. **Publikacja:** YouTube, widoczność „Niepubliczny” (Listed), link do pola „Video” w HackTribe.

Liczby w filmie to stan z 21.11.2026.
