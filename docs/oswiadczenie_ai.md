# Oświadczenie o wykorzystaniu sztucznej inteligencji (regulamin, §2 pkt 8)

Rozwiązanie powstało przy wsparciu narzędzi AI. Jego zakres, decyzje i weryfikacja są pracą zespołu.

| Narzędzie | Do czego użyte |
|---|---|
| **Claude Code (model Claude Opus 5.5, Anthropic)** | Rozpoznanie źródeł danych i dokumentacji dane.gov.pl, projekt architektury, kod (harvester, kreator, strony), testy automatyczne, teksty dokumentacji. Kod powstał od zera w trakcie wydarzenia. |
| **Antigravity (Google)** | Szkice koncepcji logo w kilku wariantach, każdy z innym kierunkiem twórczym; wybrany kierunek przerysowano jako wektor SVG. Niezależny przegląd zgodności zgłoszenia z treścią zadania. |
| **Codex (OpenAI)** | Wstępny szkic sprzed wydarzenia (`docs/archiwum/`). Nie został użyty w rozwiązaniu, cały kod napisano od nowa. |

**Co zrobił człowiek:**
- wybór problemu i koncepcji;
- konsultacje z mentorami ministerstwa, które zmieniły zakres (harvester zamiast samej mapy, „brak danych = dostępny”, szablony dla gmin, propozycja PSP/OSP);
- decyzje o licencjach, kolorach, nazwie i logo;
- przegląd wyników i zgoda na publikację.

**Jak sprawdzaliśmy wyniki AI:**
- testy na prawdziwych plikach;
- walidacja XML oficjalnym schematem dane.gov.pl;
- zrzuty ekranu na komputerze i telefonie;
- przegląd bezpieczeństwa: poprawka chroniąca przed wstrzyknięciem formuł do CSV.

Żadne dane osobowe nie były przekazywane do narzędzi AI.
