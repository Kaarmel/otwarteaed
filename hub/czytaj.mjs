// Czytanie plików źródłowych: bajty → { format, naglowki, wiersze, meta }.
// Nagłówki zostają dosłowne (ze spacjami); dopasowanie robi wykryj.mjs. Działa w przeglądarce i w Node.
import { odczytXLSX } from "./xlsx.mjs";

export function dekoduj(bajty) {
  let b = bajty;
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) b = b.subarray(3);
  try {
    return { tekst: new TextDecoder("utf-8", { fatal: true }).decode(b), kodowanie: "utf-8" };
  } catch {
    return { tekst: new TextDecoder("windows-1250").decode(b), kodowanie: "windows-1250" };
  }
}

function poza(linia, znak) {
  let n = 0, q = false;
  for (const ch of linia) { if (ch === '"') q = !q; else if (!q && ch === znak) n++; }
  return n;
}

export function wykryjSeparator(tekst) {
  const linie = tekst.split(/\r?\n/).filter((l) => l.trim()).slice(0, 5);
  let naj = ",", wynik = 0;
  for (const s of [",", ";", "\t", "|"]) {
    const liczby = linie.map((l) => poza(l, s));
    const min = Math.min(...liczby);
    if (min > wynik) { wynik = min; naj = s; }
  }
  return naj;
}

export function parsujCSV(tekst, sep) {
  const wiersze = [];
  let w = [], pole = "", q = false;
  for (let i = 0; i < tekst.length; i++) {
    const ch = tekst[i];
    if (q) {
      if (ch === '"') { if (tekst[i + 1] === '"') { pole += '"'; i++; } else q = false; }
      else pole += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { w.push(pole); pole = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && tekst[i + 1] === "\n") i++;
      w.push(pole); pole = "";
      if (w.some((x) => x !== "")) wiersze.push(w);
      w = [];
    } else pole += ch;
  }
  w.push(pole);
  if (w.some((x) => x !== "")) wiersze.push(w);
  return wiersze;
}

function tabela(naglowki, wiersze) {
  return wiersze.map((w) => Object.fromEntries(naglowki.map((n, i) => [n, w[i] === undefined || w[i] === "" ? null : w[i]])));
}

function czytajCSV(tekst) {
  let sep = wykryjSeparator(tekst), surowe = parsujCSV(tekst, sep), zagniezdzony = false;
  if (surowe.length && surowe.every((w) => w.length === 1) && /[,;]/.test(surowe[0][0])) {
    const wnetrze = surowe.map((w) => w[0]).join("\n");
    sep = wykryjSeparator(wnetrze);
    surowe = parsujCSV(wnetrze, sep);
    zagniezdzony = true;
  }
  const [naglowki = [], ...dane] = surowe;
  return { naglowki, wiersze: tabela(naglowki, dane), meta: { separator: sep, zagniezdzony } };
}

function pierwszaPara(c) {
  if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") return c;
  if (Array.isArray(c)) for (const x of c) { const p = pierwszaPara(x); if (p) return p; }
  return null;
}

function splaszcz(o, pref = "", wynik = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) splaszcz(v, pref + k + ".", wynik);
    else wynik[pref + k] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return wynik;
}

function czytajJSON(dane) {
  if (Array.isArray(dane?.elements)) {
    const wiersze = dane.elements.map((e) => ({ ...e.tags, __id: `${e.type}/${e.id}`,
      __lat: e.lat ?? e.center?.lat ?? null, __lon: e.lon ?? e.center?.lon ?? null, __timestamp: e.timestamp ?? null }));
    return { format: "osm", wiersze };
  }
  if (dane?.type === "FeatureCollection") {
    const wiersze = dane.features.map((f) => {
      const p = pierwszaPara(f.geometry?.coordinates);
      return { ...splaszcz(f.properties), __lon: p ? p[0] : null, __lat: p ? p[1] : null };
    });
    return { format: "geojson", wiersze };
  }
  const lista = Array.isArray(dane) ? dane : Object.values(dane || {}).find(Array.isArray) || [];
  // lista obiektów w stylu GeoJSON bez FeatureCollection (np. API Warszawy): [{geometry, properties}, ...]
  if (lista.length && lista[0]?.geometry && lista[0]?.properties) return czytajJSON({ type: "FeatureCollection", features: lista });
  return { format: "json", wiersze: lista.map((x) => splaszcz(x)) };
}

const bezCdata = (s) => (s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
function czytajKML(tekst) {
  const wiersze = [...tekst.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/g)].map(([pm]) => {
    const w = { name: bezCdata(pm.match(/<name>([\s\S]*?)<\/name>/)?.[1]) || null,
      description: bezCdata(pm.match(/<description>([\s\S]*?)<\/description>/)?.[1]) || null };
    for (const d of pm.matchAll(/<Data name="([^"]+)">\s*<value>([\s\S]*?)<\/value>/g)) w[d[1]] = bezCdata(d[2]);
    const c = pm.match(/<coordinates>\s*([-\d.]+)\s*,\s*([-\d.]+)/);
    w.__lon = c ? Number(c[1]) : null; w.__lat = c ? Number(c[2]) : null;
    return w;
  });
  return { format: "kml", wiersze };
}

function zNaglowkami(r) {
  const naglowki = [...new Set(r.wiersze.flatMap((w) => Object.keys(w)))];
  return { ...r, naglowki };
}

export async function czytajPlik(bajty, nazwa = "", format = {}) {
  const typ = format.typ && format.typ !== "auto" ? format.typ : null;
  if (typ === "xlsx" || (!typ && bajty[0] === 0x50 && bajty[1] === 0x4b)) {
    const arkusze = await odczytXLSX(bajty);
    const ark = arkusze.find((a) => a.wiersze.some((w) => w.some((x) => x !== null))) || { wiersze: [] };
    const niepuste = ark.wiersze.filter((w) => w.some((x) => x !== null && x !== ""));
    const [nag = [], ...dane] = niepuste;
    const naglowki = nag.map((x) => (x === null ? "" : String(x)));
    // arkusz z jedną kolumną, w której zapisano całe wiersze CSV (np. Marki na dane.gov.pl): rozpakowujemy jak CSV
    if (naglowki.length === 1 && /[,;\t]/.test(naglowki[0]) && dane.every((w) => w.length <= 1)) {
      const csv = czytajCSV([naglowki[0], ...dane.map((w) => (w[0] === null || w[0] === undefined ? "" : String(w[0])))].join("\n"));
      return { format: "xlsx", ...csv, meta: { ...csv.meta, kodowanie: "utf-8", arkusz: ark.nazwa, zagniezdzony: true } };
    }
    return { format: "xlsx", naglowki, wiersze: tabela(naglowki, dane), meta: { kodowanie: "utf-8", arkusz: ark.nazwa } };
  }
  const { tekst, kodowanie } = dekoduj(bajty);
  const start = tekst.trimStart()[0];
  if (typ === "kml" || (!typ && start === "<")) return { ...zNaglowkami(czytajKML(tekst)), meta: { kodowanie } };
  if (typ === "json" || typ === "geojson" || typ === "osm" || (!typ && (start === "{" || start === "["))) {
    return { ...zNaglowkami(czytajJSON(JSON.parse(tekst))), meta: { kodowanie } };
  }
  const csv = czytajCSV(tekst);
  return { format: "csv", ...csv, meta: { kodowanie, ...csv.meta } };
}
