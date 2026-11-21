#!/usr/bin/env node
// Harvester otwarte AED: profile źródeł → pobranie/odczyt → normalizacja → adresy PRG → scalanie → jakość → pliki wynikowe.
// Użycie: node hub/zbierz.mjs [--offline] [--bez-zapytan] [--wyjscie otwarteaed/dane] [--data RRRR-MM-DD] [--baza-url https://otwarteaed.pl/dane/]
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { pobierzNajnowszy } from "./pobierz.mjs";
import { createHash } from "node:crypto";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { czytajPlik } from "./czytaj.mjs";
import { wykryjProfil } from "./wykryj.mjs";
import { normalizujWiersz } from "./normalizuj.mjs";
import { uzupelnijAdresy, ATRYBUCJA_PRG } from "./adresy.mjs";
import { scal } from "./scal.mjs";
import { ocenJakosc, oznaczWspolneWspolrzedne, oznaczOdstajace, raportJakosci, OPISY } from "./jakosc.mjs";
import { doCSV, doGeoJSON, doIndeksuMapy, doXML, doXLSX, arkuszeWzorcowe, doSzczegolow } from "./eksport.mjs";
import { md5 } from "./md5.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const flaga = (n) => process.argv.includes(n);
const OFFLINE = flaga("--offline"), BEZ_ZAPYTAN = flaga("--bez-zapytan");
const W = arg("--wyjscie", "otwarteaed/dane");
const wyj = isAbsolute(W) ? W : join(ROOT, W);
const DATA = arg("--data", new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }));
const BAZA_URL = arg("--baza-url", "https://otwarteaed.pl/dane/");
const log = (...a) => console.error("[zbierz]", ...a);

const czytajJSONy = (d) => readdirSync(join(ROOT, d)).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(ROOT, d, f), "utf8")));
const schemat = JSON.parse(readFileSync(join(ROOT, "hub/schemat.json"), "utf8"));
const zrodlaProfile = czytajJSONy("zrodla"), szablony = czytajJSONy("szablony");
mkdirSync(wyj, { recursive: true });
const zapisz = (n, dane) => writeFileSync(join(wyj, n), dane);

async function pobierzZrodlo(p) {
  const lokalny = () => (p.pobierz.plik ? { bajty: new Uint8Array(readFileSync(join(ROOT, p.pobierz.plik))), skad: p.pobierz.plik } : null);
  if (OFFLINE || !(p.pobierz.dane_gov_pl || p.pobierz.url)) return lokalny();
  try {
    if (p.pobierz.url) { const r = await pobierzNajnowszy(p.pobierz.url, DATA, { dni: p.pobierz.dni_wstecz ?? 31 }); return { bajty: r.bajty, skad: r.url }; }
    const { zbior, format } = p.pobierz.dane_gov_pl;
    const r = await fetch(`https://api.dane.gov.pl/1.4/datasets/${zbior}/resources?per_page=50`, { signal: AbortSignal.timeout(20000) }).then((x) => x.json());
    const z = r.data.map((d) => d.attributes).filter((a) => (a.format || "").toLowerCase() === format).sort((a, b) => String(b.data_date).localeCompare(String(a.data_date)))[0];
    const url = z?.download_url || z?.file_url || z?.link;
    if (!url) throw new Error("brak zasobu " + format);
    const b = new Uint8Array(await (await fetch(url, { signal: AbortSignal.timeout(60000) })).arrayBuffer());
    return { bajty: b, skad: url };
  } catch (e) { log(p.id, "pobieranie nieudane:", e.message, p.pobierz.plik ? "— używam pliku lokalnego" : "— pomijam źródło"); return lokalny(); }
}

const obserwacje = [], zrodlaInfo = [];
for (const p of zrodlaProfile) {
  const pobrane = await pobierzZrodlo(p);
  if (!pobrane) { log(p.id, "brak danych — źródło pominięte w tym przebiegu"); continue; }
  const { bajty, skad } = pobrane;
  const r = await czytajPlik(bajty, skad, p.format);
  const [w] = wykryjProfil(r.naglowki, r.wiersze, [p]);
  const profil = { ...p, data_pobrania: DATA };
  const nowe = r.wiersze.map((wiersz, i) => normalizujWiersz(wiersz, profil, w.mapowanie, i));
  oznaczOdstajace(nowe);
  obserwacje.push(...nowe);
  zrodlaInfo.push({ id: p.id, nazwa: p.nazwa, potwierdzenie: p.potwierdzenie, licencja: p.licencja, licencja_url: p.licencja_url, atrybucja: p.atrybucja,
    url_zrodla: p.url_zrodla, data_danych: p.data_danych, data_pobrania: DATA, plik: skad.startsWith("http") ? skad : p.pobierz.plik,
    sha256_wejscia: createHash("sha256").update(bajty).digest("hex"), rekordow: r.wiersze.length, format: r.format, kodowanie: r.meta.kodowanie,
    zgodnosc_profilu: w.wynik, mapowanie: w.mapowanie });
  log(p.id, r.wiersze.length, "rekordów", r.format, r.meta.kodowanie);
}

oznaczWspolneWspolrzedne(obserwacje);
const plikBazy = join(ROOT, "baza/adresy_prg.json");
const baza = existsSync(plikBazy) ? JSON.parse(readFileSync(plikBazy, "utf8")) : {};
const s = await uzupelnijAdresy(obserwacje, baza, { fetch: BEZ_ZAPYTAN || OFFLINE ? null : fetch });
log("adresy PRG:", JSON.stringify(s));
if (s.zapytan) { mkdirSync(dirname(plikBazy), { recursive: true }); writeFileSync(plikBazy, JSON.stringify(Object.fromEntries(Object.entries(baza).sort()))); }

for (const o of obserwacje) Object.assign(o, ocenJakosc(o));
const aed = scal(obserwacje);
for (const a of aed) { Object.assign(a, ocenJakosc(a)); a.data_pobrania = DATA; }

const POLA = schemat.pola.map((p) => p.nazwa);
const POLA_OBS = ["obs_id", "zrodlo", ...POLA.filter((p) => !["aed_id", "zrodla", "liczba_zrodel", "konflikty"].includes(p)), "przeksztalcenia", "surowe"];
const aedCSV = doCSV(aed, POLA);
zapisz("aed.csv", aedCSV);
zapisz(`aed_${DATA}.csv`, aedCSV);
zapisz("aed_obserwacje.csv", doCSV(obserwacje, POLA_OBS));
const dysp = obserwacje.filter((o) => o.potwierdzenie === "dysponent");
const dyspCSV = doCSV(dysp, POLA_OBS.filter((p) => p !== "surowe"));
zapisz("aed_dysponenci.csv", dyspCSV);
zapisz(`aed_dysponenci_${DATA}.csv`, dyspCSV);
zapisz("aed.geojson", JSON.stringify(doGeoJSON(aed, POLA)));
zapisz("aed_mapa.json", JSON.stringify(doIndeksuMapy(aed)));

const raport = raportJakosci(aed, obserwacje, zrodlaProfile, DATA);
zapisz("jakosc.json", JSON.stringify(raport, null, 1));
const zrodlaJSON = { data: DATA, zrodla: [...zrodlaInfo, { id: "prg", nazwa: "PRG — punkty adresowe (GUGiK, usługa UUG)", atrybucja: ATRYBUCJA_PRG, url_zrodla: "https://services.gugik.gov.pl/uug/" }],
  uwaga: "Licencje zachowane dla każdego rekordu (pole licencja). Zbiór zintegrowany zawiera dane OpenStreetMap na ODbL 1.0 — całość nie jest CC0." };
zapisz("zrodla.json", JSON.stringify(zrodlaJSON, null, 1));

const historiaPlik = join(wyj, "historia.json");
const historia = [...new Set([...(existsSync(historiaPlik) ? JSON.parse(readFileSync(historiaPlik, "utf8")) : []), DATA])].sort();
zapisz("historia.json", JSON.stringify(historia));
const xml = doXML({ dataDate: DATA, bazaUrl: BAZA_URL, historia, zrodla: zrodlaInfo });
zapisz("dane_gov_pl.xml", xml);
zapisz("dane_gov_pl.md5", md5(xml) + "\n");

const tabela = (pola, rek) => [pola, ...rek.map((r) => pola.map((p) => { const v = r[p]; return Array.isArray(v) ? v.join(";") : v && typeof v === "object" ? JSON.stringify(v) : v ?? null; }))];
zapisz("aed.xlsx", await doXLSX([
  { nazwa: "AED", wiersze: tabela(POLA, aed) },
  { nazwa: "Obserwacje", wiersze: tabela(POLA_OBS.filter((p) => p !== "surowe"), obserwacje) },
  { nazwa: "Źródła", wiersze: tabela(["id", "nazwa", "potwierdzenie", "licencja", "atrybucja", "url_zrodla", "data_danych", "data_pobrania", "rekordow", "format", "kodowanie", "zgodnosc_profilu", "sha256_wejscia"], zrodlaInfo) },
  { nazwa: "Jakość", wiersze: [["Źródło", "Obserwacji", "Średnia ocena", "Komunikat"], ...Object.entries(raport.zrodla).map(([id, z]) => [z.nazwa, z.obserwacji, z.srednia_ocena, z.komunikat]),
    [], ["Flaga", "Opis", "Waga"], ...Object.entries(OPISY).map(([f, o]) => [f, o, raport.wagi_flag[f]])] },
  { nazwa: "Słownik pól", wiersze: arkuszeWzorcowe(schemat, [])[0].wiersze },
]));
const przyklady = aed.filter((a) => a.liczba_zrodel > 1 && a.ulica).slice(0, 5);
zapisz("wzorcowy_zakres_danych.xlsx", await doXLSX(arkuszeWzorcowe(schemat, przyklady)));

mkdirSync(join(wyj, "szablony"), { recursive: true });
for (const sz of szablony) {
  const pola = schemat.pola.filter((p) => p.szablony?.[sz.id]).sort((a, b) => (a.szablony[sz.id] === "wymagane" ? 0 : 1) - (b.szablony[sz.id] === "wymagane" ? 0 : 1)).map((p) => p);
  const przyklad = Object.fromEntries(pola.map((p) => [p.nazwa, p.przyklad ?? null]));
  writeFileSync(join(wyj, "szablony", `szablon_${sz.id}.csv`), doCSV([przyklad], pola.map((p) => p.nazwa)));
  writeFileSync(join(wyj, "szablony", `szablon_${sz.id}.xlsx`), await doXLSX([{ nazwa: sz.nazwa, wiersze: [pola.map((p) => p.nazwa), pola.map((p) => p.przyklad ?? null)] },
    { nazwa: "Opis pól", wiersze: [["Pole", "Wymagane", "Opis", "Format"], ...pola.map((p) => [p.nazwa, p.szablony[sz.id] === "wymagane" ? "tak" : "nie", p.opis, p.format ?? ((p.slownik || []).join(" | ") || null)])] }]));
}

const pliki = [];
const zbierzPliki = (d, pref = "") => { for (const f of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (f.isDirectory()) zbierzPliki(join(d, f.name), pref + f.name + "/"); else if (f.name !== "SHA256SUMS" && !f.name.startsWith(".")) pliki.push(pref + f.name); } };
zbierzPliki(wyj);
zapisz("SHA256SUMS", pliki.map((f) => createHash("sha256").update(readFileSync(join(wyj, f))).digest("hex") + "  " + f).join("\n") + "\n");

if (wyj === join(ROOT, "otwarteaed/dane")) {
  writeFileSync(join(ROOT, "otwarteaed/profile.json"), JSON.stringify([...zrodlaProfile, ...szablony]));
  mkdirSync(join(ROOT, "public/dane"), { recursive: true });
  for (const f of ["aed_mapa.json", "zrodla.json", "jakosc.json"]) copyFileSync(join(wyj, f), join(ROOT, "public/dane", f));
  const katSz = join(ROOT, "public/dane/szczegoly");
  rmSync(katSz, { recursive: true, force: true }); mkdirSync(katSz, { recursive: true });
  for (const [k, v] of Object.entries(doSzczegolow(aed))) writeFileSync(join(katSz, k + ".json"), JSON.stringify(v));
}
log(`gotowe: ${obserwacje.length} obserwacji → ${aed.length} AED (${raport.aed_z_kilku_zrodel} z kilku źródeł), ${wyj}`);
