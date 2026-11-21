// Jednolite adresy z PRG (GUGiK, usługa UUG) + baza wyników, żeby kolejne przebiegi pytały tylko o nowe punkty.
const UUG = "https://services.gugik.gov.pl/uug/";
export const ATRYBUCJA_PRG = "Adresy: Państwowy Rejestr Granic i punkty adresowe, GUGiK";

export const kluczAdresu = (szer, dl) => `${szer.toFixed(5)},${dl.toFixed(5)}`;

function jednostka(s) {
  const cz = (s || "").replace(/^\{|\}$/g, "").match(/"[^"]*"|[^,]+/g) || [];
  const [, woj, pow, gm] = cz.map((x) => x.replace(/^"|"$/g, "").trim());
  return { wojewodztwo: woj ?? null, powiat: pow ?? null, gmina: gm ?? null };
}

function naAdres(r) {
  if (!r) return null;
  const d = r.distance !== undefined ? Math.round(Number(r.distance) * 10) / 10 : null;
  return { ulica: r.street || null, numer: r.number || null, kod_pocztowy: r.code || null,
    miejscowosc: r.citypart ? `${r.city} (${r.citypart})` : r.city || null, ...jednostka(r.jednostka),
    teryt_gmina: r.teryt || null, simc: r.simc || null, ulic: r.ulic || null, adres_odleglosc_m: d };
}

async function pobierz(url, fetch, limitMs) {
  const res = await fetch(url, { signal: AbortSignal.timeout(limitMs), headers: { "User-Agent": "otwarteaed-hub/1.0 (+https://otwarteaed.pl)" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

export async function adresOdwrotny(szer, dl, { fetch = globalThis.fetch, promien = 50, limitMs = 8000 } = {}) {
  const j = await pobierz(`${UUG}?request=GetAddressReverse&location=POINT(${dl}%20${szer})&srid=4326&radius=${promien}`, fetch, limitMs);
  return naAdres(j?.results?.["1"]);
}

export async function geokoduj(tekst, { fetch = globalThis.fetch, limitMs = 8000 } = {}) {
  const j = await pobierz(`${UUG}?request=GetAddress&address=${encodeURIComponent(tekst)}&srid=4326`, fetch, limitMs);
  const r = j?.results?.["1"];
  if (!r || (r.city_accuracy !== undefined && String(r.city_accuracy) !== "1")) return null;
  return { szerokosc: Number(r.y), dlugosc: Number(r.x), adres: naAdres(r) };
}

async function pula(zadania, n) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, zadania.length) }, async () => { while (i < zadania.length) await zadania[i++](); }));
}

const ADMIN = ["gmina", "powiat", "wojewodztwo", "teryt_gmina"];
const ULICZNE = ["ulica", "numer", "kod_pocztowy", "miejscowosc", "simc", "ulic"];

function zastosuj(o, a) {
  if (!a) {
    if (!o.ulica && !o.miejscowosc && !o.adres_zrodlowy) { o.flagi.push("brak_adresu"); o.adres_zrodlo = "brak"; }
    else o.adres_zrodlo = "zrodlo";
    return;
  }
  const zeZrodla = Boolean(o.ulica || o.numer || o.miejscowosc);
  for (const k of ADMIN) o[k] = a[k];
  for (const k of ULICZNE) if (!o[k]) o[k] = a[k];
  o.adres_odleglosc_m = a.adres_odleglosc_m;
  o.adres_zrodlo = zeZrodla ? "zrodlo" : "PRG";
  if (a.przyblizony) o.flagi.push("adres_przyblizony");
}

export async function uzupelnijAdresy(obserwacje, baza, { fetch = globalThis.fetch ?? null, rownolegle = 8, limitMs = 8000, postep } = {}) {
  const s = { zapytan: 0, zBazy: 0, bledow: 0 };
  const zadania = [];
  for (const o of obserwacje) {
    if (o.szerokosc === null || o.szerokosc === undefined) {
      if (!o.adres_zrodlowy) continue;
      const k = "g:" + o.adres_zrodlowy.toLowerCase().replace(/\s+/g, " ").trim();
      const zastosujG = (g) => {
        if (!g) return;
        o.szerokosc = g.szerokosc; o.dlugosc = g.dlugosc;
        o.flagi = o.flagi.filter((f) => f !== "brak_wspolrzednych");
        o.flagi.push("wspolrzedne_z_prg"); o.przeksztalcenia.push("geokodowanie PRG");
        zastosuj(o, g.adres);
      };
      if (k in baza) { s.zBazy++; zastosujG(baza[k]); continue; }
      if (!fetch) continue;
      zadania.push(async () => {
        try { s.zapytan++; const g = await geokoduj(o.adres_zrodlowy, { fetch, limitMs }); baza[k] = g; zastosujG(g); }
        catch { s.bledow++; }
      });
      continue;
    }
    const k = kluczAdresu(o.szerokosc, o.dlugosc);
    if (k in baza) { s.zBazy++; zastosuj(o, baza[k]); continue; }
    if (!fetch) { zastosuj(o, null); continue; }
    zadania.push(async () => {
      try {
        s.zapytan++;
        let a = await adresOdwrotny(o.szerokosc, o.dlugosc, { fetch, limitMs });
        if (!a) { s.zapytan++; a = await adresOdwrotny(o.szerokosc, o.dlugosc, { fetch, limitMs, promien: 200 }); if (a) a.przyblizony = true; }
        baza[k] = a;
        zastosuj(o, a);
      } catch {
        s.bledow++;
        o.flagi.push("brak_adresu");
        o.adres_zrodlo = o.ulica || o.adres_zrodlowy ? "zrodlo" : "brak";
      }
      if (postep && s.zapytan % 500 === 0) postep(s);
    });
  }
  await pula(zadania, rownolegle);
  return s;
}
