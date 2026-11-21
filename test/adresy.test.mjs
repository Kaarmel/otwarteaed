import { test } from "node:test";
import assert from "node:assert/strict";
import { kluczAdresu, adresOdwrotny, geokoduj, uzupelnijAdresy } from "../hub/adresy.mjs";

const GLOGOW = {"type":"address","returned objects":1,"results":{"1":{"city":"Głogów Małopolski","citypart":null,"street":"Rynek","number":"1A","teryt":"181606","simc":"0974328","ulic":"19253","code":"36-060","jednostka":"{Polska,podkarpackie,rzeszowski,\"Głogów Małopolski\"}","x":"21.9623927061046","y":"50.1508956153228","distance":"5.88349061225672","id":1}}};
const PUSTO = {"type":"address","returned objects":0,"results":null};
const odp = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });

test("klucz bazy adresów: 5 miejsc po przecinku", () => {
  assert.equal(kluczAdresu(50.1509467, 21.9624141), "50.15095,21.96241");
});

test("adres odwrotny z PRG: Głogów Małopolski, nie Głogów", async () => {
  const urls = [];
  const a = await adresOdwrotny(50.1509467, 21.9624141, { fetch: async (u) => { urls.push(u); return odp(GLOGOW); } });
  assert.match(urls[0], /POINT\(21\.9624141%2050\.1509467\)/);
  assert.match(urls[0], /radius=50/);
  assert.equal(a.miejscowosc, "Głogów Małopolski");
  assert.equal(a.ulica, "Rynek");
  assert.equal(a.numer, "1A");
  assert.equal(a.wojewodztwo, "podkarpackie");
  assert.equal(a.powiat, "rzeszowski");
  assert.equal(a.gmina, "Głogów Małopolski");
  assert.equal(a.teryt_gmina, "181606");
  assert.equal(a.kod_pocztowy, "36-060");
  assert.equal(a.adres_odleglosc_m, 5.9);
});

const obs = () => [{ obs_id: "osm:node/1", szerokosc: 50.1509467, dlugosc: 21.9624141, flagi: [], przeksztalcenia: [] }];

test("pusto w 50 m → drugie zapytanie 200 m i flaga adres_przyblizony", async () => {
  const urls = [];
  const o = obs();
  await uzupelnijAdresy(o, {}, { fetch: async (u) => { urls.push(u); return odp(/radius=50&|radius=50$/.test(u) ? PUSTO : GLOGOW); } });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /radius=200/);
  assert.ok(o[0].flagi.includes("adres_przyblizony"));
  assert.equal(o[0].adres_zrodlo, "PRG");
});

test("awaria GUGiK: flaga brak_adresu, bez wyjątku, wynik nie trafia do bazy", async () => {
  const o = obs(), baza = {};
  const s = await uzupelnijAdresy(o, baza, { fetch: async () => { throw new Error("timeout"); } });
  assert.ok(s.bledow > 0);
  assert.ok(o[0].flagi.includes("brak_adresu"));
  assert.deepEqual(baza, {});
});

test("drugi przebieg korzysta z bazy i nie pyta GUGiK", async () => {
  const baza = {};
  await uzupelnijAdresy(obs(), baza, { fetch: async () => odp(GLOGOW) });
  let pytania = 0;
  const o = obs();
  const s = await uzupelnijAdresy(o, baza, { fetch: async () => { pytania++; return odp(GLOGOW); } });
  assert.equal(pytania, 0);
  assert.equal(s.zapytan, 0);
  assert.equal(o[0].numer, "1A");
});

test("adres ze źródła nie jest nadpisywany, jednostki administracyjne z PRG", async () => {
  const o = [{ obs_id: "legionowo:1", szerokosc: 50.1509467, dlugosc: 21.9624141, ulica: "Piłsudskiego", numer: "41", miejscowosc: "Legionowo", flagi: [], przeksztalcenia: [] }];
  await uzupelnijAdresy(o, {}, { fetch: async () => odp(GLOGOW) });
  assert.equal(o[0].ulica, "Piłsudskiego");
  assert.equal(o[0].numer, "41");
  assert.equal(o[0].teryt_gmina, "181606");
  assert.equal(o[0].adres_zrodlo, "zrodlo");
});

test("geokodowanie rekordu bez współrzędnych (szablon mam_adresy)", async () => {
  const o = [{ obs_id: "gmina:1", szerokosc: null, dlugosc: null, adres_zrodlowy: "Rynek 1 Głogów Małopolski", flagi: ["brak_wspolrzednych"], przeksztalcenia: [] }];
  await uzupelnijAdresy(o, {}, { fetch: async () => odp({ ...GLOGOW, results: { 1: { ...GLOGOW.results[1], accuracy: "1", city_accuracy: "1" } } }) });
  assert.ok(Math.abs(o[0].szerokosc - 50.1508956) < 1e-6);
  assert.ok(o[0].flagi.includes("wspolrzedne_z_prg"));
  assert.ok(!o[0].flagi.includes("brak_wspolrzednych"));
});

test("geokoduj zwraca null przy braku wyniku", async () => {
  assert.equal(await geokoduj("Nieistniejąca 999", { fetch: async () => odp(PUSTO) }), null);
});
