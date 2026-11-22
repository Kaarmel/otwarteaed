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

const WSP = new Set(["szerokosc", "dlugosc"]);
const r6 = (x) => Number(x.toFixed(6));
// Zastępcze znaki braku danych ze źródeł („-”, „n/a”…) zapisujemy jako pustą komórkę: w CSV (RFC 4180, W3C Tabular Data) brak wartości = puste pole.
const ZASTEPCZE = new Set(["-", "–", "—", "n/a", "N/A", "null", "NULL", "None", "none", "?"]);
export const czyZastepcza = (v) => typeof v === "string" && ZASTEPCZE.has(v.trim());
function komorka(p, v) {
  if (v === null || v === undefined || czyZastepcza(v)) return "";
  if (typeof v === "number") return String(WSP.has(p) ? r6(v) : v);
  if (Array.isArray(v)) v = v.join(";");
  else if (typeof v === "object") v = JSON.stringify(v);
  v = String(v);
  // Ochrona przed wstrzyknięciem formuł (dane z zewnątrz otwierane w arkuszu); "+48 …" i "-5" zostają bez zmian.
  if (/^[=+\-@\t\r]/.test(v) && /[^\d\s+;,.()\/-]/.test(v)) v = "'" + v;
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
// CSV według RFC 4180 i standardu technicznego dane.gov.pl: przecinek, cudzysłowy, końce linii CRLF, jeden wiersz nagłówka.
export function doCSV(rekordy, pola) {
  return [pola.join(","), ...rekordy.map((r) => pola.map((p) => komorka(p, r[p])).join(","))].join("\r\n") + "\r\n";
}
// Standard techniczny dane.gov.pl (rozdz. 4.2): niedopuszczalne są całkowicie puste kolumny. Publikujemy tylko pola z choć jedną wartością;
// pełny model (39 pól) opisuje wzorcowy_zakres_danych.xlsx.
export function polaZDanymi(rekordy, pola) {
  return pola.filter((p) => rekordy.some((r) => komorka(p, r[p]) !== ""));
}

export function doGeoJSON(aed, pola) {
  return { type: "FeatureCollection", features: aed.map((a) => ({ type: "Feature",
    geometry: a.szerokosc === null || a.szerokosc === undefined ? null : { type: "Point", coordinates: [r6(a.dlugosc), r6(a.szerokosc)] },
    properties: Object.fromEntries(pola.filter((p) => !WSP.has(p)).map((p) => [p, czyZastepcza(a[p]) ? null : a[p] ?? null])) })) };
}

const KOD = { brak_danych: 0, "24/7": 1, godziny: 2, ograniczony: 3 };
export function doIndeksuMapy(aed) {
  return aed.filter((a) => a.szerokosc !== null && a.szerokosc !== undefined)
    .map((a) => [r6(a.dlugosc), r6(a.szerokosc), KOD[a.status_dostepnosci] ?? 0, a.aed_id, (a.nazwa_obiektu || a.operator || "").slice(0, 28)]);
}

const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pl_en = (tag, pl, en) => `<${tag}><polish>${x(pl)}</polish><english>${x(en)}</english></${tag}>`;
const flagi = (zasob) => `<hasDynamicData>false</hasDynamicData><hasHighValueData>false</hasHighValueData><hasHighValueDataFromEuropeanCommissionList>false</hasHighValueDataFromEuropeanCommissionList><hasResearchData>false</hasResearchData>${zasob ? "<containsProtectedData>false</containsProtectedData>" : ""}`;
const zasob = (z, data) => `<resource status="published"><extIdent>${z.extIdent}</extIdent><url>${x(z.url)}</url>${pl_en("title", z.tytul, z.tytulEn)}${pl_en("description", z.opis, z.opisEn)}<availability>local</availability><dataDate>${data}</dataDate><specialSigns><specialSign>X</specialSign></specialSigns>${flagi(true)}</resource>`;
const tagi = ["AED", "defibrylatory", "zdrowie", "ratownictwo", "pierwsza pomoc"].map((t) => `<tag lang="pl">${t}</tag>`).join("") +
  ["AED", "defibrillators", "health", "first aid"].map((t) => `<tag lang="en">${t}</tag>`).join("");

export function doXML({ dataDate, bazaUrl, historia = [dataDate], zrodla = [] }) {
  const d8 = (d) => d.replaceAll("-", "");
  const daty = [...new Set([...historia, dataDate])].sort();
  const atrybucje = zrodla.map((z) => `${z.atrybucja} (${z.licencja})`).join("; ");
  const glowne = daty.map((d) => zasob({ extIdent: `otwarteaed_aed_csv_${d8(d)}`, url: `${bazaUrl}aed_${d}.csv`,
    tytul: `Defibrylatory AED w Polsce — zbiór zintegrowany ${d}`, tytulEn: `AED defibrillators in Poland — integrated dataset ${d}`,
    opis: `Scalony zbiór AED z wielu źródeł (dysponenci, gminy, OpenStreetMap) w jednolitym wzorcowym zakresie danych, stan na ${d}. CSV UTF-8 zgodny z RFC 4180 (przecinek, CRLF), brak wartości = pusta komórka. Kolumny bez żadnej wartości są pomijane; pełny model 39 pól: wzorcowy_zakres_danych.xlsx.`,
    opisEn: `Merged AED dataset from many sources in a single model schema, as of ${d}. CSV UTF-8.` }, d)).join("");
  const dodatkowe = [
    ["obs", "aed_obserwacje.csv", "Wszystkie rekordy źródłowe z pochodzeniem", "All source records with provenance", "Każdy rekord każdego źródła po normalizacji, z surowym oryginałem i listą przekształceń."],
    ["xlsx", "aed.xlsx", "Zbiór zintegrowany — arkusz XLSX", "Integrated dataset — XLSX", "Arkusze: AED, Obserwacje, Źródła, Jakość, Słownik pól."],
    ["geojson", "aed.geojson", "Zbiór zintegrowany — GeoJSON", "Integrated dataset — GeoJSON", "GeoJSON RFC 7946, WGS84, [długość, szerokość]."],
  ].map(([id, plik, t, te, o]) => zasob({ extIdent: `otwarteaed_${id}_${d8(dataDate)}`, url: bazaUrl + plik, tytul: `${t} ${dataDate}`, tytulEn: `${te} ${dataDate}`, opis: o, opisEn: te }, dataDate)).join("");
  const zbior1 = `<dataset status="published"><extIdent>otwarteaed_aed_polska</extIdent>${pl_en("title", "Defibrylatory AED w Polsce — zbiór zintegrowany (otwarte AED)", "AED defibrillators in Poland — integrated dataset (otwarte AED)")}${pl_en("description",
    "Ogólnopolski zbiór lokalizacji automatycznych defibrylatorów zewnętrznych (AED) zebrany z wielu źródeł, ujednolicony do wzorcowego zakresu danych, z adresami z PRG i scalonymi duplikatami. Każdy rekord ma listę źródeł i ocenę jakości. Brak danych o dostępności oznacza: przyjęto, że AED jest dostępny.",
    "Nationwide dataset of AED locations merged from many sources into a single model schema, with PRG addresses, deduplication, provenance and quality score.")}<url>https://otwarteaed.pl</url><updateFrequency>daily</updateFrequency><categories><category>HEAL</category></categories><conditions><source>true</source><modification>true</modification><responsibilities>Zbiór agregowany automatycznie z otwartych źródeł; nie jest urzędową ewidencją AED. Przekształcenia: normalizacja do wzorcowego zakresu danych, naprawa osi i formatów, adresy z PRG (GUGiK), scalenie duplikatów z zachowaniem pochodzenia. W nagłym wypadku dzwoń 112.</responsibilities><dbOrCopyrighted>Źródła: ${x(atrybucje)}. Zbiór zawiera dane OpenStreetMap udostępnione na licencji Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/ — wymagane oznaczenie „© współtwórcy OpenStreetMap” i udostępnianie baz pochodnych na tych samych warunkach. Dane gmin zachowują swoje licencje (CC0 1.0, CC BY 4.0), wskazane przy każdym rekordzie w polu licencja.</dbOrCopyrighted></conditions><resources>${glowne}${dodatkowe}</resources><tags>${tagi}</tags>${flagi(false)}</dataset>`;
  const zbior2 = `<dataset status="published"><extIdent>otwarteaed_aed_dysponenci</extIdent>${pl_en("title", "Defibrylatory AED — dane od dysponentów (otwarte AED)", "AED defibrillators — data from operators (otwarte AED)")}${pl_en("description",
    "Rekordy AED pochodzące wyłącznie od dysponentów (urzędy, instytucje, właściciele urządzeń), bez danych OpenStreetMap, w wzorcowym zakresie danych.",
    "AED records from operators only (public bodies, owners), without OpenStreetMap data, in the model schema.")}<url>https://otwarteaed.pl</url><updateFrequency>daily</updateFrequency><categories><category>HEAL</category></categories><conditions><source>true</source><modification>true</modification><dbOrCopyrighted>Źródła: ${x(zrodla.filter((z) => !/ODbL/.test(z.licencja)).map((z) => z.atrybucja).join("; ") || "dysponenci AED")}.</dbOrCopyrighted><dbOrCopyrightedLicenseChosen>CC BY 4.0</dbOrCopyrightedLicenseChosen></conditions><resources>${zasob({ extIdent: `otwarteaed_dysp_${d8(dataDate)}`, url: `${bazaUrl}aed_dysponenci_${dataDate}.csv`, tytul: `AED od dysponentów ${dataDate}`, tytulEn: `AED from operators ${dataDate}`, opis: "CSV UTF-8 zgodny z RFC 4180, wzorcowy zakres danych (kolumny bez wartości pominięte).", opisEn: "CSV UTF-8 (RFC 4180), model schema." }, dataDate)}</resources><tags>${tagi}</tags>${flagi(false)}</dataset>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<p:datasets xmlns:p="urn:otwarte-dane:harvester:1.13">${zbior1}${zbior2}</p:datasets>\n`;
}

// XML dla pojedynczego dysponenta (gminy) — ten sam format importu dane.gov.pl (XSD 1.13), jeden zbiór, jeden zasób CSV z datą.
export function doXMLDysponenta({ dysponent, dataDate, nazwaCSV, slug }) {
  const d8 = dataDate.replaceAll("-", "");
  const lic = ["CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0"].includes(dysponent.licencja) ? dysponent.licencja : "CC BY 4.0";
  const baza = dysponent.url.endsWith("/") ? dysponent.url : dysponent.url + "/";
  const r = zasob({ extIdent: `aed_${slug}`.slice(0, 27) + "_" + d8, url: baza + nazwaCSV,
    tytul: `Defibrylatory AED — ${dysponent.nazwa} — ${dataDate}`, tytulEn: `AED defibrillators — ${dysponent.nazwa} — ${dataDate}`,
    opis: "Lista AED w wzorcowym zakresie danych otwarte AED (CSV UTF-8).", opisEn: "AED list in the otwarte AED model schema (CSV UTF-8)." }, dataDate);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<p:datasets xmlns:p="urn:otwarte-dane:harvester:1.13"><dataset status="published"><extIdent>${`aed_${slug}`.slice(0, 36)}</extIdent>${pl_en("title", `Defibrylatory AED — ${dysponent.nazwa}`, `AED defibrillators — ${dysponent.nazwa}`)}${pl_en("description",
    `Lokalizacje automatycznych defibrylatorów zewnętrznych (AED), których dysponentem jest ${dysponent.nazwa}. Dane potwierdzone przez dysponenta, w wzorcowym zakresie danych otwarte AED.`,
    `Locations of AED defibrillators operated by ${dysponent.nazwa}, confirmed by the operator, in the otwarte AED model schema.`)}<url>${x(baza)}</url><updateFrequency>irregular</updateFrequency><categories><category>HEAL</category></categories><conditions><source>true</source><modification>true</modification><dbOrCopyrightedLicenseChosen>${lic}</dbOrCopyrightedLicenseChosen></conditions><resources>${r}</resources><tags>${tagi}</tags>${flagi(false)}</dataset></p:datasets>\n`;
}

// Szczegóły dla mapy gdzieaed.pl: pliki szczegoly/<2 ostatnie znaki aed_id>.json, pobierane tylko dla klikniętych punktów.
export function doSzczegolow(aed) {
  const wynik = {};
  for (const a of aed) {
    if (a.szerokosc === null || a.szerokosc === undefined) continue;
    const adres = [[a.ulica, a.numer].filter(Boolean).join(" "), a.miejscowosc].filter(Boolean).join(", ") || a.adres_zrodlowy || null;
    (wynik[a.aed_id.slice(-2)] ||= {})[a.aed_id] = { name: a.nazwa_obiektu ?? null, location_description: a.lokalizacja_opis ?? null, address: adres,
      opening_hours: a.godziny ?? null, operator: a.operator ?? null, potwierdzenie: a.potwierdzenie, liczba_zrodel: a.liczba_zrodel };
  }
  return wynik;
}
