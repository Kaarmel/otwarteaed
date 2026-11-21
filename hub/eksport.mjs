// Eksport: pliki wynikowe huba. Bez zależności od Node, działa też w przeglądarce.
export { zapisXLSX as doXLSX } from "./xlsx.mjs";

const tak = (b) => (b ? "tak" : "nie");

export function arkuszeWzorcowe(schemat, przyklad) {
  const pola = schemat.pola;
  return [
    { nazwa: "Pola", wiersze: [["Pole", "Grupa", "Opis", "Typ", "Format", "Wymagane", "Przykład", "Odpowiednik OSM"],
      ...pola.map((p) => [p.nazwa, p.grupa, p.opis, p.typ, p.format ?? (p.slownik ? p.slownik.join(" | ") : null), tak(p.wymagane), p.przyklad ?? null, p.osm ?? null])] },
    { nazwa: "Słowniki", wiersze: [["Pole", "Dozwolona wartość"], ...pola.flatMap((p) => (p.slownik || []).map((v) => [p.nazwa, v]))] },
    { nazwa: "Szablony", wiersze: [["Pole", "Szablon: mam współrzędne", "Szablon: mam tylko adresy"],
      ...pola.filter((p) => p.szablony).map((p) => [p.nazwa, p.szablony.mam_wspolrzedne, p.szablony.mam_adresy])] },
    { nazwa: "Przykład", wiersze: [pola.map((p) => p.nazwa), ...przyklad.map((r) => pola.map((p) => {
      const v = r[p.nazwa]; return Array.isArray(v) ? v.join(";") : v ?? null; }))] },
  ];
}
