import { test } from "node:test";
import assert from "node:assert/strict";
import { rozwinAdres, kandydaciAdresow, pobierzNajnowszy } from "../hub/pobierz.mjs";

test("adres z datą w nazwie: różne zapisy daty", () => {
  assert.equal(rozwinAdres("https://bip.gmina.pl/aed_{RRRR-MM-DD}.csv", "2026-11-21"), "https://bip.gmina.pl/aed_2026-11-21.csv");
  assert.equal(rozwinAdres("https://x.pl/{RRRR}/{MM}/aed_{RRRRMMDD}.csv", "2026-01-05"), "https://x.pl/2026/01/aed_20260105.csv");
  assert.equal(rozwinAdres("https://x.pl/aed_{DD}.{MM}.{RRRR}.xlsx", "2026-11-21"), "https://x.pl/aed_21.11.2026.xlsx");
  assert.equal(rozwinAdres("https://x.pl/aed.csv", "2026-11-21"), "https://x.pl/aed.csv");
});

test("kandydaci: od dziś wstecz, bez powtórzeń (plik miesięczny daje jeden adres na miesiąc)", () => {
  const k = kandydaciAdresow("https://x.pl/aed_{RRRR-MM-DD}.csv", "2026-11-21", 3);
  assert.deepEqual(k, ["https://x.pl/aed_2026-11-21.csv", "https://x.pl/aed_2026-11-20.csv", "https://x.pl/aed_2026-11-19.csv", "https://x.pl/aed_2026-11-18.csv"]);
  assert.deepEqual(kandydaciAdresow("https://x.pl/aed_{RRRR}-{MM}.csv", "2026-11-21", 31), ["https://x.pl/aed_2026-11.csv", "https://x.pl/aed_2026-10.csv"]);
  assert.deepEqual(kandydaciAdresow("https://x.pl/aed_{RRRR-MM-DD}.csv", "2026-03-01", 1), ["https://x.pl/aed_2026-03-01.csv", "https://x.pl/aed_2026-02-28.csv"]);
});

test("pobierzNajnowszy bierze pierwszy istniejący plik", async () => {
  const pytania = [];
  const fetch = async (u) => { pytania.push(u); return u.endsWith("19.csv") ? { ok: true, arrayBuffer: async () => new TextEncoder().encode("a,b").buffer } : { ok: false, status: 404 }; };
  const r = await pobierzNajnowszy("https://x.pl/aed_{RRRR-MM-DD}.csv", "2026-11-21", { fetch, dni: 7 });
  assert.equal(r.url, "https://x.pl/aed_2026-11-19.csv");
  assert.equal(new TextDecoder().decode(r.bajty), "a,b");
  assert.equal(pytania.length, 3);
  await assert.rejects(pobierzNajnowszy("https://x.pl/aed_{RRRR-MM-DD}.csv", "2026-11-21", { fetch: async () => ({ ok: false, status: 404 }), dni: 2 }), /nie znaleziono/);
});
