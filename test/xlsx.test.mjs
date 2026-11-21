import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { zapisXLSX, odczytXLSX } from "../hub/xlsx.mjs";

const arkusze = [
  { nazwa: "Pola", wiersze: [["nazwa", "opis"], ["szerokosc", "Szerokość <WGS84> & \"kropka\""], ["ulica", null]] },
  { nazwa: "Przykład", wiersze: [["a", "b"], [50.1509467, 21.9624141], ["Łódź", "Głogów Małopolski"]] },
];

test("zapis i odczyt xlsx zachowuje arkusze, polskie znaki, liczby i puste komórki", async () => {
  const bajty = await zapisXLSX(arkusze);
  const wynik = await odczytXLSX(bajty);
  assert.deepEqual(wynik.map((a) => a.nazwa), ["Pola", "Przykład"]);
  assert.equal(wynik[0].wiersze[1][1], 'Szerokość <WGS84> & "kropka"');
  assert.equal(wynik[0].wiersze[2][1] ?? null, null);
  assert.equal(wynik[1].wiersze[1][0], 50.1509467);
  assert.equal(wynik[1].wiersze[2][1], "Głogów Małopolski");
});

test("plik xlsx jest poprawnym archiwum zip", async () => {
  const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
  const f = join(dir, "t.xlsx");
  writeFileSync(f, await zapisXLSX(arkusze));
  const out = execFileSync("unzip", ["-t", f]).toString();
  assert.match(out, /No errors detected/);
});
