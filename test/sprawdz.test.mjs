import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { zapewnijXSD, XSD } from "./pomoc.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DANE = join(ROOT, "otwarteaed/dane");
const PLIKI = ["dane_gov_pl.xml", "dane_gov_pl.md5", "aed.csv", "aed.geojson", "aed_mapa.json", "aed.xlsx", "jakosc.json"];
const kopia = () => { const d = mkdtempSync(join(tmpdir(), "spr-")); for (const f of PLIKI) copyFileSync(join(DANE, f), join(d, f)); return d; };
const sprawdz = (kat, ...dod) => { try { execFileSync("node", ["hub/sprawdz.mjs", "--katalog", kat, "--xsd", fileURLToPath(XSD), ...dod], { cwd: ROOT, stdio: "pipe" }); return 0; } catch (e) { return e.status; } };

test("kontrola przed wdrożeniem: poprawny wynik przechodzi, zepsuty nie", { timeout: 120000 }, async (t) => {
  if (!(await zapewnijXSD())) return t.skip("brak sieci: nie można pobrać XSD");
  const ok = kopia();
  assert.equal(sprawdz(ok), 0);
  const zlaSuma = kopia();
  writeFileSync(join(zlaSuma, "dane_gov_pl.md5"), "0".repeat(32) + "\n");
  assert.equal(sprawdz(zlaSuma), 1);
  const zlyXml = kopia();
  writeFileSync(join(zlyXml, "dane_gov_pl.xml"), readFileSync(join(DANE, "dane_gov_pl.xml"), "utf8").replace("<category>HEAL</category>", "<category>ZLA</category>"));
  assert.equal(sprawdz(zlyXml), 1);
  const spadek = join(mkdtempSync(join(tmpdir(), "pop-")), "jakosc.json");
  const jak = JSON.parse(readFileSync(join(DANE, "jakosc.json"), "utf8"));
  writeFileSync(spadek, JSON.stringify({ ...jak, aed: jak.aed * 2 }));
  assert.equal(sprawdz(ok, "--poprzedni", spadek), 1);
});
