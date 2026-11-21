// Wykrywanie profilu źródła lub szablonu gminy na podstawie nagłówków i treści.
import { parsujLiczbe } from "./normalizuj.mjs";

export function normalizujNaglowek(s) {
  return String(s ?? "").replace(/\uFEFF/g, "").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-.:/]+/g, " ").replace(/\s+/g, " ").trim();
}

export const wczytajProfile = (czytajKatalog) => [...czytajKatalog("zrodla"), ...czytajKatalog("szablony")];

const kolumnyZ = (m) => (typeof m === "string" ? [m] : Array.isArray(m) ? m : m?.pierwsza || []);

function wPolu(wiersze, kol, od, do_) {
  const liczby = wiersze.slice(0, 200).map((w) => parsujLiczbe(w[kol])).filter((x) => x !== null);
  return liczby.length > 0 && liczby.filter((x) => x >= od && x <= do_).length / liczby.length >= 0.8;
}

function udzialWObszarze(wiersze, m, o) {
  if (!o || !m.szerokosc || !m.dlugosc) return 0;
  const proba = wiersze.slice(0, 200);
  const w = (a, b) => a >= o[0] && a <= o[2] && b >= o[1] && b <= o[3];
  const ok = proba.filter((r) => { const a = parsujLiczbe(r[m.szerokosc]), b = parsujLiczbe(r[m.dlugosc]); return a !== null && b !== null && (w(a, b) || w(b, a)); });
  return proba.length ? ok.length / proba.length : 0;
}

export function wykryjProfil(naglowki, wiersze, profile) {
  const znorm = new Map(naglowki.map((h) => [normalizujNaglowek(h), h]));
  const istotne = naglowki.filter((h) => h !== "__timestamp" && wiersze.filter((w) => w[h] !== null && w[h] !== undefined && w[h] !== "").length >= 0.2 * Math.max(1, wiersze.length));
  return profile.map((p) => {
    const mapowanie = {};
    for (const [pole, al] of Object.entries(p.kolumny || {})) {
      const traf = al.map((a) => znorm.get(normalizujNaglowek(a))).find((h) => h !== undefined && !Object.values(mapowanie).includes(h));
      if (traf !== undefined) mapowanie[pole] = traf;
    }
    if (p.rodzaj === "szablon" && p.kolumny.szerokosc && (!mapowanie.szerokosc || !mapowanie.dlugosc)) {
      const wolne = naglowki.filter((h) => !Object.values(mapowanie).includes(h));
      mapowanie.szerokosc ??= wolne.find((h) => wPolu(wiersze, h, 49, 55));
      mapowanie.dlugosc ??= wolne.find((h) => h !== mapowanie.szerokosc && wPolu(wiersze, h, 14, 25));
      for (const k of ["szerokosc", "dlugosc"]) if (mapowanie[k] === undefined) delete mapowanie[k];
    }
    for (const [pole, m] of Object.entries(p.mapowanie_stale || {})) if (kolumnyZ(m).some((k) => naglowki.includes(k))) mapowanie[pole] = m;
    if (p.rodzaj === "szablon" && !mapowanie.adres_zrodlowy) {
      const cz = ["ulica", "numer", "kod_pocztowy", "miejscowosc"].map((k) => mapowanie[k]).filter(Boolean);
      if (cz.length) mapowanie.adres_zrodlowy = cz;
    }
    const wymagane = p.wymagane || Object.keys(p.kolumny || {});
    const brakujaceWymagane = wymagane.filter((k) => !mapowanie[k]);
    const R = wymagane.length ? (wymagane.length - brakujaceWymagane.length) / wymagane.length : 0;
    const uzyte = new Set([...Object.values(mapowanie).flatMap(kolumnyZ), p.id_kolumna].filter(Boolean));
    const H = istotne.length ? istotne.filter((h) => uzyte.has(h)).length / istotne.length : 0;
    const wynik = Math.round((0.55 * R + 0.35 * H + 0.1 * udzialWObszarze(wiersze, mapowanie, p.obszar)) * 1000) / 1000;
    return { id: p.id, nazwa: p.nazwa, rodzaj: p.rodzaj, wynik, mapowanie, brakujaceWymagane };
  }).sort((a, b) => b.wynik - a.wynik);
}
