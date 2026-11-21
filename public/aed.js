'use strict';
// Logika bez DOM: godziny dostępności, odległości, najbliższe AED. Test: node test_aed.mjs
const DNI = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function teraz(date) { // dzień (0 = pon.) i minuta doby w Warszawie
  if (!Number.isFinite(date.getTime())) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Warsaw', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date).map(x => [x.type, x.value]));
  return {dzien: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), min: +p.hour * 60 + +p.minute};
}

function dni(spec) { // "Mo-Fr,Sa" → Set(0..6); null gdy nie rozumiemy
  const s = new Set();
  for (const czesc of spec.split(',')) {
    const m = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(czesc.trim());
    if (!m) return null;
    const a = DNI.indexOf(m[1]), b = DNI.indexOf(m[2] || m[1]);
    for (let i = a; ; i = (i + 1) % 7) { s.add(i); if (i === b) break; }
  }
  return s;
}

// 'open' | 'closed' | 'unknown'. Obsługa: 24/7, reguły „dni HH:MM-HH:MM[,HH:MM-HH:MM]” i „dni off” rozdzielone „;”
// (późniejsza reguła nadpisuje wcześniejszą), PH pomijane. Wszystko inne = 'unknown', nigdy zgadywanie „otwarte”.
// ponytail: podzbiór składni opening_hours (bez miesięcy, świąt, tekstu); pełny parser = biblioteka opening_hours.js.
function availability(hours, date = new Date()) {
  const h = (hours || '').trim();
  if (h === '24/7') return 'open';
  const t = teraz(date);
  if (!h || !t) return 'unknown';
  const wczoraj = (t.dzien + 6) % 7;
  let stan = false, cokolwiek = false;
  for (let regula of h.split(';')) {
    regula = regula.trim().replace(/\s*,\s*PH\b/g, '');
    if (!regula || /^PH\b/.test(regula)) continue;
    const m = /^([A-Za-z,\-]+)\s+(off|closed|\d\d:\d\d-\d\d:\d\d(?:\s*,\s*\d\d:\d\d-\d\d:\d\d)*)$/.exec(regula);
    const zbior = m && dni(m[1]);
    if (!zbior) return 'unknown';
    cokolwiek = true;
    if (m[2] === 'off' || m[2] === 'closed') { if (zbior.has(t.dzien)) stan = false; continue; }
    let dzis = null;
    for (const zakres of m[2].split(',')) {
      const [a, b] = zakres.trim().split('-').map(x => { const [g, mi] = x.split(':').map(Number); return g * 60 + mi; });
      if (a > 1440 || b > 1440 || a === b) return 'unknown';
      if (zbior.has(t.dzien)) dzis = dzis || (a < b ? t.min >= a && t.min < b : t.min >= a);
      if (a > b && zbior.has(wczoraj) && t.min < b) stan = true; // zakres przez północ z poprzedniego dnia
    }
    if (dzis !== null) stan = dzis || stan;
  }
  return cokolwiek ? (stan ? 'open' : 'closed') : 'unknown';
}

function distanceM(lat1, lon1, lat2, lon2) {
  const r = n => n * Math.PI / 180;
  const h = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

// Orientacyjnie: droga ≈ 1,3 × linia prosta, 5 km/h.
function walkingMinutes(m) { return Math.max(1, Math.round(m * 1.3 / (5000 / 60))); }

// punkty: [lon, lat, status, id, nazwa]; status 3 = prywatny/niedostępny → pomijany
function closest(points, lat, lon, count = 3) {
  return points.filter(p => p[2] !== 3).map(p => ({p, m: distanceM(lat, lon, p[1], p[0])}))
    .sort((a, b) => a.m - b.m).slice(0, count);
}

// Plik szczegółów: ostatnie 2 cyfry identyfikatora rekordu źródła (jak w importuj.py).
function shard(id) { return String(id).slice(-2); } // plik szczegoly/<2 ostatnie znaki aed_id>.json
// Kolory statusu: 0 brak danych (przyjęto: dostępny) i 1 całodobowo = zielony, 2 ograniczone godziny = żółty, 3 prywatny = pomarańczowy.
const KOLOR = ['#00A651', '#00A651', '#E6B800', '#E8590C'];

if (typeof module !== 'undefined') module.exports = {availability, distanceM, walkingMinutes, closest, shard, KOLOR};
