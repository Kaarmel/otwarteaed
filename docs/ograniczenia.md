# Ograniczenia

- **To nie jest urzędowa ewidencja.** Punkt w zbiorze to deklaracja źródła, a nie potwierdzenie, że urządzenie stoi na miejscu i działa. W nagłym wypadku dzwoń 112.
- **Licencja zbioru zintegrowanego.** Zawiera dane OpenStreetMap na licencji ODbL 1.0, a słownik licencji w XSD dane.gov.pl jej nie zawiera. Warunki ODbL wpisujemy w pole `dbOrCopyrighted`. Osobny zbiór „od dysponentów” (bez OSM) ma licencję CC BY 4.0. Którą ścieżkę przyjmie portal, rozstrzyga ministerstwo.
- **Brak danych o dostępności oznacza: przyjęto, że AED jest dostępny** (ustalenie z mentorami). Nie dotyczy to AED oznaczonych jako prywatne. Nie rozważamy sytuacji łamania prawa, np. AED zamkniętego mimo publicznej deklaracji.
- **Scalanie** opiera się na odległości (do 30 m), punkcie adresowym PRG i podobieństwie nazw. Dwa różne AED z różnych źródeł stojące bardzo blisko mogą zostać scalone. Obie obserwacje i tak zostają w `aed_obserwacje.csv`.
- **Adres z PRG** to najbliższy punkt adresowy (do 50 m, a do 200 m z flagą „adres przybliżony”). Dla 268 punktów OSM poza zabudową adresu nie ustalono.
- **Warszawa** udostępnia dane o AED tylko przez API z tokenem. Profil źródła można dodać po uzyskaniu tokena. Kraków, Gdańsk, Wrocław, Łódź, InPost, Poczta Polska i PKP Intercity to źródła do pozyskania (brak otwartej licencji albo eksportu).
- **Pobieranie pliku z cudzego serwera w kreatorze** wymaga, by serwer na to pozwalał (CORS). Jeśli nie pozwala, plik trzeba zapisać na dysku i wgrać.
- **Godziny** w składni opening_hours rozumiemy tylko w podstawowym zakresie. Nierozpoznany zapis jest traktowany jako „ograniczone godziny”, a stan „teraz” jako nieznany.
- **Treść pierwszej pomocy** na kartach gdzieaed.pl wymaga sprawdzenia przez ratownika lub lekarza przed szeroką dystrybucją.
- **Domeny otwarteaed.pl i gdzieaed.pl** są zarejestrowane przez zespół. W razie potrzeby przeniesiemy je na ministerstwo, razem z prawami do rozwiązania (regulamin, §4).
