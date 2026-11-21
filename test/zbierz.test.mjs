import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const uruchom = (wyj) => execFileSync("node", ["hub/zbierz.mjs", "--offline", "--bez-zapytan", "--wyjscie", wyj, "--data", "2026-11-21"], { cwd: ROOT, stdio: "pipe", timeout: 300000 });
import { parsujCSV } from "../hub/czytaj.mjs";
const wiersze = (p) => parsujCSV(readFileSync(p, "utf8"), ",").length - 1;

test("zbierz offline: komplet plików, nic nie ginie, wynik powtarzalny", { timeout: 600000 }, () => {
  const a = mkdtempSync(join(tmpdir(), "zb-")), b = mkdtempSync(join(tmpdir(), "zb-"));
  uruchom(a); uruchom(b);
  for (const f of ["aed.csv", "aed_2026-11-21.csv", "aed_obserwacje.csv", "aed_dysponenci.csv", "aed.geojson", "aed.xlsx", "aed_mapa.json", "jakosc.json", "zrodla.json", "dane_gov_pl.xml", "dane_gov_pl.md5", "SHA256SUMS", "wzorcowy_zakres_danych.xlsx"])
    readFileSync(join(a, f));
  assert.equal(wiersze(join(a, "aed_obserwacje.csv")), 18375 + 278 + 708); // + 278 pojazdów ZTM Gdańsk, + 708 AED z API Warszawy
  const n = wiersze(join(a, "aed.csv"));
  assert.ok(n > 18000 && n < 19361, String(n));
  assert.equal(readFileSync(join(a, "SHA256SUMS"), "utf8"), readFileSync(join(b, "SHA256SUMS"), "utf8"));
  const marki = parsujCSV(readFileSync(join(a, "aed_obserwacje.csv"), "utf8"), ",").filter((w) => w[0].startsWith("marki:") && w.join(",").includes("zamiana osi"));
  assert.equal(marki.length, 7);
  const md5 = readFileSync(join(a, "dane_gov_pl.md5"), "utf8");
  assert.match(md5, /^[0-9a-f]{32}\n$/);
});
