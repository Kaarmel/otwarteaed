import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schemat = JSON.parse(readFileSync(new URL("../hub/schemat.json", import.meta.url), "utf8"));
const pole = (n) => schemat.pola.find((p) => p.nazwa === n);

test("schemat ma wymagane minimum", () => {
  for (const n of ["aed_id", "szerokosc", "dlugosc", "zrodla"]) assert.equal(pole(n)?.wymagane, true, n);
});

test("schemat ma wszystkie pola wzorcowego zakresu", () => {
  const wszystkie = ["aed_id","zrodla","liczba_zrodel","potwierdzenie","szerokosc","dlugosc","lokalizacja_opis","wewnatrz","poziom",
    "ulica","numer","kod_pocztowy","miejscowosc","gmina","powiat","wojewodztwo","teryt_gmina","simc","ulic","adres_zrodlo","adres_odleglosc_m","adres_zrodlowy",
    "godziny","dostep","status_dostepnosci","nazwa_obiektu","operator","telefon","data_weryfikacji","termin_elektrod","termin_baterii","mobilny",
    "licencja","atrybucja","data_danych","data_pobrania","flagi_jakosci","ocena_jakosci","konflikty"];
  for (const n of wszystkie) assert.ok(pole(n), n);
});

test("słowniki potwierdzenia i statusu dostępności", () => {
  assert.deepEqual(pole("potwierdzenie").slownik, ["dysponent", "spolecznosc", "brak"]);
  assert.deepEqual(pole("status_dostepnosci").slownik, ["24/7", "brak_danych", "godziny", "ograniczony"]);
});

test("nazwy pól są ASCII snake_case", () => {
  for (const p of schemat.pola) assert.match(p.nazwa, /^[a-z0-9_]+$/);
});

test("każdy szablon gminy ma pola wymagane", () => {
  const w = (s) => schemat.pola.filter((p) => p.szablony?.[s] === "wymagane").map((p) => p.nazwa);
  assert.deepEqual(w("mam_wspolrzedne").sort(), ["dlugosc", "nazwa_obiektu", "szerokosc"]);
  assert.deepEqual(w("mam_adresy").sort(), ["miejscowosc", "nazwa_obiektu", "numer"]);
});
