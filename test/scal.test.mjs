import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { md5 } from "../hub/md5.mjs";
import { scal, odlegloscM } from "../hub/scal.mjs";

test("md5 zgodne z RFC 1321 i node:crypto (UTF-8)", () => {
  assert.equal(md5("abc"), "900150983cd24fb0d6963f7d28e17f72");
  assert.equal(md5(""), "d41d8cd98f00b204e9800998ecf8427e");
  for (let i = 0; i < 300; i++) {
    const s = randomBytes(i % 130).toString("base64") + "Łódź ąę 🫀".repeat(i % 3);
    assert.equal(md5(s), createHash("md5").update(s, "utf8").digest("hex"));
  }
});

const o = (obs_id, szer, dl, extra = {}) => ({ obs_id, zrodlo: obs_id.split(":")[0], potwierdzenie: obs_id.startsWith("osm") ? "spolecznosc" : "dysponent",
  szerokosc: szer, dlugosc: dl, flagi: [], przeksztalcenia: [], status_dostepnosci: "brak_danych", ...extra });
const PRG = { simc: "0974328", ulic: "19253", numer: "1A" };
const przesun = (m) => m / 111320; // metry → stopnie szerokości

test("odległość haversine", () => {
  assert.ok(Math.abs(odlegloscM({ szerokosc: 50, dlugosc: 20 }, { szerokosc: 50 + przesun(100), dlugosc: 20 }) - 100) < 0.5);
});

test("różne źródła, 10 m, ten sam punkt PRG → jeden AED z dwoma źródłami", () => {
  const a = scal([o("krosno:1", 50.15, 21.96, PRG), o("osm:node/1", 50.15 + przesun(10), 21.96, PRG)]);
  assert.equal(a.length, 1);
  assert.equal(a[0].liczba_zrodel, 2);
  assert.deepEqual([...a[0].zrodla].sort(), ["krosno:1", "osm:node/1"]);
});

test("to samo źródło, identyczne współrzędne → dwa AED (dwa urządzenia w budynku)", () => {
  assert.equal(scal([o("marki:5", 52.322235, 21.105177), o("marki:6", 52.322235, 21.105177)]).length, 2);
});

test("200 m → dwa AED", () => {
  assert.equal(scal([o("krosno:1", 50.15, 21.96), o("osm:node/1", 50.15 + przesun(200), 21.96)]).length, 2);
});

test("konflikt: wygrywa dysponent, wartość OSM w konfliktach; puste uzupełnia OSM", () => {
  const [a] = scal([o("osm:node/1", 50.15, 21.96, { ...PRG, godziny: "24/7", telefon: "+48 1" }), o("krosno:1", 50.15, 21.96, { ...PRG, godziny: "Mo-Fr 08:00-16:00" })]);
  assert.equal(a.godziny, "Mo-Fr 08:00-16:00");
  assert.equal(a.telefon, "+48 1");
  assert.ok(a.konflikty.includes("godziny: 24/7 (osm:node/1)"));
  assert.equal(a.potwierdzenie, "dysponent");
  assert.equal(a.status_dostepnosci, "godziny");
});

test("łańcuch nie skleja dwóch obserwacji z jednego źródła", () => {
  const a = scal([o("osm:node/1", 50.15, 21.96, PRG), o("krosno:1", 50.15 + przesun(8), 21.96, PRG), o("osm:node/2", 50.15 + przesun(16), 21.96, PRG)]);
  assert.equal(a.length, 2);
});

test("nic nie ginie, identyfikatory deterministyczne", () => {
  const wej = [o("krosno:1", 50.15, 21.96, PRG), o("osm:node/1", 50.15, 21.96, PRG), o("osm:node/9", 51, 20), o("x:1", null, null)];
  const a1 = scal(wej.map((x) => ({ ...x }))), a2 = scal(wej.map((x) => ({ ...x })).reverse());
  assert.equal(a1.reduce((s, a) => s + a.zrodla.length, 0), wej.length);
  assert.deepEqual(a1.map((a) => a.aed_id).sort(), a2.map((a) => a.aed_id).sort());
  assert.match(a1[0].aed_id, /^PL-AED-[0-9a-f]{10}$/);
});
