import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arkuszeWzorcowe, doCSV, doXML, doIndeksuMapy, doGeoJSON, doSzczegolow, polaZDanymi } from "../hub/eksport.mjs";
import { ocenJakosc, oznaczWspolneWspolrzedne, oznaczOdstajace } from "../hub/jakosc.mjs";
import { md5 } from "../hub/md5.mjs";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { zapewnijXSD, XSD } from "./pomoc.mjs";
import { fileURLToPath } from "node:url";

const schemat = JSON.parse(readFileSync(new URL("../hub/schemat.json", import.meta.url), "utf8"));

test("wzorcowy zakres danych ma arkusze Pola, Słowniki, Szablony, Przykład", () => {
  const a = arkuszeWzorcowe(schemat, []);
  assert.deepEqual(a.map((x) => x.nazwa), ["Pola", "Słowniki", "Szablony", "Przykład"]);
  assert.deepEqual(a[0].wiersze[0], ["Pole", "Grupa", "Opis", "Typ", "Format", "Wymagane", "Przykład", "Odpowiednik OSM"]);
  assert.equal(a[0].wiersze.length, schemat.pola.length + 1);
  assert.ok(a[1].wiersze.some((w) => w[0] === "status_dostepnosci" && w[1] === "brak_danych"));
  assert.deepEqual(a[2].wiersze[0], ["Pole", "Szablon: mam współrzędne", "Szablon: mam tylko adresy"]);
});

test("CSV: cytowanie RFC 4180, kropka dziesiętna, 6 miejsc, listy przez średnik", () => {
  const csv = doCSV([{ a: 'Szkoła, "Nr 1"', szerokosc: 50.15094671, c: ["x", "y"], d: null, e: 5.88 }], ["a", "szerokosc", "c", "d", "e"]);
  assert.equal(csv, 'a,szerokosc,c,d,e\r\n"Szkoła, ""Nr 1""",50.150947,x;y,,5.88\r\n');
});

test("CSV: neutralizacja formuł z danych zewnętrznych, telefony i liczby bez zmian", () => {
  const csv = doCSV([{ a: '=HYPERLINK("http://zly")', b: "@SUM(1)", c: "+48 17 772 09 09", d: "-5", e: "-cmd" }], ["a", "b", "c", "d", "e"]);
  assert.equal(csv.split("\r\n")[1], '"\'=HYPERLINK(""http://zly"")",\'@SUM(1),+48 17 772 09 09,-5,\'-cmd');
  const c2 = doCSV([{ a: "-1+cmd|' /C calc'!A0", b: '+1+HYPERLINK("x")', c: "+48 22 781 10 03; +48 22 228 73 77" }], ["a", "b", "c"]);
  assert.equal(c2.split("\r\n")[1], "'-1+cmd|' /C calc'!A0,\"'+1+HYPERLINK(\"\"x\"\")\",+48 22 781 10 03; +48 22 228 73 77");
});

test("CSV zgodny ze standardem dane.gov.pl: bez całkowicie pustych kolumn, „-” jako pusta komórka, CRLF", () => {
  const rek = [{ a: "x", b: null, c: "-" }, { a: "y", b: undefined, c: "n/a" }, { a: "z", b: "", c: "5" }];
  assert.deepEqual(polaZDanymi(rek, ["a", "b", "c"]), ["a", "c"]);
  assert.deepEqual(polaZDanymi([{ a: "x", c: "-" }], ["a", "c"]), ["a"]);
  const csv = doCSV(rek, polaZDanymi(rek, ["a", "b", "c"]));
  assert.equal(csv, "a,c\r\nx,\r\ny,\r\nz,5\r\n");
});

test("szczegóły dla mapy gdzieaed: podział po 2 ostatnich znakach aed_id", () => {
  const s = doSzczegolow([{ aed_id: "PL-AED-00000000ab", szerokosc: 50.15, dlugosc: 21.96, nazwa_obiektu: "Urząd", lokalizacja_opis: "hol", ulica: "Rynek", numer: "1A", miejscowosc: "Głogów Małopolski", godziny: "24/7", operator: "Gmina", potwierdzenie: "dysponent", liczba_zrodel: 2 }]);
  assert.deepEqual(Object.keys(s), ["ab"]);
  assert.deepEqual(s.ab["PL-AED-00000000ab"], { name: "Urząd", location_description: "hol", address: "Rynek 1A, Głogów Małopolski", opening_hours: "24/7", operator: "Gmina", potwierdzenie: "dysponent", liczba_zrodel: 2 });
});

test("indeks mapy: kody statusu 0 brak danych, 1 24/7, 2 godziny, 3 ograniczony", () => {
  const ix = doIndeksuMapy([{ aed_id: "PL-AED-1", szerokosc: 50.1, dlugosc: 21.9, status_dostepnosci: "ograniczony", nazwa_obiektu: "Bardzo długa nazwa obiektu, który ma AED w holu" },
    { aed_id: "PL-AED-2", szerokosc: null, dlugosc: null, status_dostepnosci: "24/7" }]);
  assert.equal(ix.length, 1);
  assert.deepEqual(ix[0].slice(0, 4), [21.9, 50.1, 3, "PL-AED-1"]);
  assert.ok(ix[0][4].length <= 28);
});

test("GeoJSON: [lon, lat], null dla braku współrzędnych", () => {
  const g = doGeoJSON([{ aed_id: "A", szerokosc: 50.1, dlugosc: 21.9 }, { aed_id: "B", szerokosc: null, dlugosc: null }], ["aed_id"]);
  assert.deepEqual(g.features[0].geometry.coordinates, [21.9, 50.1]);
  assert.equal(g.features[1].geometry, null);
});

test("ocena jakości: brak godzin nie obniża oceny, brak współrzędnych tak", () => {
  assert.equal(ocenJakosc({ status_dostepnosci: "brak_danych", flagi: [] }).ocena_jakosci, 100);
  assert.ok(ocenJakosc({ status_dostepnosci: "brak_danych", flagi: [] }).flagi_jakosci.includes("brak_danych_dostepnosci"));
  assert.ok(ocenJakosc({ flagi: ["brak_wspolrzednych"] }).ocena_jakosci < 50);
});

test("te same współrzędne przy różnych adresach są oznaczane (kopia z szablonu)", () => {
  const o = [{ obs_id: "marki:7", szerokosc: 49.7188, dlugosc: 21.7203, adres_zrodlowy: "Szkolna 9, Marki", flagi: [] },
    { obs_id: "krosno:1", szerokosc: 49.7188, dlugosc: 21.7203, adres_zrodlowy: "Jasna, Krosno", flagi: [] }];
  oznaczWspolneWspolrzedne(o);
  assert.ok(o[0].flagi.includes("te_same_wspolrzedne_rozne_adresy"));
});

test("punkt daleko od pozostałych na liście lokalnej jest oznaczany (Marki z współrzędnymi Krosna)", () => {
  const p = (id, s, d) => ({ obs_id: id, szerokosc: s, dlugosc: d, flagi: [] });
  const marki = [p("m:1", 52.3267, 21.1076), p("m:2", 52.324, 21.0982), p("m:3", 52.317, 21.1041), p("m:7", 49.7188, 21.7203), p("m:8", 52.3254, 21.1082)];
  oznaczOdstajace(marki);
  assert.deepEqual(marki.filter((o) => o.flagi.includes("daleko_od_pozostalych")).map((o) => o.obs_id), ["m:7"]);
  const kraj = [p("a", 54.3, 18.6), p("b", 50.06, 19.94), p("c", 52.23, 21.01), p("d", 51.1, 17.03)];
  oznaczOdstajace(kraj);
  assert.equal(kraj.filter((o) => o.flagi.length).length, 0);
});

test("komunikaty jakości z poprawną odmianą", async () => {
  const { raportJakosci } = await import("../hub/jakosc.mjs");
  const k = (n, f) => raportJakosci([], Array.from({ length: n }, (_, i) => ({ obs_id: "x:" + i, zrodlo: "x", flagi: [f] })), [{ id: "x", nazwa: "X" }], "d").zrodla.x.komunikat;
  assert.equal(k(3, "te_same_wspolrzedne_rozne_adresy"), "3 rekordy mają te same współrzędne co inne miejsce — prosimy o sprawdzenie.");
  assert.equal(k(5, "te_same_wspolrzedne_rozne_adresy"), "5 rekordów ma te same współrzędne co inne miejsce — prosimy o sprawdzenie.");
  assert.equal(k(1, "daleko_od_pozostalych"), "1 rekord leży daleko od pozostałych — sprawdź współrzędne.");
});

const meta = { dataDate: "2026-11-21", bazaUrl: "https://otwarteaed.pl/dane/", historia: ["2026-11-20", "2026-11-21"], zrodla: [{ atrybucja: "© współtwórcy OpenStreetMap", licencja: "ODbL-1.0" }, { atrybucja: "Urząd Miasta Krosna", licencja: "CC0-1.0" }] };

test("XML dane.gov.pl przechodzi oficjalny XSD 1.13, kategoria HEAL, extIdent ≤ 36", async (t) => {
  if (!(await zapewnijXSD())) return t.skip("brak sieci: nie można pobrać XSD z dane.gov.pl");
  const xml = doXML(meta);
  const dir = mkdtempSync(join(tmpdir(), "xml-"));
  writeFileSync(join(dir, "a.xml"), xml);
  execFileSync("xmllint", ["--noout", "--schema", fileURLToPath(XSD), join(dir, "a.xml")], { stdio: "pipe" });
  assert.match(xml, /<category>HEAL<\/category>/);
  for (const m of xml.matchAll(/<extIdent>([^<]*)<\/extIdent>/g)) assert.ok(m[1].length <= 36, m[1]);
  assert.match(xml, /aed_2026-11-20\.csv/);
  assert.match(xml, /ODbL/);
  assert.match(xml, /<dbOrCopyrightedLicenseChosen>CC BY 4.0<\/dbOrCopyrightedLicenseChosen>|ODbL/);
  assert.equal(md5(xml).length, 32);
});

test("białe plamy: gminy bez AED w zbiorze, liczone po kodzie TERYT gminy", async () => {
  const { pokrycieGmin } = await import("../hub/jakosc.mjs");
  const gminy = [{ teryt: "1434021", nazwa: "Marki" }, { teryt: "1816063", nazwa: "Głogów Małopolski" }];
  const aed = [{ teryt_gmina: "143402", szerokosc: 52.3, potwierdzenie: "dysponent" }, { teryt_gmina: "143402", szerokosc: 52.3, potwierdzenie: "spolecznosc" }, { teryt_gmina: "181606", szerokosc: null }];
  const p = pokrycieGmin(aed, gminy);
  assert.deepEqual(p.map((g) => [g.nazwa, g.aed, g.dysponent]), [["Marki", 2, 1], ["Głogów Małopolski", 0, 0]]);
});
