import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { czytajPlik } from "../hub/czytaj.mjs";
import { wykryjProfil, normalizujNaglowek, wczytajProfile } from "../hub/wykryj.mjs";

const profile = wczytajProfile((d) => readdirSync(new URL("../" + d, import.meta.url)).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(`../${d}/${f}`, import.meta.url), "utf8"))));
const wej = (n) => new Uint8Array(readFileSync(new URL("../wejscie/" + n, import.meta.url)));

for (const [plik, id] of [["dane_resource_54632.csv", "krosno"], ["dane_resource_68353.csv", "marki"], ["dane_resource_62093.geojson", "przemysl"], ["dane_resource_2625221.csv", "legionowo"], ["osm_aed_pl.json", "osm"]]) {
  test(`${plik} → profil ${id}`, async () => {
    const r = await czytajPlik(wej(plik), plik);
    const [pierwszy] = wykryjProfil(r.naglowki, r.wiersze, profile);
    assert.equal(pierwszy.id, id);
    assert.ok(pierwszy.wynik >= 0.8, String(pierwszy.wynik));
  });
}

test("normalizacja nagłówków", () => {
  assert.equal(normalizujNaglowek("\uFEFF Szerokość_geograficzna "), "szerokosc geograficzna");
  assert.equal(normalizujNaglowek("Miejscowość"), "miejscowosc");
});

test("Krosno: kolumna ze spacją przypisana dosłownie", async () => {
  const r = await czytajPlik(wej("dane_resource_54632.csv"), "x.csv");
  const k = wykryjProfil(r.naglowki, r.wiersze, profile).find((p) => p.id === "krosno");
  assert.equal(k.mapowanie.szerokosc, "Szerokość geograficzna");
  assert.equal(k.mapowanie.nazwa_obiektu, " Lokalizacja");
});

test("plik tylko z adresami → szablon mam_adresy", () => {
  const n = ["Nazwa obiektu", "Ulica", "Nr", "Kod", "Miejscowość"];
  assert.equal(wykryjProfil(n, [{ "Nazwa obiektu": "Szkoła", Ulica: "Polna", Nr: "1", Kod: "00-001", "Miejscowość": "Wieś" }], profile)[0].id, "mam_adresy");
});

test("plik ze współrzędnymi → szablon mam_wspolrzedne", () => {
  const n = ["nazwa", "lat", "lon", "opis"];
  assert.equal(wykryjProfil(n, [{ nazwa: "A", lat: "50,1", lon: "21,9", opis: "x" }], profile)[0].id, "mam_wspolrzedne");
});

test("nieznane nazwy kolumn: współrzędne rozpoznane po treści", () => {
  const w = [{ kol1: "50,1", kol2: "21,9", kol3: "Szkoła" }, { kol1: "50,2", kol2: "21,8", kol3: "Urząd" }];
  const p = wykryjProfil(["kol1", "kol2", "kol3"], w, profile).find((x) => x.id === "mam_wspolrzedne");
  assert.equal(p.mapowanie.szerokosc, "kol1");
  assert.equal(p.mapowanie.dlugosc, "kol2");
});
