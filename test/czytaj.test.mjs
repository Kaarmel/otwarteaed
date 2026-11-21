import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { czytajPlik } from "../hub/czytaj.mjs";
import { zapisXLSX } from "../hub/xlsx.mjs";

const wej = (n) => new Uint8Array(readFileSync(new URL("../wejscie/" + n, import.meta.url)));

test("Marki: CSV zapisany wewnątrz jednej kolumny jest rozpakowany", async () => {
  const r = await czytajPlik(wej("dane_resource_68353.csv"), "dane_resource_68353.csv");
  assert.equal(r.meta.zagniezdzony, true);
  assert.equal(r.wiersze.length, 8);
  assert.ok(r.naglowki.includes(" Numer Id"));
  assert.equal(r.wiersze[0][" Numer Id"], "1");
});

test("Krosno: 21 wierszy, nagłówki ze spacjami zachowane dosłownie", async () => {
  const r = await czytajPlik(wej("dane_resource_54632.csv"), "x.csv");
  assert.equal(r.wiersze.length, 21);
  assert.ok(r.naglowki.includes(" Lokalizacja"));
});

test("Legionowo: BOM usunięty z pierwszego nagłówka", async () => {
  const r = await czytajPlik(wej("dane_resource_2625221.csv"), "x.csv");
  assert.equal(r.naglowki[0], "nazwa");
  assert.equal(r.wiersze.length, 24);
});

test("Przemyśl GeoJSON: współrzędne z geometrii Point", async () => {
  const r = await czytajPlik(wej("dane_resource_62093.geojson"), "x.geojson");
  assert.equal(r.format, "geojson");
  assert.equal(r.wiersze.length, 21);
  for (const w of r.wiersze) { assert.equal(typeof w.__lon, "number"); assert.equal(typeof w.__lat, "number"); }
});

test("OSM: 18 301 obiektów z identyfikatorem i współrzędnymi", async () => {
  const r = await czytajPlik(wej("osm_aed_pl.json"), "osm_aed_pl.json");
  assert.equal(r.format, "osm");
  assert.equal(r.wiersze.length, 18301);
  assert.match(r.wiersze[0].__id, /^(node|way)\/\d+$/);
  assert.ok(r.wiersze.every((w) => typeof w.__lat === "number"));
});

test("Windows-1250 ze średnikiem i przecinkiem dziesiętnym", async () => {
  // "nazwa;szer\nŁódź;51,77" w Windows-1250: Ł=0xA3, ó=0xF3, ź=0x9F
  const b = new Uint8Array([...new TextEncoder().encode("nazwa;szer\n"), 0xa3, 0xf3, 0x64, 0x9f, ...new TextEncoder().encode(";51,77\n")]);
  const r = await czytajPlik(b, "gmina.csv");
  assert.equal(r.meta.kodowanie, "windows-1250");
  assert.equal(r.meta.separator, ";");
  assert.equal(r.wiersze[0].nazwa, "Łódź");
  assert.equal(r.wiersze[0].szer, "51,77");
});

test("XLSX od gminy: pierwszy niepusty wiersz to nagłówek", async () => {
  const b = await zapisXLSX([{ nazwa: "AED", wiersze: [[], ["nazwa_obiektu", "szerokosc"], ["Szkoła", 50.1]] }]);
  const r = await czytajPlik(b, "lista.xlsx");
  assert.equal(r.format, "xlsx");
  assert.deepEqual(r.naglowki, ["nazwa_obiektu", "szerokosc"]);
  assert.equal(r.wiersze[0].szerokosc, 50.1);
});

test("KML: Placemark z nazwą i punktem", async () => {
  const kml = '<?xml version="1.0"?><kml><Document><Placemark><name>AED Rynek</name><description>przy wejściu</description><Point><coordinates>19.45,51.77,0</coordinates></Point></Placemark></Document></kml>';
  const r = await czytajPlik(new TextEncoder().encode(kml), "lodz.kml");
  assert.equal(r.format, "kml");
  assert.equal(r.wiersze[0].name, "AED Rynek");
  assert.equal(r.wiersze[0].__lon, 19.45);
  assert.equal(r.wiersze[0].__lat, 51.77);
});

test("JSON jako lista obiektów GeoJSON bez FeatureCollection (API Warszawy, także w polu result)", async () => {
  const { czytajPlik } = await import("../hub/czytaj.mjs");
  const lista = [{ geometry: { coordinates: [[21.0148748892902, 52.2086170695684]], type: "Point" }, properties: { defibrillator_id: "622", location_street: "Rakowiecka", location_building: "25/27" } }];
  for (const dane of [lista, { success: true, result: lista }]) {
    const r = await czytajPlik(new TextEncoder().encode(JSON.stringify(dane)), "w.json");
    assert.equal(r.wiersze.length, 1);
    assert.equal(r.wiersze[0].defibrillator_id, "622");
    assert.equal(r.wiersze[0].__lat, 52.2086170695684);
    assert.equal(r.wiersze[0].__lon, 21.0148748892902);
  }
});
