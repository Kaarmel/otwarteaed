// Kontrola wyniku przed wdrożeniem (walidacja do autonaprawy w GitHub Actions):
// XML zgodny z XSD portalu, suma MD5, pliki czytelne i spójne, brak gwałtownego spadku liczby AED lub rekordów źródła.
// Użycie: node hub/sprawdz.mjs [--katalog otwarteaed/dane] [--poprzedni jakosc.json] [--xsd plik.xsd]. Kod wyjścia 1 = nie wdrażać.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { md5 } from "./md5.mjs";
import { parsujCSV } from "./czytaj.mjs";
import { odczytXLSX } from "./xlsx.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const KAT = arg("--katalog", join(ROOT, "otwarteaed/dane"));
const POPRZEDNI = arg("--poprzedni", null);
const XSD = arg("--xsd", join(ROOT, ".cache/otwarte_dane_latest.xsd"));
const bledy = [], uwagi = [];
const wymagaj = (ok, opis) => { if (!ok) bledy.push(opis); };
const czytaj = (n) => readFileSync(join(KAT, n));

try {
  const jak = JSON.parse(czytaj("jakosc.json"));
  // 1. XML dla dane.gov.pl: schemat portalu i suma MD5
  const xml = czytaj("dane_gov_pl.xml");
  wymagaj(czytaj("dane_gov_pl.md5").toString().trim() === md5(xml), "suma MD5 nie zgadza się z dane_gov_pl.xml");
  if (!existsSync(XSD)) {
    try {
      const r = await fetch("https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd", { signal: AbortSignal.timeout(30000) });
      if (r.ok) { mkdirSync(dirname(XSD), { recursive: true }); writeFileSync(XSD, Buffer.from(await r.arrayBuffer())); }
    } catch {}
  }
  if (existsSync(XSD)) {
    try { execFileSync("xmllint", ["--noout", "--schema", XSD, join(KAT, "dane_gov_pl.xml")], { stdio: "pipe" }); }
    catch (e) { bledy.push("XML niezgodny ze schematem dane.gov.pl: " + String(e.stderr || e.message).split("\n").slice(0, 3).join(" ")); }
  } else uwagi.push("brak XSD (brak sieci) — pominięto walidację schematu");
  // 2. Pliki danych czytelne i spójne z raportem
  const csv = parsujCSV(czytaj("aed.csv").toString(), ",");
  wymagaj(csv[0]?.includes("aed_id") && csv[0]?.includes("szerokosc"), "aed.csv bez nagłówka wzorca");
  wymagaj(csv.length - 1 === jak.aed, `aed.csv: ${csv.length - 1} wierszy, raport: ${jak.aed}`);
  // Standard techniczny dane.gov.pl (CSV): RFC 4180 (CRLF), równa liczba komórek, bez pustych nagłówków i całkowicie pustych kolumn.
  for (const plik of ["aed.csv", "aed_dysponenci.csv"]) {
    const tekst = czytaj(plik).toString();
    const t = parsujCSV(tekst, ",");
    wymagaj(/\r\n/.test(tekst.slice(0, 5000)) && !/[^\r]\n/.test(tekst.slice(0, 5000)), `${plik}: końce linii nie są CRLF (RFC 4180)`);
    wymagaj(t.every((w) => w.length === t[0].length), `${plik}: wiersze mają różną liczbę komórek`);
    wymagaj(t[0].every((n) => n.trim()), `${plik}: pusty nagłówek kolumny`);
    const puste = t[0].filter((_, i) => t.slice(1).every((w) => !String(w[i] ?? "").trim()));
    wymagaj(!puste.length, `${plik}: całkowicie puste kolumny: ${puste.join(", ")}`);
  }
  const ids = new Set(csv.slice(1).map((w) => w[0]));
  wymagaj(ids.size === csv.length - 1, "powtórzone aed_id w aed.csv");
  const geo = JSON.parse(czytaj("aed.geojson"));
  wymagaj(geo.features?.length === jak.aed, "aed.geojson: inna liczba obiektów niż w raporcie");
  const mapa = JSON.parse(czytaj("aed_mapa.json"));
  wymagaj(mapa.length === jak.aed_na_mapie, "aed_mapa.json: inna liczba punktów niż w raporcie");
  const xlsx = await odczytXLSX(new Uint8Array(czytaj("aed.xlsx")));
  wymagaj(xlsx[0]?.wiersze.length - 1 === jak.aed, "aed.xlsx: inna liczba wierszy niż w raporcie");
  wymagaj(jak.aed > 1000, "podejrzanie mało AED: " + jak.aed);
  // 3. Brak gwałtownego spadku względem poprzedniego, wdrożonego przebiegu
  if (POPRZEDNI && existsSync(POPRZEDNI)) {
    const pop = JSON.parse(readFileSync(POPRZEDNI, "utf8"));
    wymagaj(jak.aed >= 0.9 * pop.aed, `spadek liczby AED o ponad 10%: ${pop.aed} → ${jak.aed}`);
    for (const [id, z] of Object.entries(pop.zrodla || {})) {
      const teraz = jak.zrodla?.[id]?.obserwacji ?? 0;
      wymagaj(teraz >= 0.5 * z.obserwacji, `źródło ${id}: ${z.obserwacji} → ${teraz} rekordów`);
    }
  }
} catch (e) { bledy.push("nie da się odczytać wyniku: " + e.message); }

for (const u of uwagi) console.error("[sprawdz] uwaga:", u);
if (bledy.length) { for (const b of bledy) console.error("[sprawdz] BŁĄD:", b); process.exit(1); }
console.error("[sprawdz] wynik poprawny");
