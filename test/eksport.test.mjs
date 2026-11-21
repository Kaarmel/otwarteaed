import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arkuszeWzorcowe } from "../hub/eksport.mjs";

const schemat = JSON.parse(readFileSync(new URL("../hub/schemat.json", import.meta.url), "utf8"));

test("wzorcowy zakres danych ma arkusze Pola, Słowniki, Szablony, Przykład", () => {
  const a = arkuszeWzorcowe(schemat, []);
  assert.deepEqual(a.map((x) => x.nazwa), ["Pola", "Słowniki", "Szablony", "Przykład"]);
  assert.deepEqual(a[0].wiersze[0], ["Pole", "Grupa", "Opis", "Typ", "Format", "Wymagane", "Przykład", "Odpowiednik OSM"]);
  assert.equal(a[0].wiersze.length, schemat.pola.length + 1);
  assert.ok(a[1].wiersze.some((w) => w[0] === "status_dostepnosci" && w[1] === "brak_danych"));
  assert.deepEqual(a[2].wiersze[0], ["Pole", "Szablon: mam współrzędne", "Szablon: mam tylko adresy"]);
});
