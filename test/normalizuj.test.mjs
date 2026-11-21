import { test } from "node:test";
import assert from "node:assert/strict";
import { parsujLiczbe, parsujWspolrzedne, pl1992DoWgs84, wgs84DoPl1992, normalizujDate, statusDostepnosci, mapujDostep, normalizujWiersz } from "../hub/normalizuj.mjs";

const blisko = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("liczby z przecinkiem, kropką i śmieciami", () => {
  assert.equal(parsujLiczbe("50,1509"), 50.1509);
  assert.equal(parsujLiczbe(" 21.96 "), 21.96);
  assert.equal(parsujLiczbe("brak"), null);
  assert.equal(parsujLiczbe(null), null);
  assert.equal(parsujLiczbe(52.1), 52.1);
});

test("zamienione osie są naprawiane z flagą (Marki)", () => {
  const w = parsujWspolrzedne("21.105177", "52.322235");
  assert.equal(w.szerokosc, 52.322235);
  assert.equal(w.dlugosc, 21.105177);
  assert.ok(w.flagi.includes("zamienione_osie"));
});

test("stopnie, minuty, sekundy", () => {
  const w = parsujWspolrzedne("50°09'03\"N", "21°57'44\"E");
  blisko(w.szerokosc, 50.150833);
  blisko(w.dlugosc, 21.962222);
});

test("para w jednym polu z przecinkami dziesiętnymi", () => {
  const w = parsujWspolrzedne("50,15 21,96", null);
  assert.equal(w.szerokosc, 50.15);
  assert.equal(w.dlugosc, 21.96);
});

test("PL-1992: południk 19°E daje easting 500000, przeliczenie w obie strony", () => {
  const p = wgs84DoPl1992(52, 19);
  blisko(p.y, 500000, 0.01);
  assert.ok(p.x > 455000 && p.x < 465000, String(p.x));
  const w = pl1992DoWgs84(p.x, p.y);
  blisko(w.szerokosc, 52, 1e-8);
  blisko(w.dlugosc, 19, 1e-8);
  const r = wgs84DoPl1992(50.1509467, 21.9624141);
  const z = parsujWspolrzedne(String(r.x), String(r.y));
  blisko(z.szerokosc, 50.1509467, 1e-7);
  assert.ok(z.flagi.includes("pl1992"));
});

test("punkt poza Polską: flaga, wartości bez zmian", () => {
  const w = parsujWspolrzedne("48.2", "16.37");
  assert.equal(w.szerokosc, 48.2);
  assert.ok(w.flagi.includes("poza_polska"));
});

test("puste i tekstowe współrzędne", () => {
  const w = parsujWspolrzedne("", "brak");
  assert.equal(w.szerokosc, null);
  assert.ok(w.flagi.includes("brak_wspolrzednych"));
});

test("daty do ISO", () => {
  assert.equal(normalizujDate("21.11.2026"), "2026-11-21");
  assert.equal(normalizujDate("20261121"), "2026-11-21");
  assert.equal(normalizujDate("2026-11-21T10:00:00Z"), "2026-11-21");
  assert.equal(normalizujDate("kiedyś"), null);
});

test("status dostępności: brak danych to przyjęto dostępny", () => {
  assert.equal(statusDostepnosci({ godziny: null, dostep: null }), "brak_danych");
  assert.equal(statusDostepnosci({ godziny: "24/7" }), "24/7");
  assert.equal(statusDostepnosci({ godziny: "Mo-Fr 08:00-16:00" }), "godziny");
  assert.equal(statusDostepnosci({ godziny: "24/7", dostep: "ograniczony" }), "ograniczony");
  assert.equal(mapujDostep("private"), "ograniczony");
  assert.equal(mapujDostep("customers"), "klienci");
  assert.equal(mapujDostep(null), "brak_danych");
});

const profil = { id: "test", potwierdzenie: "dysponent", licencja: "CC0-1.0", atrybucja: "Gmina Test", id_kolumna: "Nr" };

test("wiersz → obserwacja z pochodzeniem i bez wyjątku przy braku współrzędnych", () => {
  const wiersz = { Nr: "7", Nazwa: " Szkoła ", Lat: "", Lon: "", Godz: null };
  const o = normalizujWiersz(wiersz, profil, { nazwa_obiektu: "Nazwa", szerokosc: "Lat", dlugosc: "Lon", godziny: "Godz" }, 0);
  assert.equal(o.obs_id, "test:7");
  assert.equal(o.nazwa_obiektu, "Szkoła");
  assert.equal(o.szerokosc, null);
  assert.ok(o.flagi.includes("brak_wspolrzednych"));
  assert.equal(o.status_dostepnosci, "brak_danych");
  assert.equal(o.potwierdzenie, "dysponent");
  assert.deepEqual(o.surowe, wiersz);
});

test("pierwsza niepusta kolumna z listy (OSM: opis po polsku albo ogólny)", () => {
  const o = normalizujWiersz({ "defibrillator:location": "przy wejściu", __lat: 50.1, __lon: 21.9 }, profil,
    { lokalizacja_opis: { pierwsza: ["defibrillator:location:pl", "defibrillator:location"] }, szerokosc: "__lat", dlugosc: "__lon" }, 0);
  assert.equal(o.lokalizacja_opis, "przy wejściu");
});

test("adres źródłowy składany z kilku kolumn, id z indeksu, gdy brak kolumny", () => {
  const o = normalizujWiersz({ ul: "Piłsudskiego", nr: "41", m: "Legionowo", szer: "52,395198", dl: "20,931382" },
    { ...profil, id_kolumna: undefined }, { adres_zrodlowy: ["ul", "nr", "m"], szerokosc: "szer", dlugosc: "dl" }, 4);
  assert.equal(o.obs_id, "test:5");
  assert.equal(o.adres_zrodlowy, "Piłsudskiego 41 Legionowo");
  assert.equal(o.szerokosc, 52.395198);
  assert.ok(o.przeksztalcenia.includes("przecinek→kropka"));
});
