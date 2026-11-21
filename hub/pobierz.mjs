// Źródło podane jako adres z datą w nazwie pliku, np. https://bip.gmina.pl/aed_{RRRR-MM-DD}.csv.
// Znaczniki: {RRRR-MM-DD} {RRRRMMDD} {RRRR} {MM} {DD}. Hub szuka najnowszego istniejącego pliku, od dziś wstecz.
export function rozwinAdres(szablon, data) {
  const [r, m, d] = data.split("-");
  return szablon.replaceAll("{RRRR-MM-DD}", data).replaceAll("{RRRRMMDD}", r + m + d).replaceAll("{RRRR}", r).replaceAll("{MM}", m).replaceAll("{DD}", d);
}

export function kandydaciAdresow(szablon, data, dni = 31) {
  const t = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10));
  const wynik = [];
  for (let i = 0; i <= dni; i++) {
    const u = rozwinAdres(szablon, new Date(t - i * 86400000).toISOString().slice(0, 10));
    if (!wynik.includes(u)) wynik.push(u);
  }
  return wynik;
}

export async function pobierzNajnowszy(szablon, data, { fetch = globalThis.fetch, dni = 31, limitMs = 30000 } = {}) {
  for (const url of kandydaciAdresow(szablon, data, dni)) {
    let r;
    try { r = await fetch(url, typeof AbortSignal !== "undefined" && AbortSignal.timeout ? { signal: AbortSignal.timeout(limitMs) } : {}); } catch { continue; }
    if (r.ok) return { url, bajty: new Uint8Array(await r.arrayBuffer()) };
  }
  throw new Error("nie znaleziono pliku dla adresu " + szablon + " w ostatnich " + dni + " dniach");
}
