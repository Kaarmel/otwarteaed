# Oświadczenie o wykorzystaniu sztucznej inteligencji (regulamin, §2 pkt 8)

Rozwiązanie powstało przy wsparciu narzędzi AI. Zespół odpowiadał za koncepcję i projekt architektury, integrację źródeł i usług, wdrożenie oraz weryfikację wyników.

| Narzędzie | Do czego użyte |
|---|---|
| **Claude Code (model Claude Opus 5.5, Anthropic)** | Wsparcie zespołu przy rozpoznaniu źródeł danych i dokumentacji dane.gov.pl, opracowaniu architektury, implementacji kodu (harvester, kreator, strony) oraz przygotowaniu testów automatycznych i dokumentacji. Kod powstał od zera w trakcie wydarzenia. |
| **Antigravity (Google)** | Szkice koncepcji logo w kilku wariantach, każdy z innym kierunkiem twórczym; wybrany kierunek przerysowano jako wektor SVG. Niezależny przegląd zgodności zgłoszenia z treścią zadania. |
| **ElevenLabs** | Film demonstracyjny: usunięcie szumu z nagrania głosu autora (Voice Isolator), transkrypcja z czasami słów do montażu (Scribe), podkład muzyczny (Music, licencja komercyjna planu Starter). Lektorem jest autor, jego prawdziwy głos. |

**Praca zespołu:**
- wybór problemu i koncepcji;
- projekt architektury: wspólny rdzeń harvestera i kreatora oraz przepływ danych do portalu i mapy;
- integracja źródeł danych i wdrożenie w Cloudflare Pages, przechowywanie sekretów API w GitHub Actions;
- konsultacje z mentorami ministerstwa, które zmieniły zakres (harvester zamiast samej mapy, „brak danych = dostępny”, szablony dla gmin, propozycja PSP/OSP);
- decyzje o licencjach, kolorach, nazwie i logo;
- testy integracji, przegląd bezpieczeństwa, ocena wyników i zgoda na publikację.

**Jak sprawdzaliśmy wyniki AI:**
- testy na prawdziwych plikach;
- walidacja XML oficjalnym schematem dane.gov.pl;
- zrzuty ekranu na komputerze i telefonie;
- przegląd bezpieczeństwa: poprawka chroniąca przed wstrzyknięciem formuł do CSV.

Żadne dane osobowe nie były przekazywane do narzędzi AI.
