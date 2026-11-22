// Pismo do gminy bez AED w zbiorze (biała plama), wypełniane danymi z dane/gminy_aed.json.
const $ = (s) => document.querySelector(s);
const teryt = new URLSearchParams(location.search).get("teryt") || "";
const data = new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

function tresc(g) {
  const [, nazwa, typ, powiat, woj, aed] = g;
  const urzad = typ === "wiejska" ? "Wójt Gminy" : typ === "miejska" ? "Burmistrz / Prezydent Miasta" : "Burmistrz Miasta i Gminy";
  return `${urzad} ${nazwa}
${powiat}, województwo ${woj}

${data}

Dotyczy: publikacji danych o defibrylatorach AED na portalu dane.gov.pl

Szanowni Państwo,

w ogólnopolskim zbiorze danych o defibrylatorach otwarte AED (otwarteaed.pl) ${aed ? "jest tylko " + aed + " AED" : "nie ma obecnie żadnego defibrylatora AED"} z terenu Gminy ${nazwa}. Nie musi to znaczyć, że AED w gminie nie ma: mogą być w szkołach, ośrodku zdrowia, remizie OSP czy w urzędzie, ale nie zostały opublikowane w otwartych danych.

Przy nagłym zatrzymaniu krążenia każda minuta bez defibrylacji zmniejsza szansę na przeżycie. Defibrylatora może użyć każdy, ale tylko wtedy, gdy wie, gdzie on jest. Dlatego prosimy o opublikowanie na portalu dane.gov.pl potwierdzonych danych o defibrylatorach, którymi dysponuje gmina i jej jednostki.

Jak to zrobić w kilkanaście minut:
1. Na stronie otwarteaed.pl pobierz szablon „Mam współrzędne” albo „Mam tylko adresy” lub użyj listy, którą gmina już ma (Excel, CSV).
2. Wgraj plik do kreatora na otwarteaed.pl. Kreator pokaże błędy i uzupełni adres oraz kod TERYT z rejestru PRG. Plik nie opuszcza komputera.
3. Pobierz gotowe pliki CSV, XML i MD5 i umieść je na stronie gminy lub w BIP.
4. Złóż w Ministerstwie Cyfryzacji wniosek o automatyczne pobieranie. Od tej chwili każda zmiana trafia na dane.gov.pl sama.

Publikujecie Państwo tylko dane o urządzeniach, którymi gmina dysponuje. Udział w akcji jest dobrowolny. Gminy, które opublikują dane, mogą umieścić na swojej stronie odznakę „Publikujemy dane o AED na dane.gov.pl”.

Z wyrazami szacunku

........................................
(podpis)

Akcja otwarte AED · Każda minuta ma adres. · otwarteaed.pl`;
}

fetch("dane/gminy_aed.json").then((r) => r.json()).then(({ gminy }) => {
  const g = gminy.find((x) => x[0] === teryt);
  if (!g) { $("#pismo").textContent = "Nie znaleziono gminy o kodzie TERYT " + teryt + ". Wróć do listy białych plam."; return; }
  document.title = "Pismo do gminy " + g[1] + " — otwarte AED";
  $("#h-pismo").textContent = "Pismo do gminy " + g[1];
  $("#pismo").textContent = tresc(g);
}).catch(() => { $("#pismo").textContent = "Nie udało się wczytać listy gmin."; });

$("#kopiuj").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#pismo").textContent); $("#status").textContent = "Skopiowano treść pisma."; }
  catch { $("#status").textContent = "Nie udało się skopiować. Zaznacz tekst pisma i skopiuj ręcznie."; }
});
$("#drukuj").addEventListener("click", () => window.print());
