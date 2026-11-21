// Scalanie obserwacji z różnych źródeł w rekordy AED. Nic nie ginie: każdy AED zna listę obserwacji (zrodla), a odrzucone wartości trafiają do konflikty.
import { md5 } from "./md5.mjs";
import { statusDostepnosci } from "./normalizuj.mjs";

export function odlegloscM(a, b) {
  const R = 6371008.8, r = Math.PI / 180;
  const dfi = (b.szerokosc - a.szerokosc) * r, dl = (b.dlugosc - a.dlugosc) * r;
  const h = Math.sin(dfi / 2) ** 2 + Math.cos(a.szerokosc * r) * Math.cos(b.szerokosc * r) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const slowa = (o) => new Set([o.nazwa_obiektu, o.operator, o.lokalizacja_opis].filter(Boolean).join(" ").toLowerCase()
  .replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
function jaccard(a, b) {
  const A = slowa(a), B = slowa(b);
  if (!A.size || !B.size) return 0;
  let wspolne = 0; for (const w of A) if (B.has(w)) wspolne++;
  return wspolne / (A.size + B.size - wspolne);
}
const tenSamPunktPRG = (a, b) => Boolean(a.simc && a.numer && a.simc === b.simc && (a.ulic ?? "") === (b.ulic ?? "") && a.numer === b.numer);

export function podobienstwo(a, b, progM = 30) {
  const d = odlegloscM(a, b);
  if (d >= progM) return 0;
  return 0.35 + 0.35 * (1 - d / progM) + (tenSamPunktPRG(a, b) ? 0.2 : 0) + 0.1 * jaccard(a, b);
}

const POLA = ["szerokosc", "dlugosc", "nazwa_obiektu", "lokalizacja_opis", "wewnatrz", "poziom", "ulica", "numer", "kod_pocztowy", "miejscowosc", "gmina", "powiat",
  "wojewodztwo", "teryt_gmina", "simc", "ulic", "adres_zrodlo", "adres_odleglosc_m", "adres_zrodlowy", "godziny", "dostep", "operator", "telefon",
  "data_weryfikacji", "termin_elektrod", "termin_baterii", "mobilny", "data_danych", "data_pobrania"];
const BEZ_KONFLIKTU = new Set(["szerokosc", "dlugosc", "adres_odleglosc_m", "adres_zrodlo", "data_danych", "data_pobrania", "gmina", "powiat", "wojewodztwo", "teryt_gmina", "simc", "ulic"]);
const pusta = (v) => v === null || v === undefined || v === "" || v === "brak_danych";
const RANGA = { dysponent: 0, spolecznosc: 1, brak: 2 };
const priorytet = (x, y) => (RANGA[x.potwierdzenie] ?? 2) - (RANGA[y.potwierdzenie] ?? 2) || (x.obs_id < y.obs_id ? -1 : x.obs_id > y.obs_id ? 1 : 0);

function rekord(grupa) {
  const g = [...grupa].sort(priorytet), a = {}, konflikty = [];
  for (const p of POLA) {
    const z = g.find((o) => !pusta(o[p]));
    a[p] = z ? z[p] : g[0][p] ?? null;
    if (!z || BEZ_KONFLIKTU.has(p)) continue;
    for (const o of g) if (o !== z && !pusta(o[p]) && String(o[p]).trim().toLowerCase() !== String(z[p]).trim().toLowerCase()) konflikty.push(`${p}: ${o[p]} (${o.obs_id})`);
  }
  const unikalne = (k) => [...new Set(g.map((o) => o[k]).filter(Boolean))];
  return { aed_id: "PL-AED-" + md5(g[0].obs_id).slice(0, 10), zrodla: g.map((o) => o.obs_id), liczba_zrodel: unikalne("zrodlo").length,
    potwierdzenie: g[0].potwierdzenie ?? "brak", ...a, status_dostepnosci: statusDostepnosci({ godziny: a.godziny, dostep: a.dostep }),
    licencja: unikalne("licencja").join(";"), atrybucja: unikalne("atrybucja").join(";"), konflikty,
    flagi: [...new Set(g.flatMap((o) => o.flagi || []))] };
}

export function scal(obserwacje, { progM = 30, progScal = 0.5, progSzary = 0.3 } = {}) {
  const komorka = 0.0005, siatka = new Map(), zWsp = obserwacje.filter((o) => o.szerokosc !== null && o.szerokosc !== undefined);
  const klucz = (i, j) => i + ":" + j;
  zWsp.forEach((o) => { const k = klucz(Math.floor(o.szerokosc / komorka), Math.floor(o.dlugosc / komorka)); (siatka.get(k) || siatka.set(k, []).get(k)).push(o); });
  const pary = [], szare = new Set();
  for (const o of zWsp) {
    const i = Math.floor(o.szerokosc / komorka), j = Math.floor(o.dlugosc / komorka);
    for (let di = -1; di <= 1; di++) for (let dj = -2; dj <= 2; dj++) for (const p of siatka.get(klucz(i + di, j + dj)) || []) {
      if (p.obs_id <= o.obs_id || p.zrodlo === o.zrodlo) continue;
      const s = podobienstwo(o, p, progM);
      if (s >= progScal) pary.push([s, o, p]);
      else if (s >= progSzary) { szare.add(o.obs_id); szare.add(p.obs_id); }
    }
  }
  const rodzic = new Map(obserwacje.map((o) => [o.obs_id, o.obs_id])), zrodlaGrupy = new Map(obserwacje.map((o) => [o.obs_id, new Set([o.zrodlo])]));
  const znajdz = (x) => { while (rodzic.get(x) !== x) { rodzic.set(x, rodzic.get(rodzic.get(x))); x = rodzic.get(x); } return x; };
  pary.sort((x, y) => y[0] - x[0] || (x[1].obs_id + x[2].obs_id < y[1].obs_id + y[2].obs_id ? -1 : 1));
  for (const [, a, b] of pary) {
    const ra = znajdz(a.obs_id), rb = znajdz(b.obs_id);
    if (ra === rb) continue;
    const za = zrodlaGrupy.get(ra), zb = zrodlaGrupy.get(rb);
    if ([...za].some((z) => zb.has(z))) continue;
    rodzic.set(rb, ra); for (const z of zb) za.add(z);
  }
  const grupy = new Map();
  for (const o of obserwacje) { const r = znajdz(o.obs_id); (grupy.get(r) || grupy.set(r, []).get(r)).push(o); }
  return [...grupy.values()].map((g) => {
    const a = rekord(g);
    if (g.some((o) => szare.has(o.obs_id)) && a.liczba_zrodel === 1) a.flagi.push("mozliwy_duplikat");
    return a;
  }).sort((x, y) => (x.aed_id < y.aed_id ? -1 : 1));
}
