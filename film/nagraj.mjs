// Nagrywa film demonstracyjny z prawdziwego interfejsu (Chrome + DevTools Protocol, bez bibliotek).
// Użycie: najpierw sh skrypty/strony.sh i serwer: python3 -m http.server 8800 -d dist/otwarteaed
//         potem node film/nagraj.mjs → film/out/otwarte-aed-film.mp4 (2560×1440, 30 kl./s, bez dźwięku)
// Czasy zdarzeń są zgrane z nagraniem lektora (film/out/glos-test-klipy.json).
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const STRONA = process.env.STRONA || "http://localhost:8800";
const KLATKI = process.env.KLATKI || join(tmpdir(), "otwarteaed-film-klatki");
const WYJ = join(ROOT, "film/out");
const SZER = 2560, WYS = 1440;
const MD5 = "a6770611cb7737a0ccf8f2d71decbbfa";
const scena = (n) => pathToFileURL(join(ROOT, "film/sceny", n)).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
rmSync(KLATKI, { recursive: true, force: true }); mkdirSync(KLATKI, { recursive: true }); mkdirSync(WYJ, { recursive: true });

const profil = join(tmpdir(), "otwarteaed-film-chrome");
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9333", "--window-size=1920,1080", "--hide-scrollbars", "--disable-gpu",
  "--no-first-run", "--no-default-browser-check", "--user-data-dir=" + profil, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
let cel;
for (let i = 0; i < 40 && !cel; i++) { await sleep(250); try { cel = (await (await fetch("http://127.0.0.1:9333/json")).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(cel.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nr = 0; const czeka = new Map(); const klatki = []; let window_zaladowano = null;
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && czeka.has(m.id)) { czeka.get(m.id)(m.result); czeka.delete(m.id); return; }
  if (m.method === "Page.domContentEventFired" && window_zaladowano) { window_zaladowano(); window_zaladowano = null; }
  if (m.method === "Page.screencastFrame") {
    const plik = join(KLATKI, String(klatki.length).padStart(6, "0") + ".jpg");
    writeFileSync(plik, Buffer.from(m.params.data, "base64"));
    klatki.push({ plik, t: Date.now() });
    wyslij("Page.screencastFrameAck", { sessionId: m.params.sessionId });
  }
};
function wyslij(method, params = {}) { const id = ++nr; return new Promise((r) => { czeka.set(id, r); ws.send(JSON.stringify({ id, method, params })); }); }
const js = (kod) => wyslij("Runtime.evaluate", { expression: kod, awaitPromise: true });
const wywolaj = (fn, ...a) => js("window." + fn + "(" + a.map((x) => JSON.stringify(x)).join(",") + ")");
await wyslij("Page.enable"); await wyslij("Runtime.enable");

// Kurtyna przejścia: zielona plansza z sygnetem, obecna od pierwszego malowania każdej strony
function kurtyna() {
  const s = document.createElement("style");
  s.textContent = "html::after{content:'';position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:#00843D url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByb2xlPSJpbWciIGFyaWEtbGFiZWw9Im90d2FydGUgQUVEIj48dGl0bGU+b3R3YXJ0ZSBBRUQ8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTE1IDBMNDkgMEM1Ny4yOCAwIDY0IDYuNzIgNjQgMTVMNjQgNDlDNjQgNTcuMjggNTcuMjggNjQgNDkgNjRMMTUgNjRDNi43MiA2NCAwIDU3LjI4IDAgNDlMMCAxNUMwIDYuNzIgNi43MiAwIDE1IDBaTTMyIDMyLjU0QzIxLjQ0IDI1LjY2IDE4IDIwLjc1IDE4IDE2LjY5QzE4IDEyLjg5IDIwLjk1IDEwLjA2IDI0LjUxIDEwLjA2QzI3LjcgMTAuMDYgMzAuMDMgMTEuNzggMzIgMTQuNDhDMzMuOTYgMTEuNzggMzYuMyAxMC4wNiAzOS40OSAxMC4wNkM0My4wNSAxMC4wNiA0NiAxMi44OSA0NiAxNi42OUM0NiAyMC43NSA0Mi41NiAyNS42NiAzMiAzMi41NFpNMzUuMDggMzYuNjVMMjQuOTYgNDcuMUwyOS45MiA0Ny4xTDI2LjkyIDUzLjk1TDM3LjAzIDQzLjUxTDMxLjg4IDQzLjUxTDM1LjA4IDM2LjY1WiIvPjwvc3ZnPgo=) center/170px no-repeat;transform:translateX(0)}" +
    "html.__odkryj::after{transform:translateX(-101%);transition:transform .42s cubic-bezier(.7,0,.25,1)}html.__poza::after{transform:translateX(101%)}" +
    "html.__zakryj::after{transform:translateX(0);transition:transform .36s cubic-bezier(.7,0,.25,1)}";
  const dodaj = () => { if (!document.documentElement) return false; document.documentElement.appendChild(s); return true; };
  if (!dodaj()) new MutationObserver((m, o) => { if (dodaj()) o.disconnect(); }).observe(document, { childList: true });
}
await wyslij("Page.addScriptToEvaluateOnNewDocument", { source: "(" + kurtyna.toString() + ")()" });

// Nakładka: napis, rozdział, kamera (transformacja body), kursor z kliknięciem
function nakladka() {
  if (window.__nak) return; window.__nak = 1;
  const st = document.createElement("style");
  st.textContent = "#__napis{position:fixed;left:50%;bottom:48px;transform:translate(-50%,30px);max-width:1500px;width:max-content;background:rgba(16,33,63,.94);color:#fff;font:700 40px/1.3 'Atkinson Hyperlegible',A,Arial,sans-serif;padding:20px 36px;border-radius:14px;z-index:99999;opacity:0;transition:opacity .3s,transform .45s cubic-bezier(.2,.8,.2,1);text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)}" +
    "#__napis.on{opacity:1;transform:translate(-50%,0)}" +
    "#__rozdzial{position:fixed;top:28px;right:32px;background:#00843D;color:#fff;font:700 26px 'Atkinson Hyperlegible',A,Arial,sans-serif;padding:10px 20px;border-radius:999px;z-index:99999;opacity:0;transform:translateX(30px);transition:opacity .3s,transform .45s cubic-bezier(.2,.8,.2,1)}" +
    "#__rozdzial.on{opacity:1;transform:none}" +
    "#__kursor{position:fixed;left:55%;top:70%;width:46px;height:46px;z-index:2147483600;pointer-events:none;opacity:0;transition:left .85s cubic-bezier(.45,0,.2,1),top .85s cubic-bezier(.45,0,.2,1),opacity .3s,transform .15s;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}" +
    "#__kursor.klik{transform:scale(.82)}" +
    ".__fala{position:fixed;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;background:rgba(0,132,61,.45);border:3px solid #00843D;z-index:2147483599;pointer-events:none;animation:__fala .65s ease-out forwards}" +
    "@keyframes __fala{from{transform:scale(.2);opacity:1}to{transform:scale(1.7);opacity:0}}";
  document.head.appendChild(st);
  for (const id of ["__napis", "__rozdzial"]) { const d = document.createElement("div"); d.id = id; document.documentElement.appendChild(d); }
  const k = document.createElement("div"); k.id = "__kursor";
  k.innerHTML = "<svg viewBox='0 0 24 24' width='46' height='46'><path d='M4 2l15 11-6.5 1.2 3.8 7.3-2.9 1.5-3.8-7.4L4 19.5z' fill='#fff' stroke='#10213F' stroke-width='1.6' stroke-linejoin='round'/></svg>";
  document.documentElement.appendChild(k);
  document.body.style.transformOrigin = "0 0";
  window.__napis = (t) => { const d = document.getElementById("__napis"); d.classList.remove("on"); if (!t) return; setTimeout(() => { d.textContent = t; d.classList.add("on"); }, 220); };
  window.__rozdzial = (t) => { const d = document.getElementById("__rozdzial"); d.textContent = t || ""; d.classList.toggle("on", !!t); };
  window.__kamera = (sel, s, ms, dryf, dryfMs) => {
    const b = document.body; clearTimeout(window.__dt);
    const ust = (t, tr) => { b.style.transition = tr; b.style.transform = t; };
    if (!sel) { ust("translate(0px,0px) scale(1)", "transform " + ms + "ms cubic-bezier(.65,0,.35,1)"); return; }
    const e = sel[0] === "~" ? [...document.querySelectorAll("#naprawy li")].find((x) => x.textContent.includes(sel.slice(1))) : document.querySelector(sel);
    if (!e) return;
    const prev = getComputedStyle(b).transform; b.style.transition = "none"; b.style.transform = "none";
    const r = e.getBoundingClientRect(), bb = b.getBoundingClientRect();
    b.style.transform = prev === "none" ? "translate(0px,0px) scale(1)" : prev; void b.offsetWidth;
    const vw = innerWidth, vh = innerHeight; s = Math.max(1, Math.min(s, 0.92 * vw / r.width, 0.82 * vh / r.height));
    const cx = r.left + r.width / 2 - bb.left, cy = r.top + r.height / 2 - bb.top;
    const T = (q) => { let tx = vw / 2 - bb.left - q * cx, ty = vh / 2 - bb.top - q * cy;
      tx = Math.min(-bb.left, Math.max(vw - bb.left - q * bb.width, tx)); ty = Math.min(-bb.top, Math.max(vh - bb.top - q * Math.max(bb.height, vh), ty));
      return "translate(" + tx + "px," + ty + "px) scale(" + q + ")"; };
    ust(T(s), "transform " + ms + "ms cubic-bezier(.65,0,.35,1)");
    window.__dt = setTimeout(() => ust(T(s * (1 + dryf)), "transform " + dryfMs + "ms linear"), ms + 20);
  };
  window.__kursor = (sel) => { const k = document.getElementById("__kursor"); if (!sel) { k.style.opacity = 0; return; } k.style.opacity = 1; if (sel === "start") return;
    const e = document.querySelector(sel); if (!e) return; const r = e.getBoundingClientRect(); k.style.left = (r.left + r.width * 0.55 - 6) + "px"; k.style.top = (r.top + r.height * 0.6 - 4) + "px"; };
  window.__klik = () => { const k = document.getElementById("__kursor"); const r = k.getBoundingClientRect(); const f = document.createElement("div"); f.className = "__fala"; f.style.left = (r.left + 9) + "px"; f.style.top = (r.top + 5) + "px"; document.documentElement.appendChild(f); k.classList.add("klik"); setTimeout(() => k.classList.remove("klik"), 160); setTimeout(() => f.remove(), 700); };
}
const NAKLADKA = "(" + nakladka.toString() + ")()";
const ekran = async (strona) => wyslij("Emulation.setDeviceMetricsOverride", strona ? { width: 1536, height: 864, deviceScaleFactor: SZER / 1536, mobile: false } : { width: 1920, height: 1080, deviceScaleFactor: SZER / 1920, mobile: false });
async function idz(url, strona) {
  await ekran(strona);
  const zaladowano = new Promise((r) => { window_zaladowano = r; setTimeout(r, 8000); });
  await wyslij("Page.navigate", { url });
  await zaladowano;
  await sleep(60);
  await js("document.fonts && document.fonts.ready.then(() => 1)");
  await js(NAKLADKA);
}
const odkryj = () => js("document.documentElement.classList.add('__odkryj'); document.body.classList.add('start')");
const zakryj = async () => { await js("(() => { const h = document.documentElement; h.classList.remove('__odkryj'); h.classList.add('__poza'); void h.offsetWidth; h.classList.remove('__poza'); h.classList.add('__zakryj'); })()"); await sleep(380); };
const napis = (t) => wywolaj("__napis", t || "");
const rozdzial = (t) => wywolaj("__rozdzial", t || "");
const kamera = (sel, s = 1.3, ms = 1000, dryf = 0.03, dryfMs = 5000) => wywolaj("__kamera", sel, s, ms, dryf, dryfMs);
const kursor = (sel) => wywolaj("__kursor", sel);
const klik = () => wywolaj("__klik");
async function przejdz(url, strona, cel, skala = 1) { await zakryj(); await idz(url, strona); if (cel) { await sleep(60); await kamera(cel, skala, 10, 0.02, 4000); } await sleep(60); await odkryj(); }

const sceny = [];
let T0;
const o = async (s) => { const d = T0 + s * 1000 - Date.now(); if (d > 0) await sleep(d); };
const start = (nazwa, s) => sceny.push({ nazwa, s });

await idz(scena("tytul.html"), false);
await wyslij("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: SZER, maxHeight: WYS, everyNthFrame: 1 });
T0 = Date.now();

// 0 — tytuł (0–6 s)
start("tytul", 0); await o(0.1); await odkryj();

// 1 — problem (6–22.5 s): kinetyczny tekst, potem fakty z odliczaniem
await o(5.85); start("problem", 5.85); await przejdz(scena("problem.html"), false); await rozdzial("1 · Problem");
await o(7.9); await wywolaj("linia", "a1");
await o(9.5); await wywolaj("linia", "a2");
await o(12.0); await wywolaj("linia", "a3");
await o(14.3); await wywolaj("fazaB");
await o(16.9); await wywolaj("fakt", "f1");
await o(18.6); await wywolaj("fakt", "f2");
await o(20.9); await wywolaj("fakt", "f3");

// 2 — rozwiązanie (22.5–38 s): kamera po etapach
await o(22.2); start("rozwiazanie", 22.2); await przejdz(STRONA + "/", true, ".baner", 1.02); await rozdzial("2 · Rozwiązanie");
await o(23.2); await napis("otwarte AED: jeden otwarty zbiór danych o AED dla całej Polski");
await o(24.6); await kamera("#jak .etapy", 1.0, 1100, 0.02, 1500);
await o(25.1); await napis("Zbieramy · ujednolicamy · łączymy · publikujemy co 2 godziny");
await o(25.9); await kamera("#jak .etapy li:nth-child(1)", 1.9, 900, 0.03, 3000);
await o(28.9); await kamera("#jak .etapy li:nth-child(2)", 1.9, 800, 0.03, 3600);
await o(32.8); await kamera("#jak .etapy li:nth-child(3)", 1.9, 800, 0.03, 1800);
await o(34.6); await kamera("#jak .etapy li:nth-child(4)", 1.9, 800, 0.03, 2000);
await o(36.7); await kamera(".przemiana", 1.15, 1000, 0.02, 2000);

// 3 — wzorcowy zakres (38.3–50 s)
await o(38.3); start("wzorzec", 38.3); await rozdzial("3 · Wzorcowy zakres danych"); await kamera("#wzorzec", 1.0, 1100, 0.02, 1200);
await o(38.8); await napis("Wzorcowy zakres dla dysponentów: 39 pól, 2 proste szablony");
await o(39.8); await kamera("#wzorzec .akcje", 1.6, 900, 0.04, 2500);
await o(41.9); await napis(""); await przejdz(scena("xlsx.html"), false); await rozdzial("3 · Wzorcowy zakres danych");

// 4 — demo na prawdziwym pliku (50.2–74 s): kursor, klik, kamera na wyniki
await o(50.0); start("demo", 50.0); await przejdz(STRONA + "/", true, "#kreator", 1.0); await rozdzial("4 · Demo na prawdziwym pliku");
await js("document.getElementById('przyklad').click()"); // wyniki liczą się poza kadrem, klik kursora poniżej jest pokazowy
await o(50.8); await napis("Plik gminy Marki z dane.gov.pl: wiersze w jednej kolumnie, zamienione osie");
await o(51.0); await kamera("#przyklad", 1.5, 1000, 0.02, 2000);
await o(51.4); await kursor("start");
await o(52.2); await kursor("#przyklad");
await o(53.4); await klik();
await o(54.3); await kursor(""); await kamera("#k1", 1.0, 900, 0.01, 3000);
await o(58.5); await kamera("#k2", 1.0, 900, 0.01, 800); await napis("Kreator sam rozpoznaje plik: Urząd Miasta Marki (93%)");
await o(59.2); await kamera("#rozpoznano", 1.7, 800, 0.03, 1500);
await o(60.6); await kamera("#k3", 1.0, 800, 0.01, 600); await napis("Naprawione osie w 7 z 8 rekordów");
await o(61.5); await kamera("#naprawy", 1.3, 800, 0.02, 1500);
await o(63.1); await kamera("~km", 1.7, 800, 0.03, 3000); await napis("Punkt 293 km dalej oznaczony do sprawdzenia");
await o(66.4); await kamera("#naprawy", 1.15, 1000, 0.03, 2500);
await o(69.2); await kamera("#k4", 1.0, 900, 0.01, 600); await napis("Gmina pobiera gotowe pliki CSV, XML i MD5");
await o(70.2); await kamera("#k4 .akcje", 1.5, 800, 0.03, 3500);
await o(70.8); await kursor("start");
await o(71.5); await kursor("#pobierzXML");
await o(72.6); await klik();
await o(73.4); await kursor("");

// 5 — zgodność z dane.gov.pl (74.1–91.7 s): terminal na żywo
await o(74.1); start("zgodnosc", 74.1); await napis(""); await przejdz(scena("walidacja.html"), false); await rozdzial("5 · Zgodność z dane.gov.pl");
await o(74.9); await wywolaj("wpisz", [{ cmd: "curl -s https://otwarteaed.pl/dane/dane_gov_pl.xml -o dane_gov_pl.xml" }, { cmd: "curl -s https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd -o otwarte_dane_latest.xsd" }]);
await o(76.1); await wywolaj("wpisz", [{ cmd: "xmllint --noout --schema otwarte_dane_latest.xsd dane_gov_pl.xml" }, { out: "dane_gov_pl.xml <span class=ok>validates ✔</span>" }]);
await o(80.9); await wywolaj("wpisz", [{ cmd: "curl -s https://otwarteaed.pl/dane/dane_gov_pl.md5" }, { out: "<span class=h>" + MD5 + "</span>" }, { cmd: "md5 -q dane_gov_pl.xml" }, { out: "<span class=h>" + MD5 + "</span>  <span class=ok>✔ zgodne</span>" }]);
await o(82.9); await wywolaj("znak");
await o(84.45); await przejdz(STRONA + "/", true, "#dane", 1.0); await rozdzial("5 · Zgodność z dane.gov.pl");
await o(85.4); await kamera(".zgodnosc", 1.35, 1000, 0.03, 5000);
await o(86.0); await napis("Przed każdą publikacją hub sam sprawdza wynik · co 2 godziny");

// 6 — kampania i białe plamy (91.7–111 s)
await o(91.7); start("kampania", 91.7); await rozdzial("6 · Kampania dla dysponentów"); await kamera("#kampania", 1.0, 1100, 0.02, 1000);
await o(92.3); await napis("Kampania „otwarte AED”: znak, hasło i materiały dla dysponentów");
await o(92.9); await kamera(".znak", 1.2, 900, 0.03, 2200);
await o(95.2); await kamera("#biale-plamy", 1.0, 1000, 0.01, 600); await napis("Tylko 5 z 2479 gmin publikuje dane o AED");
await o(96.2); await kamera("#biale-plamy + p", 1.55, 900, 0.03, 3500);
await o(100.3); await kamera(".plamy", 1.25, 1000, 0.02, 4000); await napis("351 gmin bez żadnego AED w zbiorze: od nich zaczynamy");
await o(102.4); await kamera(".plamy tbody tr:nth-child(-n+4)", 1.6, 900, 0.03, 2000);
await o(104.5); start("materialy", 104.5); await napis(""); await przejdz(scena("materialy.html"), false); await rozdzial("6 · Kampania dla dysponentów");
await o(106.4); await wywolaj("akcent", "m1");
await o(107.1); await wywolaj("akcent", "m2");
await o(107.8); await wywolaj("akcent", "m3");
await o(108.7); await wywolaj("akcent", "m5");
await o(109.6); await wywolaj("akcent", "m4");

// 7 — zakończenie (111.1–120 s)
await o(111.1); start("koniec", 111.1); await przejdz(scena("koniec.html"), false);
await o(120);
const KONIEC = Date.now();
await wyslij("Page.stopScreencast");
ws.close(); chrome.kill();

// Złożenie wideo według czasu przyjścia klatek (zgodnie z zegarem harmonogramu i lektora)
const przed = klatki.filter((k) => k.t <= T0).at(-1);
const uzyte = [...(przed ? [{ plik: przed.plik, t: T0 }] : []), ...klatki.filter((k) => k.t > T0 && k.t < KONIEC)];
// Dokładnie 30 kl./s: dla każdej klatki wyjściowej ostatnia klatka nagrana przed jej czasem (bez dryfu czasu)
const SEK = join(KLATKI, "sek"); mkdirSync(SEK, { recursive: true });
let j = 0;
for (let i = 0; i < 3600; i++) { const t = T0 + (i * 1000) / 30; while (j + 1 < uzyte.length && uzyte[j + 1].t <= t) j++; symlinkSync(uzyte[j].plik, join(SEK, String(i).padStart(6, "0") + ".jpg")); }
const film = join(WYJ, "otwarte-aed-film.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", join(SEK, "%06d.jpg"), "-vf", "scale=" + SZER + ":" + WYS + ":force_original_aspect_ratio=decrease:flags=lanczos,pad=" + SZER + ":" + WYS + ":(ow-iw)/2:(oh-ih)/2:color=white,format=yuv420p",
  "-t", "120", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-movflags", "+faststart", film]);
writeFileSync(join(WYJ, "sceny.json"), JSON.stringify({ klatek: uzyte.length, sceny }, null, 2));
console.log("gotowe:", film, "klatek:", uzyte.length, "czas:", ((KONIEC - T0) / 1000).toFixed(1) + " s");
