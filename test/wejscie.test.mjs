import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const pliki = ["osm_aed_pl.json","dane_resource_54632.csv","dane_resource_62093.geojson","dane_resource_68353.csv","dane_resource_2625221.csv","osm_pobranie_log.json"];

test("wejscie zawiera wszystkie zamrożone pliki źródłowe", () => {
  for (const n of pliki) assert.ok(existsSync(new URL("../wejscie/" + n, import.meta.url)), n);
});
