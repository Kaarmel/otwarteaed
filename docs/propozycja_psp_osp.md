# Propozycja: PSP zbiera od OSP potwierdzone dane o AED i publikuje je na dane.gov.pl

## Dlaczego

- **Nie ma państwowej ewidencji AED** ani obowiązku zgłaszania lokalizacji urządzeń. Ministerstwo Zdrowia potwierdziło to w odpowiedzi na interpelację nr 20763. Warstwa „Defibrylatory” w Geoportalu opiera się na OpenStreetMap.
- **AED w remizach są dobrymi kandydatami do mapy.** OSP i jednostki PSP często mają własne defibrylatory: na ścianach remiz, w kapsułach dostępnych całą dobę, w pojazdach. W OpenStreetMap opisano je pod setkami nazw („OSP …”, „remiza …”), ale bez wspólnego standardu i bez potwierdzenia od dysponenta.
- **PSP ma już strukturę, która dociera do OSP:** Krajowy System Ratowniczo-Gaśniczy i komendy powiatowe i miejskie, które współpracują z jednostkami OSP na co dzień. Zebranie danych nie wymaga nowej instytucji.

## Co proponujemy

1. **Wytyczne Komendanta Głównego PSP.** Komendy powiatowe i miejskie zbierają raz w roku, oraz po każdej zmianie, dane o AED w jednostkach PSP i OSP na swoim terenie. Najpierw w OSP włączonych do KSRG, potem w pozostałych.
2. **Jeden szablon:** „Mam współrzędne” z wzorcowego zakresu danych otwarte AED. Pola:
   - nazwa obiektu, współrzędne i opis miejsca (np. „kapsuła na ścianie remizy, przy bramie garażowej”);
   - godziny i zasady dostępu;
   - termin ważności elektrod i baterii oraz data weryfikacji;
   - czy AED jest w pojeździe.
   Szablon jest w pliku `wzorcowy_zakres_danych.xlsx`.
3. **Kontrola jakości przed publikacją:** komenda wgrywa arkusz do kreatora na otwarteaed.pl. Kreator od razu pokazuje błędy (zamienione osie, brak współrzędnych, kopie tych samych współrzędnych) i uzupełnia adres z PRG razem z kodem TERYT.
4. **Publikacja automatyczna:**
   - komenda wojewódzka albo KG PSP wystawia plik CSV z datą w nazwie oraz pliki XML i MD5;
   - jednorazowo składa wniosek o automatyczne pobieranie, czyli ten sam mechanizm, którym od 2025 r. deweloperzy publikują ceny mieszkań;
   - od tej chwili dane.gov.pl pobiera każdą zmianę sam.
5. **Agregacja:** hub otwarte AED pobiera zbiór PSP tak jak każde inne źródło. Rekordy PSP i OSP mają `potwierdzenie = dysponent`, więc przy scalaniu wygrywają z danymi społecznościowymi. Na mapie gdzieaed.pl widać, że urządzenie potwierdził dysponent.

## Co to daje

- **Tysiące potwierdzonych lokalizacji AED** w miejscach, które w małych miejscowościach często są jedynym punktem z defibrylatorem.
- **Terminy elektrod i baterii:** komenda wie, gdzie trzeba wymienić materiały, zanim urządzenie przestanie działać.
- **Ten sam format dla każdej gminy i instytucji.** Po PSP mogą dołączyć szkoły, urzędy i spółki komunalne, bez nowego systemu informatycznego.

## Zasada

Nie zmuszamy obywateli ani firm. Obowiązek dotyczy jednostek publicznych i współpracujących z nimi OSP, które i tak raportują do PSP. Właściciele prywatnych AED mogą dołączyć dobrowolnie przez kreator.

## Szkic przepływu

```
OSP / JRG PSP ──(arkusz z szablonu)──► KP/KM PSP ──(kreator otwarteaed.pl: kontrola + adresy PRG)──►
KW PSP / KG PSP: CSV + XML + MD5 na stronie ──(wniosek raz)──► dane.gov.pl pobiera zmiany automatycznie
                                                                    └──► hub otwarte AED scala z innymi źródłami ──► gdzieaed.pl, dyspozytorzy, aplikacje
```
