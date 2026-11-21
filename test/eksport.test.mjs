import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arkuszeWzorcowe, doCSV, doXML, doIndeksuMapy, doGeoJSON } from "../hub/eksport.mjs";
import { ocenJakosc, oznaczWspolneWspolrzedne } from "../hub/jakosc.mjs";
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
  assert.equal(csv, 'a,szerokosc,c,d,e\n"Szkoła, ""Nr 1""",50.150947,x;y,,5.88\n');
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
