// Logika kreatora dla gmin i dysponentów: ten sam rdzeń co harvester (hub/*.mjs), więc podgląd = opublikowany plik.
import { czytajPlik } from "../hub/czytaj.mjs";
import { wykryjProfil } from "../hub/wykryj.mjs";
import { normalizujWiersz } from "../hub/normalizuj.mjs";
import { uzupelnijAdresy } from "../hub/adresy.mjs";
import { ocenJakosc, oznaczWspolneWspolrzedne, oznaczOdstajace, raportJakosci } from "../hub/jakosc.mjs";
import { doCSV, doXMLDysponenta, polaZDanymi } from "../hub/eksport.mjs";
import { md5 } from "../hub/md5.mjs";

export const slug = (s) => String(s || "dysponent").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "dysponent";

const POMIJANE = new Set(["aed_id", "zrodla", "liczba_zrodel", "konflikty", "flagi_jakosci", "ocena_jakosci"]);

export async function przebiegKreatora({ bajty, nazwa, profile, schemat, dysponent, fetch = globalThis.fetch ?? null, data, mapowanie, wybranyProfil, baza = {} }) {
  const plik = await czytajPlik(bajty, nazwa);
  const propozycje = wykryjProfil(plik.naglowki, plik.wiersze, profile);
  const bazowy = profile.find((p) => p.id === (wybranyProfil ?? propozycje[0]?.id)) ?? {};
  const map = mapowanie ?? propozycje.find((p) => p.id === bazowy.id)?.mapowanie ?? {};
  const s = slug(dysponent?.nazwa);
  const profil = { id: s, nazwa: dysponent?.nazwa, potwierdzenie: "dysponent", licencja: dysponent?.licencja || "CC BY 4.0", atrybucja: dysponent?.nazwa,
    id_kolumna: bazowy.rodzaj === "zrodlo" ? bazowy.id_kolumna : undefined, data_danych: data, data_pobrania: data };
  const obserwacje = plik.wiersze.map((w, i) => normalizujWiersz(w, profil, map, i));
  oznaczWspolneWspolrzedne(obserwacje);
  oznaczOdstajace(obserwacje);
  await uzupelnijAdresy(obserwacje, baza, { fetch });
  for (const o of obserwacje) Object.assign(o, ocenJakosc(o));
  const raport = raportJakosci(obserwacje, obserwacje, [profil], data);
  const pola = ["obs_id", ...schemat.pola.map((p) => p.nazwa).filter((p) => !POMIJANE.has(p))];
  const nazwaCSV = `aed_${s}_${data}.csv`;
  const rekordy = obserwacje.map((o) => ({ ...o, obs_id: o.obs_id }));
  const csv = doCSV(rekordy, polaZDanymi(rekordy, pola)); // bez całkowicie pustych kolumn (standard dane.gov.pl)
  const xml = doXMLDysponenta({ dysponent: { url: "https://example.gov.pl/", ...dysponent }, dataDate: data, nazwaCSV, slug: s });
  const profilJSON = { id: s, nazwa: dysponent?.nazwa, rodzaj: "zrodlo", potwierdzenie: "dysponent", licencja: profil.licencja, atrybucja: dysponent?.nazwa,
    url_zrodla: dysponent?.url, pobierz: { url: (dysponent?.url || "") + nazwaCSV.replace(data, "{RRRR}-{MM}-{DD}") }, id_kolumna: profil.id_kolumna,
    kolumny: Object.fromEntries(Object.entries(map).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, [v]])) };
  return { plik, propozycje, profil, mapowanie: map, obserwacje, raport, pliki: { csv, xml, md5: md5(xml) + "\n", nazwaCSV, profil: profilJSON } };
}
