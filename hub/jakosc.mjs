// Flagi jakości z wagami, ocena 0–100 i raport dla każdego źródła. Brak danych o dostępności ma wagę 0 (przyjęto: dostępny).
export const WAGI = { daleko_od_pozostalych: 25, brak_wspolrzednych: 60, poza_polska: 50, te_same_wspolrzedne_rozne_adresy: 20, brak_adresu: 10, mozliwy_duplikat: 10,
  adres_przyblizony: 5, zamienione_osie: 5, wspolrzedne_z_prg: 5, pl1992: 0, brak_danych_dostepnosci: 0, mobilny_bez_pozycji: 0 };

export const OPISY = {
  daleko_od_pozostalych: "Punkt leży daleko od pozostałych z tej samej listy — sprawdź współrzędne (np. kopia z szablonu innej gminy).",
  brak_wspolrzednych: "Brak poprawnych współrzędnych — rekordu nie ma na mapie.",
  poza_polska: "Współrzędne poza obrysem Polski.",
  te_same_wspolrzedne_rozne_adresy: "Te same współrzędne przy różnych adresach (prawdopodobnie kopia z szablonu).",
  brak_adresu: "Nie udało się ustalić adresu (PRG ani źródło).",
  mozliwy_duplikat: "Inny rekord z innego źródła jest bardzo blisko — możliwy duplikat, nie scalono.",
  adres_przyblizony: "Najbliższy punkt adresowy PRG jest dalej niż 50 m.",
  zamienione_osie: "Szerokość i długość były zamienione — naprawiono automatycznie.",
  wspolrzedne_z_prg: "Współrzędne ustalone z adresu (geokodowanie PRG).",
  pl1992: "Współrzędne w układzie PL-1992 przeliczone na WGS84.",
  brak_danych_dostepnosci: "Brak godzin i zasad dostępu — przyjęto: dostępny (informacja, nie obniża oceny).",
  mobilny_bez_pozycji: "AED w pojeździe (np. autobus, tramwaj): bez stałej lokalizacji, nie ma go na mapie (informacja, nie obniża oceny).",
};

export function ocenJakosc(r) {
  const flagi = [...new Set(r.flagi || [])];
  if (r.status_dostepnosci === "brak_danych" && !flagi.includes("brak_danych_dostepnosci")) flagi.push("brak_danych_dostepnosci");
  const kara = flagi.reduce((s, f) => s + (WAGI[f] ?? 0), 0);
  return { flagi_jakosci: flagi, ocena_jakosci: Math.max(0, 100 - kara) };
}

export function oznaczWspolneWspolrzedne(obserwacje) {
  const grupy = new Map();
  for (const o of obserwacje) {
    if (o.szerokosc === null || o.szerokosc === undefined) continue;
    const k = o.szerokosc.toFixed(6) + "," + o.dlugosc.toFixed(6);
    (grupy.get(k) || grupy.set(k, []).get(k)).push(o);
  }
  for (const g of grupy.values()) {
    const adresy = new Set(g.map((o) => (o.adres_zrodlowy || "").trim().toLowerCase()).filter(Boolean));
    if (g.length > 1 && adresy.size > 1) for (const o of g) if (!o.flagi.includes("te_same_wspolrzedne_rozne_adresy")) o.flagi.push("te_same_wspolrzedne_rozne_adresy");
  }
}

const odm = (n, [jeden, kilka, wiele]) => (n === 1 ? jeden : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? kilka : wiele);
const rek = (n) => `${n} ${odm(n, ["rekord", "rekordy", "rekordów"])}`;
const czas = (n, poj, mn) => odm(n, [poj, mn, poj]); // 1 rekord ma, 3 rekordy mają, 5 rekordów ma
function komunikat(z) {
  const zd = [];
  const f = z.flagi;
  if (f.zamienione_osie) zd.push(`Zamienione osie współrzędnych w ${f.zamienione_osie} z ${rek(z.obserwacji)} — naprawiliśmy je automatycznie.`.replace(/ z (\d+) rekordy\b/, " z $1 rekordów").replace(/ z 1 rekord\b/, " z 1 rekordu"));
  if (f.te_same_wspolrzedne_rozne_adresy) zd.push(`${rek(f.te_same_wspolrzedne_rozne_adresy)} ${czas(f.te_same_wspolrzedne_rozne_adresy, "ma", "mają")} te same współrzędne co inne miejsce — prosimy o sprawdzenie.`);
  if (f.daleko_od_pozostalych) zd.push(`${rek(f.daleko_od_pozostalych)} ${czas(f.daleko_od_pozostalych, "leży", "leżą")} daleko od pozostałych — sprawdź współrzędne.`);
  if (f.brak_wspolrzednych) zd.push(`${rek(f.brak_wspolrzednych)} bez współrzędnych.`);
  if (f.brak_danych_dostepnosci) zd.push(`${rek(f.brak_danych_dostepnosci)} bez godzin dostępności — warto je dopisać.`);
  return zd.length ? zd.join(" ") : "Plik jest w dobrej kondycji.";
}

export function raportJakosci(aed, obserwacje, profile, data) {
  const zrodla = {};
  for (const o of obserwacje) {
    const z = (zrodla[o.zrodlo] ||= { nazwa: profile.find((p) => p.id === o.zrodlo)?.nazwa ?? o.zrodlo, obserwacji: 0, flagi: {}, suma_ocen: 0 });
    const q = ocenJakosc(o);
    z.obserwacji++; z.suma_ocen += q.ocena_jakosci;
    for (const f of q.flagi_jakosci) z.flagi[f] = (z.flagi[f] || 0) + 1;
  }
  for (const z of Object.values(zrodla)) { z.srednia_ocena = Math.round((z.suma_ocen / z.obserwacji) * 10) / 10; delete z.suma_ocen; z.komunikat = komunikat(z); }
  const ile = (f) => aed.filter(f).length;
  return {
    data, obserwacji: obserwacje.length, aed: aed.length,
    aed_z_kilku_zrodel: ile((a) => a.liczba_zrodel > 1),
    aed_na_mapie: ile((a) => a.szerokosc !== null && a.szerokosc !== undefined),
    potwierdzone_przez_dysponenta: ile((a) => a.potwierdzenie === "dysponent"),
    z_adresem: ile((a) => a.szerokosc !== null && a.szerokosc !== undefined && (a.ulica || a.miejscowosc)), // tylko AED ze stałą lokalizacją
    status: Object.fromEntries(["24/7", "brak_danych", "godziny", "ograniczony"].map((s) => [s, ile((a) => a.status_dostepnosci === s)])),
    srednia_ocena: Math.round((aed.reduce((s, a) => s + a.ocena_jakosci, 0) / Math.max(1, aed.length)) * 10) / 10,
    zrodla, opisy_flag: OPISY, wagi_flag: WAGI,
  };
}

// Listy lokalne (gmina, powiat): punkt odległy o > max(50 km, 5 × mediana) od środka listy jest podejrzany. Listy ogólnopolskie (duży rozrzut) pomijamy.
export function oznaczOdstajace(obserwacje) {
  const z = obserwacje.filter((o) => o.szerokosc !== null && o.szerokosc !== undefined);
  if (z.length < 3) return;
  const med = (t) => { const s = [...t].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const sr = { szerokosc: med(z.map((o) => o.szerokosc)), dlugosc: med(z.map((o) => o.dlugosc)) };
  const km = (o) => { const r = Math.PI / 180, x = (o.dlugosc - sr.dlugosc) * r * Math.cos(sr.szerokosc * r), y = (o.szerokosc - sr.szerokosc) * r; return 6371 * Math.hypot(x, y); };
  const d = z.map(km), m = med(d);
  if (m > 15) return;
  z.forEach((o, i) => { if (d[i] > Math.max(50, 5 * m) && !o.flagi.includes("daleko_od_pozostalych")) o.flagi.push("daleko_od_pozostalych"); });
}
