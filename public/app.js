'use strict';
/* global L, QRCode, availability, distanceM, walkingMinutes, closest, shard, KOLOR */ // KOLOR z aed.js
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const PROG_PINEZEK = 14; // od tego przybliżenia pełne pinezki zamiast kropek
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const metry = m => m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
const trasa = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;

let P = [];                 // [lon, lat, status, id, nazwa]
const pliki = {};           // fragment → Promise<{id: rekord}>
const szczegoly = id => (pliki[shard(id)] ||= fetch(`dane/szczegoly/${shard(id)}.json`).then(r => r.json()).catch(() => ({})))
  .then(d => d[id] || null);

function pinezka(kolor, nr) {
  const srodek = nr ? `<text x="15" y="19.5" text-anchor="middle" font-family="Barlow,sans-serif" font-weight="800" font-size="14" fill="#fff">${nr}</text>`
    : '<path d="M15 21.5 9.6 16.2c-3-3 .9-6.7 3.6-4.4l1.8 1.6 1.8-1.6c2.8-2.3 6.6 1.4 3.6 4.4Z" fill="#fff"/>';
  return `<svg class="pinezka" width="30" height="40" viewBox="0 0 30 40"><path d="M15 39S2 24 2 14a13 13 0 0 1 26 0c0 10-13 25-13 25Z" fill="${kolor}" stroke="#fff" stroke-width="2"/>${srodek}</svg>`;
}
const ikona = (kolor, nr) => L.divIcon({className: '', html: pinezka(kolor, nr), iconSize: [30, 40], iconAnchor: [15, 39], popupAnchor: [0, -34]});
const IKONY = KOLOR.map(k => ikona(k));

function godzinyPl(h) {
  if (!h) return 'Brak danych o godzinach';
  if (h.trim() === '24/7') return 'Całą dobę';
  const d = {Mo: 'pn', Tu: 'wt', We: 'śr', Th: 'czw', Fr: 'pt', Sa: 'sob', Su: 'ndz', PH: 'święta'};
  return h.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, x => d[x]).replace(/\boff\b/g, 'nieczynne').replace(/;\s*/g, ', ').replace(/,(?=\S)/g, ', ');
}
function znacznik(p, d) {
  if (p[2] === 3) return '<span class="stan">Prywatny</span>';
  if (p[2] === 0) return '<span class="stan open">Brak danych — przyjęto: dostępny</span>';
  const a = availability(d?.opening_hours);
  return a === 'open' ? '<span class="stan open">Dostępny teraz</span>'
    : a === 'closed' ? '<span class="stan closed">Teraz zamknięty</span>' : '<span class="stan">Godziny ?</span>';
}
const nazwa = (p, d) => d?.name || p[4] || 'Defibrylator AED';
const gdzie = d => [d?.location_description, d?.address].filter(Boolean).join(' · ').slice(0, 180);

/* ---------- zakładki ---------- */
function zakladka() {
  const [t, q] = location.hash.slice(1).split('?');
  const tab = ['znajdz', 'dla-firm', 'dane'].includes(t) ? t : 'znajdz';
  document.body.dataset.tab = tab;
  if (tab === 'znajdz') setTimeout(() => mapa.invalidateSize());
  if (tab === 'dla-firm') skaluj();
  return new URLSearchParams(q || '');
}
addEventListener('hashchange', zakladka);

/* ---------- mapa ---------- */
const mapa = L.map('mapa', {zoomControl: false, preferCanvas: true}).setView([52.05, 19.4], 6);
L.control.zoom({position: 'topright'}).addTo(mapa);
L.tileLayer(OSM, {maxZoom: 19, attribution: OSM_ATR}).addTo(mapa);
const plotno = L.canvas({padding: 0.4});
const kropki = L.layerGroup(), pinezki = L.layerGroup().addTo(mapa), wyniki = L.layerGroup().addTo(mapa);
const promien = z => z <= 6 ? 2.2 : z <= 7 ? 2.8 : z <= 9 ? 3.6 : 4.8; // mniejsze kropki na widoku kraju

function rysuj() {
  pinezki.clearLayers();
  if (mapa.getZoom() < PROG_PINEZEK) { if (!mapa.hasLayer(kropki)) mapa.addLayer(kropki); return; }
  mapa.removeLayer(kropki);
  const b = mapa.getBounds().pad(0.25);
  for (const p of P) if (b.contains([p[1], p[0]]))
    L.marker([p[1], p[0]], {icon: IKONY[p[2]], title: p[4] || 'AED'}).on('click', () => pokaz(p)).addTo(pinezki);
}
mapa.on('moveend', rysuj);
mapa.on('zoomend', () => { const r = promien(mapa.getZoom()), w = r < 3 ? .6 : 1.5; kropki.eachLayer(l => l.setStyle({radius: r, weight: w})); });

async function pokaz(p) {
  const d = await szczegoly(p[3]);
  const m = ja ? `<p><svg><use href="#i-pieszo"/></svg> ${metry(distanceM(ja.lat, ja.lon, p[1], p[0]))}</p>` : '';
  L.popup({maxWidth: 280}).setLatLng([p[1], p[0]]).setContent(`<h3>${esc(nazwa(p, d))}</h3>${gdzie(d) ? `<p>${esc(gdzie(d))}</p>` : ''}
    <p>${znacznik(p, d)} ${esc(godzinyPl(d?.opening_hours))}</p>${m}
    <p><a class="prowadz" href="${trasa(p[1], p[0])}" target="_blank" rel="noopener"><svg><use href="#i-pieszo"/></svg>Prowadź</a></p>`).openOn(mapa);
}

const gotowe = fetch('dane/aed_mapa.json').then(r => r.json()).then(d => {
  P = d;
  for (const p of P) L.circleMarker([p[1], p[0]], {renderer: plotno, radius: promien(mapa.getZoom()), weight: .6, color: '#fff', fillColor: KOLOR[p[2]], fillOpacity: 1})
    .on('click', () => pokaz(p)).addTo(kropki);
  rysuj(); statystyki();
});

/* ---------- najbliższe AED ---------- */
let ja = null, jaZnacznik = null;
function arkusz(html) {
  const a = $('#arkusz');
  a.innerHTML = `<button class="zamknij" type="button" aria-label="Zamknij"><svg><use href="#i-x"/></svg></button>${html}`;
  a.hidden = false;
  a.querySelector('.zamknij').onclick = () => { a.hidden = true; };
}
const blad = t => arkusz(`<p class="blad">${esc(t)}</p>`);

async function obok(lat, lon) {
  await gotowe;
  ja = {lat, lon};
  jaZnacznik?.remove();
  jaZnacznik = L.marker([lat, lon], {icon: L.divIcon({className: '', html: '<div class="ja"></div>', iconSize: [18, 18]}), interactive: false, zIndexOffset: 1000}).addTo(mapa);
  const n = closest(P, lat, lon, 3);
  const d = await Promise.all(n.map(x => szczegoly(x.p[3])));
  arkusz(n.map((x, i) => `<div class="aed${i ? '' : ' pierwszy'}">
    <span class="nr" style="background:${KOLOR[x.p[2]]}">${i + 1}</span>
    <h3>${esc(nazwa(x.p, d[i]))}</h3>
    <div class="dystans"><svg><use href="#i-pieszo"/></svg>${metry(x.m)} · ${walkingMinutes(x.m)} min ${znacznik(x.p, d[i])}</div>
    ${gdzie(d[i]) ? `<p class="gdzie">${esc(gdzie(d[i]))}</p>` : ''}
    ${i ? '' : `<a class="prowadz" href="${trasa(x.p[1], x.p[0])}" target="_blank" rel="noopener"><svg><use href="#i-pieszo"/></svg>Prowadź</a>`}
  </div>`).join(''));
  wyniki.clearLayers();
  n.forEach((x, i) => L.marker([x.p[1], x.p[0]], {icon: ikona(KOLOR[x.p[2]], i + 1), zIndexOffset: 900 - i}).on('click', () => pokaz(x.p)).addTo(wyniki));
  const panel = $('.dol'), boczny = innerWidth >= 900; // na dużym ekranie panel jest z lewej, na telefonie na dole
  mapa.fitBounds(L.latLngBounds([[lat, lon], ...n.map(x => [x.p[1], x.p[0]])]),
    {paddingTopLeft: [boczny ? panel.offsetWidth + 50 : 30, 70], paddingBottomRight: [60, boczny ? 40 : panel.offsetHeight + 30], maxZoom: 18});
}

function lokalizuj() {
  return new Promise((ok, nie) => {
    if (!navigator.geolocation) return nie(new Error('Ta przeglądarka nie podaje lokalizacji. Wpisz adres.'));
    navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lon: p.coords.longitude}),
      e => nie(new Error(e.code === 1 ? 'Brak zgody na lokalizację. Wpisz adres.' : 'Nie udało się ustalić lokalizacji. Wpisz adres.')),
      {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
  });
}

$('#najblizszy').onclick = async () => {
  const b = $('#najblizszy');
  b.setAttribute('aria-busy', 'true');
  try { const g = await lokalizuj(); await obok(g.lat, g.lon); } catch (e) { blad(e.message); }
  b.removeAttribute('aria-busy');
};

// Nominatim (OSM): wyszukiwanie tylko po kliknięciu, nie przy każdym znaku (zasady usługi).
async function geokoduj(q) {
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({q, format: 'jsonv2', countrycodes: 'pl', limit: '1', 'accept-language': 'pl'}),
    {signal: AbortSignal.timeout(12000)});
  if (!r.ok) throw new Error('Wyszukiwarka adresów nie odpowiada. Spróbuj za chwilę.');
  const [w] = await r.json();
  if (!w) throw new Error('Nie znaleziono adresu. Dopisz miejscowość.');
  return {lat: +w.lat, lon: +w.lon};
}
async function adresZ(lat, lon) {
  const r = await fetch('https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({lat, lon, format: 'jsonv2', 'accept-language': 'pl'}), {signal: AbortSignal.timeout(12000)});
  const a = (await r.json()).address || {};
  return [[a.road || a.pedestrian || a.square || a.hamlet, a.house_number].filter(Boolean).join(' '),
    [a.postcode, a.city || a.town || a.village || a.municipality].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

$('#szukaj').onsubmit = async e => {
  e.preventDefault();
  const q = $('#adres').value.trim();
  if (!q) return $('#adres').focus();
  try { const g = await geokoduj(q); await obok(g.lat, g.lon); } catch (err) { blad(err.message); }
};

/* ---------- karta do druku ---------- */
const KROKI = [
  ['Bezpiecznie?', 'Rozejrzyj się', '<path d="M32 7 59 55H5Z" fill="#F2B705" stroke-linejoin="round"/><path d="M32 24v15"/><circle cx="32" cy="47" r="2.8" fill="#15201B" stroke="none"/>'],
  ['Reaguje?', 'Potrząśnij za ramiona, zawołaj', '<circle cx="32" cy="20" r="8"/><path d="M14 54c0-12 8-20 18-20s18 8 18 20M7 27c-3 4-3 9 0 13M57 27c3 4 3 9 0 13"/>'],
  ['Oddycha?', 'Odchyl głowę, patrz i słuchaj do 10 s', '<circle cx="14" cy="42" r="6"/><path d="M21 45h36M8 30c3-4 6-4 9 0s6 4 9 0M30 22c3-4 6-4 9 0s6 4 9 0"/>'],
  ['Dzwoń 112', 'Włącz głośnik, wyślij kogoś po AED', '<path d="M18 8l7 8c1 1.3 1 3.2-.1 4.4L22 23a28 28 0 0 0 15 15l2.8-2.9c1.2-1.1 3.1-1.2 4.4-.1l8 7c1.4 1.2 1.5 3.4.2 4.7L48 51c-2 2-5 2.6-7.6 1.6A44 44 0 0 1 11 23.4C10 20.8 10.6 17.9 12.6 16l3.2-3.4" fill="#C8102E" stroke="#C8102E"/><text x="44" y="22" text-anchor="middle" font-size="14" font-weight="800" fill="#15201B" stroke="none" font-family="Barlow,sans-serif">112</text>'],
  ['30 uciśnięć', 'Środek klatki, 5–6 cm, 100–120/min. 2 wdechy, jeśli umiesz', '<path d="M6 50h52"/><circle cx="10" cy="44" r="5"/><rect x="24" y="33" width="18" height="9" rx="3" fill="#15201B"/><path d="M33 6v20m-7-7 7 7 7-7"/>'],
  ['Włącz AED', 'Rób, co mówi urządzenie', '<use href="#i-aed" x="8" y="8" width="48" height="48"/>'],
];
let miejsce = null, kartaMapa = null;
const info = t => { $('#k-info').textContent = t; };

function skaluj() {
  const pod = $('#podglad'), sk = $('#skala');
  if (!pod.clientWidth) return;
  const s = Math.min(1, (pod.clientWidth - 32) / sk.offsetWidth);
  sk.style.transform = `scale(${s})`;
  pod.style.height = `${sk.offsetHeight * s + 32}px`;
}
addEventListener('resize', skaluj);

function pustaKarta() {
  const k = $('#karta');
  k.className = 'karta pusta';
  k.innerHTML = '<p>Wpisz adres miejsca.<br>Tu pojawi się karta A4.</p>';
  $('#k-drukuj').disabled = true;
  skaluj();
}

async function zbudujKarte() {
  await gotowe;
  const n = closest(P, miejsce.lat, miejsce.lon, 3);
  const d = await Promise.all(n.map(x => szczegoly(x.p[3])));
  const [g] = n, nazwaMiejsca = $('#k-nazwa').value.trim(), adres = $('#k-adres').value.trim();
  const dzis = new Date().toLocaleDateString('pl-PL');
  const k = $('#karta');
  k.className = 'karta';
  k.innerHTML = `
    <header class="k-gora"><svg><use href="#i-aed"/></svg><h2>Najbliższy<br>defibrylator AED</h2></header>
    <section class="k-cel"><div class="ile">${metry(g.m)}<small>ok. ${walkingMinutes(g.m)} min pieszo</small></div>
      <div class="co"><b>${esc(nazwa(g.p, d[0]))}</b>${esc(gdzie(d[0]))}<br><span class="godz">${esc(godzinyPl(d[0]?.opening_hours))}</span></div></section>
    <div class="k-mapa" id="k-mapa"></div>
    <div class="k-inne">${n.slice(1).map((x, i) => `<b>${i + 2}.</b> ${esc(nazwa(x.p, d[i + 1]))}, ${metry(x.m)}`).join('&emsp;')}</div>
    <section class="k-adres"><small>Podaj dyspozytorowi adres:</small><div>${nazwaMiejsca ? esc(nazwaMiejsca) + '<br>' : ''}${esc(adres)}</div></section>
    <section class="k-alarm"><div class="glowny"><b>112</b><span>Numer<br>alarmowy</span></div><div><b>999</b>Pogotowie</div><div><b>998</b>Straż</div><div><b>997</b>Policja</div></section>
    <section class="k-kroki">${KROKI.map(([t, s, svg], i) => `<div><svg viewBox="0 0 64 64" fill="none" stroke="#15201B" stroke-width="3.5" stroke-linecap="round">${svg}</svg><b>${i + 1}. ${t}</b><span>${s}</span></div>`).join('')}</section>
    <footer class="k-stopka"><div class="qr" id="k-qr"></div><div><b>Aktualna mapa AED: gdzieaed.pl</b><br>
      Karta z ${dzis}. Godziny i dostępność mogą się zmienić. Karta nie zastępuje szkolenia z pierwszej pomocy.<br>
      Dane: © współtwórcy OpenStreetMap (ODbL) i źródła miejskie.</div></footer>`;
  new QRCode($('#k-qr'), {text: `https://gdzieaed.pl/#znajdz?lat=${miejsce.lat.toFixed(5)}&lon=${miejsce.lon.toFixed(5)}`, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M});

  kartaMapa?.remove();
  kartaMapa = L.map('k-mapa', {zoomControl: false, fadeAnimation: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25});
  L.tileLayer(OSM, {maxZoom: 19, attribution: OSM_ATR}).addTo(kartaMapa);
  L.polyline([[miejsce.lat, miejsce.lon], [g.p[1], g.p[0]]], {color: '#15201B', weight: 3, dashArray: '6 6'}).addTo(kartaMapa);
  L.marker([miejsce.lat, miejsce.lon], {icon: L.divIcon({className: '', html: '<div class="k-tu">Tu jesteś</div>', iconSize: [76, 26], iconAnchor: [38, 13]})}).addTo(kartaMapa);
  n.forEach((x, i) => L.marker([x.p[1], x.p[0]], {icon: ikona(KOLOR[x.p[2]], i + 1)}).addTo(kartaMapa));
  kartaMapa.fitBounds(L.latLngBounds([[miejsce.lat, miejsce.lon], ...n.map(x => [x.p[1], x.p[0]])]), {padding: [40, 40], maxZoom: 18});
  $('#k-drukuj').disabled = false;
  info('Gotowe. Sprawdź podgląd i drukuj.');
  skaluj();
}

$('#kreator').onsubmit = async e => {
  e.preventDefault();
  const q = $('#k-adres').value.trim();
  if (!q) return $('#k-adres').focus();
  info('Szukam adresu…');
  try { miejsce = await geokoduj(q); await zbudujKarte(); } catch (err) { info(err.message); }
};
$('#k-tutaj').onclick = async () => {
  info('Ustalam lokalizację…');
  try {
    miejsce = await lokalizuj();
    if (!$('#k-adres').value.trim()) $('#k-adres').value = await adresZ(miejsce.lat, miejsce.lon).catch(() => '');
    await zbudujKarte();
  } catch (err) { info(err.message); }
};
$('#k-adres').oninput = () => { if (miejsce) { miejsce = null; pustaKarta(); info('Adres zmieniony. Kliknij lupę.'); } };
$('#k-nazwa').oninput = () => { if (miejsce) zbudujKarte(); };
$('#k-drukuj').onclick = () => print();

/* ---------- dane ---------- */
async function statystyki() {
  const ile = s => P.filter(p => p[2] === s).length;
  const z = await fetch('dane/zrodla.json').then(r => r.json()).catch(() => ({zrodla: []}));
  const zr = (z.zrodla || []).filter(s => s.rekordow);
  const kafel = (liczba, opis, kolor) => `<div class="kafel"><b>${liczba.toLocaleString('pl-PL')}</b><span>${kolor ? `<i class="kropka ${kolor}"></i>` : ''}${opis}</span></div>`;
  $('#kafle').innerHTML = kafel(P.length, 'AED na mapie') + kafel(ile(1), 'całodobowo', 'k1') + kafel(ile(2), 'w godzinach', 'k2')
    + kafel(ile(0), 'brak danych, przyjęto: dostępny', 'k0') + kafel(ile(3), 'prywatne', 'k3') + kafel(zr.length, 'źródeł danych');
  $('#zrodla tbody').innerHTML = zr.map(s => `<tr><td><a href="${esc(s.url_zrodla)}">${esc(s.nazwa)}</a></td><td>${s.rekordow.toLocaleString('pl-PL')}</td><td><a href="${esc(s.licencja_url)}">${esc(s.licencja)}</a></td></tr>`).join('');
}

/* ---------- start ---------- */
pustaKarta();
const start = zakladka();
if (start.has('lat') && start.has('lon')) {
  const lat = +start.get('lat'), lon = +start.get('lon');
  if (document.body.dataset.tab === 'dla-firm') { // link do gotowej karty: #dla-firm?lat=..&lon=..&adres=..&nazwa=..
    $('#k-adres').value = start.get('adres') || ''; $('#k-nazwa').value = start.get('nazwa') || '';
    miejsce = {lat, lon}; zbudujKarte();
  } else obok(lat, lon);
}
