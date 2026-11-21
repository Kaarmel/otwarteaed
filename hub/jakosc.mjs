// Flagi jakości z wagami, ocena 0–100 i raport dla każdego źródła. Brak danych o dostępności ma wagę 0 (przyjęto: dostępny).
export const WAGI = { brak_wspolrzednych: 60, poza_polska: 50, te_same_wspolrzedne_rozne_adresy: 20, brak_adresu: 10, mozliwy_duplikat: 10,
  adres_przyblizony: 5, zamienione_osie: 5, wspolrzedne_z_prg: 5, pl1992: 0, brak_danych_dostepnosci: 0 };

export const OPISY = {
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

function komunikat(z) {
  const zd = [];
  const f = z.flagi;
  if (f.zamienione_osie) zd.push(`Zamienione osie współrzędnych w ${f.zamienione_osie} z ${z.obserwacji} rekordów — naprawiliśmy je automatycznie.`);
  if (f.te_same_wspolrzedne_rozne_adresy) zd.push(`${f.te_same_wspolrzedne_rozne_adresy} rekordów ma te same współrzędne co inne miejsce — prosimy o sprawdzenie.`);
  if (f.brak_wspolrzednych) zd.push(`${f.brak_wspolrzednych} rekordów bez współrzędnych.`);
  if (f.brak_danych_dostepnosci) zd.push(`${f.brak_danych_dostepnosci} rekordów bez godzin dostępności — warto je dopisać.`);
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
    z_adresem: ile((a) => a.ulica || a.miejscowosc),
    status: Object.fromEntries(["24/7", "brak_danych", "godziny", "ograniczony"].map((s) => [s, ile((a) => a.status_dostepnosci === s)])),
    srednia_ocena: Math.round((aed.reduce((s, a) => s + a.ocena_jakosci, 0) / Math.max(1, aed.length)) * 10) / 10,
    zrodla, opisy_flag: OPISY, wagi_flag: WAGI,
  };
}
