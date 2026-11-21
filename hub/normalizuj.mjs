// Normalizacja: liczby, współrzędne (przecinek, DMS, zamiana osi, PL-1992), daty, dostępność, wiersz → obserwacja.
export const OBWIEDNIA_PL = { minLat: 49.0, maxLat: 54.84, minLon: 14.12, maxLon: 24.15 };
export const wPolsce = (lat, lon) => lat >= OBWIEDNIA_PL.minLat && lat <= OBWIEDNIA_PL.maxLat && lon >= OBWIEDNIA_PL.minLon && lon <= OBWIEDNIA_PL.maxLon;

const tekstLubNull = (v) => { if (v === null || v === undefined) return null; const s = String(v).trim(); return s === "" ? null : s; };

function dms(s) {
  const m = s.match(/^([NSEW])?\s*(\d+(?:[.,]\d+)?)\s*[°º:\s]\s*(\d+(?:[.,]\d+)?)?\s*['′:\s]?\s*(\d+(?:[.,]\d+)?)?\s*["″]?\s*([NSEW])?$/i);
  if (!m || (!m[3] && !/°/.test(s))) return null;
  const n = (x) => (x ? Number(x.replace(",", ".")) : 0);
  let v = n(m[2]) + n(m[3]) / 60 + n(m[4]) / 3600;
  if (/[SW]/i.test(m[1] || m[5] || "")) v = -v;
  return v;
}

export function parsujLiczbe(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = tekstLubNull(v);
  if (!s) return null;
  const d = /[°'"′″]/.test(s) ? dms(s) : null;
  if (d !== null) return d;
  const m = s.replace(/^[NE]\s*|\s*[NE]$/gi, "").replace(/\s/g, "").match(/^[-+]?\d+(?:[.,]\d+)?$/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

// PL-1992 (EPSG:2180): odwzorowanie Gaussa-Krügera na GRS80, szereg Krügera do n^4.
const A_ = 6378137, F_ = 1 / 298.257222101, K0 = 0.9993, L0 = 19 * Math.PI / 180, FE = 500000, FN = -5300000;
const n = F_ / (2 - F_), e = Math.sqrt(F_ * (2 - F_));
const AA = (A_ / (1 + n)) * (1 + n ** 2 / 4 + n ** 4 / 64);
const ALFA = [n / 2 - (2 * n ** 2) / 3 + (5 * n ** 3) / 16 + (41 * n ** 4) / 180, (13 * n ** 2) / 48 - (3 * n ** 3) / 5 + (557 * n ** 4) / 1440, (61 * n ** 3) / 240 - (103 * n ** 4) / 140, (49561 * n ** 4) / 161280];
const BETA = [n / 2 - (2 * n ** 2) / 3 + (37 * n ** 3) / 96 - n ** 4 / 360, n ** 2 / 48 + n ** 3 / 15 - (437 * n ** 4) / 1440, (17 * n ** 3) / 480 - (37 * n ** 4) / 840, (4397 * n ** 4) / 161280];
const DELTA = [2 * n - (2 * n ** 2) / 3 - 2 * n ** 3 + (116 * n ** 4) / 45, (7 * n ** 2) / 3 - (8 * n ** 3) / 5 - (227 * n ** 4) / 45, (56 * n ** 3) / 15 - (136 * n ** 4) / 35, (4279 * n ** 4) / 630];

export function wgs84DoPl1992(lat, lon) {
  const fi = (lat * Math.PI) / 180, dl = (lon * Math.PI) / 180 - L0;
  const t = Math.sinh(Math.atanh(Math.sin(fi)) - e * Math.atanh(e * Math.sin(fi)));
  const xi1 = Math.atan2(t, Math.cos(dl)), eta1 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
  let xi = xi1, eta = eta1;
  ALFA.forEach((a, j) => { const k = 2 * (j + 1); xi += a * Math.sin(k * xi1) * Math.cosh(k * eta1); eta += a * Math.cos(k * xi1) * Math.sinh(k * eta1); });
  return { x: FN + K0 * AA * xi, y: FE + K0 * AA * eta };
}

export function pl1992DoWgs84(x, y) {
  const xi = (x - FN) / (K0 * AA), eta = (y - FE) / (K0 * AA);
  let xi1 = xi, eta1 = eta;
  BETA.forEach((b, j) => { const k = 2 * (j + 1); xi1 -= b * Math.sin(k * xi) * Math.cosh(k * eta); eta1 -= b * Math.cos(k * xi) * Math.sinh(k * eta); });
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  let fi = chi;
  DELTA.forEach((d, j) => { fi += d * Math.sin(2 * (j + 1) * chi); });
  return { szerokosc: (fi * 180) / Math.PI, dlugosc: ((L0 + Math.atan2(Math.sinh(eta1), Math.cos(xi1))) * 180) / Math.PI };
}

export function parsujWspolrzedne(a, b) {
  const flagi = [], przeksztalcenia = [];
  let sa = a, sb = b;
  if ((b === null || b === undefined || b === "") && typeof a === "string") {
    const czesci = a.trim().split(/\s*[;\s]\s*|(?<=\d),\s+(?=-?\d)/).filter(Boolean);
    if (czesci.length === 2) { [sa, sb] = czesci; przeksztalcenia.push("para w jednym polu"); }
  }
  if ([sa, sb].some((v) => typeof v === "string" && /\d,\d/.test(v))) przeksztalcenia.push("przecinek→kropka");
  const x = parsujLiczbe(sa), y = parsujLiczbe(sb);
  if (x === null || y === null) return { szerokosc: null, dlugosc: null, flagi: ["brak_wspolrzednych"], przeksztalcenia };
  if (Math.abs(x) > 1000 && Math.abs(y) > 1000) {
    let w = pl1992DoWgs84(x, y);
    if (!wPolsce(w.szerokosc, w.dlugosc)) w = pl1992DoWgs84(y, x);
    flagi.push("pl1992"); przeksztalcenia.push("PL-1992→WGS84");
    if (!wPolsce(w.szerokosc, w.dlugosc)) flagi.push("poza_polska");
    return { ...w, flagi, przeksztalcenia };
  }
  if (wPolsce(x, y)) return { szerokosc: x, dlugosc: y, flagi, przeksztalcenia };
  if (wPolsce(y, x)) { flagi.push("zamienione_osie"); przeksztalcenia.push("zamiana osi"); return { szerokosc: y, dlugosc: x, flagi, przeksztalcenia }; }
  flagi.push("poza_polska");
  return { szerokosc: x, dlugosc: y, flagi, przeksztalcenia };
}

export function normalizujDate(v) {
  const s = tekstLubNull(v);
  if (!s) return null;
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/) || s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function mapujDostep(v) {
  const s = tekstLubNull(v)?.toLowerCase();
  if (!s) return "brak_danych";
  if (/^(yes|public|publiczny|ogólnodostępny|ogolnodostepny|tak)$/.test(s)) return "publiczny";
  if (/^(customers|permit|klienci|destination|delivery)$/.test(s)) return "klienci";
  if (/^(private|no|prywatny|ograniczony|nie)$/.test(s)) return "ograniczony";
  return "brak_danych";
}

export function mapujTakNie(v) {
  const s = tekstLubNull(v)?.toLowerCase();
  if (!s) return "brak_danych";
  if (/^(yes|tak|true|1)$/.test(s)) return "tak";
  if (/^(no|nie|false|0)$/.test(s)) return "nie";
  return "brak_danych";
}

export function statusDostepnosci({ godziny, dostep } = {}) {
  if (dostep === "ograniczony" || mapujDostep(dostep) === "ograniczony") return "ograniczony";
  const g = tekstLubNull(godziny);
  if (!g) return "brak_danych";
  if (/^(24\/7|24h|całodobowo|calodobowo|całodobowy|calodobowy)$/i.test(g)) return "24/7";
  return "godziny";
}

const POLA_TEKSTOWE = ["nazwa_obiektu", "lokalizacja_opis", "poziom", "ulica", "numer", "kod_pocztowy", "miejscowosc", "simc", "godziny", "operator", "telefon", "adres_zrodlowy"];
const POLA_DAT = ["data_weryfikacji", "termin_elektrod", "termin_baterii", "data_danych"];

function wartosc(wiersz, kol) {
  if (kol && kol.pierwsza) return kol.pierwsza.map((k) => tekstLubNull(wiersz[k])).find(Boolean) ?? null;
  if (Array.isArray(kol)) { const cz = kol.map((k) => tekstLubNull(wiersz[k])).filter(Boolean); return cz.length ? cz.join(" ") : null; }
  return kol === undefined ? null : wiersz[kol];
}

export function normalizujWiersz(wiersz, profil, mapowanie, indeks) {
  const idZr = tekstLubNull(profil.id_kolumna ? wiersz[profil.id_kolumna] : null);
  const wsp = parsujWspolrzedne(wartosc(wiersz, mapowanie.szerokosc), wartosc(wiersz, mapowanie.dlugosc));
  const o = {
    obs_id: `${profil.id}:${idZr ?? indeks + 1}`, zrodlo: profil.id, potwierdzenie: profil.potwierdzenie ?? "brak",
    licencja: profil.licencja ?? null, atrybucja: profil.atrybucja ?? null, data_pobrania: profil.data_pobrania ?? null,
    szerokosc: wsp.szerokosc, dlugosc: wsp.dlugosc,
  };
  for (const p of POLA_TEKSTOWE) o[p] = tekstLubNull(wartosc(wiersz, mapowanie[p]));
  for (const p of POLA_DAT) o[p] = normalizujDate(wartosc(wiersz, mapowanie[p]));
  o.data_danych ??= profil.data_danych ?? null;
  o.dostep = mapujDostep(wartosc(wiersz, mapowanie.dostep));
  o.wewnatrz = mapujTakNie(wartosc(wiersz, mapowanie.wewnatrz));
  o.mobilny = mapowanie.mobilny ? mapujTakNie(wartosc(wiersz, mapowanie.mobilny)) : (profil.mobilny ?? "nie");
  for (const [k, v] of Object.entries(profil.wartosci_stale || {})) o[k] ??= v;
  // reguły źródła, np. Warszawa: device_availability = "Tak" oznacza dostęp całodobowy
  for (const r of profil.reguly || []) if (String(wiersz[r.gdy.kolumna]) === String(r.gdy.rowne)) Object.assign(o, r.ustaw);
  o.status_dostepnosci = statusDostepnosci({ godziny: o.godziny, dostep: o.dostep });
  // AED w pojeździe nie ma stałej pozycji: to nie błąd danych, tylko inna kategoria (nie trafia na mapę).
  o.flagi = o.mobilny === "tak" ? wsp.flagi.map((f) => (f === "brak_wspolrzednych" ? "mobilny_bez_pozycji" : f)) : [...wsp.flagi];
  o.przeksztalcenia = [...wsp.przeksztalcenia];
  o.surowe = wiersz;
  return o;
}
