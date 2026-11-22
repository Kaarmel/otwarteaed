# Grafiki otwarte AED

Komplet plików logo w wersji 2 („serce dominuje”). Podgląd wszystkich wariantów: `podglad.jpg`.

Napisy są zamienione na krzywe, więc pliki otwierają się poprawnie bez zainstalowanej czcionki (Illustrator, Inkscape, Figma, drukarnia).

## Struktura

```
grafiki/
├── podglad.jpg                  wszystkie warianty na właściwych tłach
├── logo/
│   ├── rgb/                     ekran: strona, prezentacje, media społecznościowe, dokumenty
│   │   ├── svg/                 wektor (pierwszy wybór na stronę)
│   │   ├── png/                 przezroczyste tło: poziome 2000 px, pionowe 1200 px, sygnet 1024 px
│   │   │   └── ikony/           favicon.svg, favicon.ico, favicon 16 i 32 px, ikona aplikacji 180, 192 i 512 px
│   │   └── pdf/                 wektor RGB (Word, PowerPoint)
│   └── cmyk/                    druk
│       ├── pdf/                 wektor CMYK (pierwszy wybór dla drukarni)
│       └── eps/                 wektor CMYK (dla starszych programów)
└── zrodla/                      generator plików (logo_gen.py) i geometria (logo_cfg.json)
```

## Warianty

Każdy układ ma 4 wersje kolorystyczne, a każda z nich jest w każdym formacie.

| Plik | Kiedy używać |
|---|---|
| `otwarte-aed-poziome-*` | podstawowy układ: nagłówki, dokumenty, slajdy |
| `otwarte-aed-pionowe-*` | plakaty, naklejki, kwadratowe posty |
| `otwarte-aed-sygnet-*` | ikona aplikacji, favicon, awatar, małe formaty |

| Wersja | Tło | Opis |
|---|---|---|
| `kolor` | białe lub jasne | „otwarte” granat, średnik i „AED” zieleń AED, sygnet zielony |
| `negatyw` | granatowe lub ciemne | „otwarte” biały, średnik i „AED” jasna mięta, sygnet zielony |
| `mono-czarne` | jasne, druk jednobarwny, faks, pieczątka | całość jednym kolorem, znak wycięty w sygnecie |
| `mono-biale` | zielone, kolorowe, zdjęcia | całość biała, znak wycięty w sygnecie |

## Kolory

Wartości CMYK są dobrane ręcznie. Punktem wyjścia była konwersja sRGB do profilu Generic CMYK, a wynik zaokrąglono do czystych wartości. Przed dużym nakładem poproś drukarnię o proof (FOGRA39 / ISO Coated v2).

| Kolor | HEX | RGB | CMYK | Pantone | Użycie w logo |
|---|---|---|---|---|---|
| Zieleń AED | #00843D | 0 132 61 | 85 0 95 20 | 348 C | sygnet, średnik, „AED” |
| Granat danych | #0B3D91 | 11 61 145 | 100 80 0 5 | dobiera drukarnia | „otwarte” |
| Mięta (na ciemnym tle) | #7FE0A8 | 127 224 168 | 40 0 40 0 | dobiera drukarnia | średnik i „AED” w negatywie |
| Czerń (mono) | #1A1A1A | 26 26 26 | 0 0 0 100 | Black C | wersja jednobarwna |
| Biel | #FFFFFF | 255 255 255 | 0 0 0 0 | n/d | znak w sygnecie, wersja biała |

Biały znak na zieleni AED ma kontrast 4,8:1 (WCAG AA). Granat na bieli ma 10,3:1.

## Budowa znaku

- **Średnik z serca i błyskawicy.** Kropka to serce, ogonek to błyskawica. Serce jest 1,618 razy większe od błyskawicy (złoty podział), bo na pierwszym planie jest ratunek, a błyskawica to impuls.
- **Ten sam średnik** jest w sygnecie i w napisie. W napisie serce sięga wysokości wersalików, a błyskawica schodzi poniżej linii pisma, jak ogonek prawdziwego średnika.
- **Krój:** Atkinson Hyperlegible Bold (SIL OFL), odstęp między literami −1%.
- **Proporcje układu poziomego:** sygnet ma 1,9 wysokości pisma, odstęp między sygnetem a napisem to 0,3 wysokości pisma.

## Zasady użycia

- **Pole ochronne:** wokół logo zostaw pusty margines równy połowie wysokości sygnetu.
- **Minimalny rozmiar:**
  - układ poziomy: 30 mm w druku i 120 px na ekranie;
  - sygnet: 6 mm i 24 px.
- **Favicon 16 px:** błyskawica jest tam tylko kilkoma pikselami. To dopuszczalne, bo przy tej wielkości ikonę rozpoznaje się po zielonym kwadracie i sercu.
- **Nie wolno:** zmieniać kolorów i proporcji, obracać, dodawać cieni ani konturów, układać logo na tle bez kontrastu ani używać symboli państwowych.

## Jak wygenerować pliki ponownie

Potrzebne są Python 3 z pakietami `fonttools`, `brotli`, `uharfbuzz` i `pillow` oraz Ghostscript (do PNG).

```
python3 grafiki/zrodla/logo_gen.py otwarteaed/fonts/atkinson-latin-700-normal.woff2 grafiki/logo grafiki/zrodla/logo_cfg.json
```

Geometrię zmierzono w przeglądarce z zatwierdzonej propozycji (`kampania/logo/propozycje_v5.html`, wariant 2). Nałożenie pliku SVG na propozycję w trybie różnicy nie pokazuje przesunięć.
