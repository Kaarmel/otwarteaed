import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { przebiegKreatora, slug } from "../otwarteaed/kreator.mjs";
import { md5 } from "../hub/md5.mjs";
import { parsujCSV } from "../hub/czytaj.mjs";
import { zapewnijXSD, XSD } from "./pomoc.mjs";

const czytajKat = (d) => readdirSync(new URL("../" + d, import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(`../${d}/${f}`, import.meta.url), "utf8")));
const profile = [...czytajKat("zrodla"), ...czytajKat("szablony")];
const schemat = JSON.parse(readFileSync(new URL("../hub/schemat.json", import.meta.url), "utf8"));
const marki = new Uint8Array(readFileSync(new URL("../wejscie/dane_resource_68353.csv", import.meta.url)));
const dysponent = { nazwa: "Urząd Miasta Marki", url: "https://marki.pl/aed/", licencja: "CC BY 4.0" };

test("slug: ASCII, bez polskich znaków", () => assert.equal(slug("Urząd Miasta Łódź"), "urzad_miasta_lodz"));

test("kreator: Marki rozpoznane, osie naprawione, CSV w wzorcowym zakresie, XML przechodzi XSD, MD5 zgodne", async (t) => {
  const w = await przebiegKreatora({ bajty: marki, nazwa: "marki.csv", profile, schemat, dysponent, fetch: null, data: "2026-11-21" });
  assert.equal(w.propozycje[0].id, "marki");
  assert.equal(w.raport.zrodla[w.profil.id].flagi.zamienione_osie, 7);
  const [nag, ...wiersze] = parsujCSV(w.pliki.csv, ",");
  assert.equal(wiersze.length, 8);
  assert.ok(nag.includes("szerokosc") && nag.includes("nazwa_obiektu") && !nag.includes("surowe"));
  assert.equal(w.pliki.md5, md5(w.pliki.xml) + "\n");
  assert.match(w.pliki.xml, /https:\/\/marki\.pl\/aed\/aed_urzad_miasta_marki_2026-11-21\.csv/);
  assert.equal(w.pliki.nazwaCSV, "aed_urzad_miasta_marki_2026-11-21.csv");
  if (!(await zapewnijXSD())) return t.skip("brak XSD");
  const dir = mkdtempSync(join(tmpdir(), "kr-"));
  writeFileSync(join(dir, "g.xml"), w.pliki.xml);
  execFileSync("xmllint", ["--noout", "--schema", fileURLToPath(XSD), join(dir, "g.xml")], { stdio: "pipe" });
});

test("kreator: ręczne mapowanie użytkownika ma pierwszeństwo", async () => {
  const csv = new TextEncoder().encode("a;b;c\nSzkoła;50,1;21,9\n");
  const w = await przebiegKreatora({ bajty: csv, nazwa: "x.csv", profile, schemat, dysponent, fetch: null, data: "2026-11-21", mapowanie: { nazwa_obiektu: "a", szerokosc: "b", dlugosc: "c" } });
  assert.equal(w.obserwacje[0].nazwa_obiektu, "Szkoła");
  assert.equal(w.obserwacje[0].szerokosc, 50.1);
});
