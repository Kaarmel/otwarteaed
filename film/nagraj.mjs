// Nagrywa film demonstracyjny z prawdziwego interfejsu (Chrome + DevTools Protocol, bez bibliotek).
// Użycie: najpierw sh skrypty/strony.sh i serwer: python3 -m http.server 8800 -d dist/otwarteaed
//         potem node film/nagraj.mjs → film/out/otwarte-aed-film.mp4 (1920×1080, 30 kl./s, napisy wbudowane)
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const STRONA = process.env.STRONA || "http://localhost:8800";
const KLATKI = process.env.KLATKI || join(tmpdir(), "otwarteaed-film-klatki");
const WYJ = join(ROOT, "film/out");
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
let nr = 0; const czeka = new Map(); const klatki = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && czeka.has(m.id)) { czeka.get(m.id)(m.result); czeka.delete(m.id); return; }
  if (m.method === "Page.screencastFrame") {
    const plik = join(KLATKI, String(klatki.length).padStart(6, "0") + ".jpg");
    writeFileSync(plik, Buffer.from(m.params.data, "base64"));
    klatki.push({ plik, t: m.params.metadata.timestamp });
    wyslij("Page.screencastFrameAck", { sessionId: m.params.sessionId });
  }
};
function wyslij(method, params = {}) { const id = ++nr; return new Promise((r) => { czeka.set(id, r); ws.send(JSON.stringify({ id, method, params })); }); }
const js = (kod) => wyslij("Runtime.evaluate", { expression: kod, awaitPromise: true });
await wyslij("Page.enable"); await wyslij("Runtime.enable");

// Nakładka: napis na dole, rozdział w rogu, podświetlenie elementu, płynne przewijanie
const NAKLADKA = `(() => { if (window.__nak) return; window.__nak = 1;
  const st = document.createElement("style");
  st.textContent = \`#__napis{position:fixed;left:50%;bottom:48px;transform:translateX(-50%);max-width:1500px;width:max-content;background:rgba(16,33,63,.94);color:#fff;font:700 40px/1.3 "Atkinson Hyperlegible",A,Arial,sans-serif;padding:20px 36px;border-radius:14px;z-index:99999;opacity:0;transition:opacity .35s;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)}
  #__rozdzial{position:fixed;top:28px;right:32px;background:#00A651;color:#fff;font:700 26px "Atkinson Hyperlegible",A,Arial,sans-serif;padding:10px 20px;border-radius:999px;z-index:99999;opacity:0;transition:opacity .35s}
  .__swiec{outline:6px solid #FFC400!important;outline-offset:6px;border-radius:10px;transition:outline-color .3s}\`;
  document.head.appendChild(st);
  for (const id of ["__napis", "__rozdzial"]) { const d = document.createElement("div"); d.id = id; document.body.appendChild(d); }
  window.__napis = (t) => { const d = document.getElementById("__napis"); if (!t) { d.style.opacity = 0; return; } d.style.opacity = 0; setTimeout(() => { d.textContent = t; d.style.opacity = 1; }, 180); };
  window.__rozdzial = (t) => { const d = document.getElementById("__rozdzial"); d.textContent = t || ""; d.style.opacity = t ? 1 : 0; };
  window.__swiec = (sel) => { document.querySelectorAll(".__swiec").forEach((e) => e.classList.remove("__swiec")); const e = sel && document.querySelector(sel); if (e) e.classList.add("__swiec"); };
  window.__przewin = (sel, ms = 1600, odstep = 110) => new Promise((ok) => { const e = document.querySelector(sel); if (!e) return ok(); const y0 = scrollY, y1 = Math.max(0, e.getBoundingClientRect().top + scrollY - odstep), t0 = performance.now();
    const krok = (t) => { const p = Math.min(1, (t - t0) / ms), k = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; scrollTo(0, y0 + (y1 - y0) * k); p < 1 ? requestAnimationFrame(krok) : ok(); }; requestAnimationFrame(krok); });
})()`;
const ekran = async (strona) => wyslij("Emulation.setDeviceMetricsOverride", strona ? { width: 1536, height: 864, deviceScaleFactor: 1.25, mobile: false } : { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
async function idz(url, strona) {
  await ekran(strona);
  await wyslij("Page.navigate", { url });
  for (let i = 0; i < 60; i++) { await sleep(150); const r = await js("document.readyState"); if (r?.result?.value === "complete") break; }
  await js("document.fonts && document.fonts.ready.then(() => 1)");
  await js(NAKLADKA);
}
const napis = (t) => js(`window.__napis(${JSON.stringify(t || "")})`);
const rozdzial = (t) => js(`window.__rozdzial(${JSON.stringify(t || "")})`);
const swiec = (s) => js(`window.__swiec(${JSON.stringify(s || "")})`);
const przewin = (s, ms = 1600, odstep = 110) => js(`window.__przewin(${JSON.stringify(s)}, ${ms}, ${odstep})`);

const sceny = [];
let T0;
const doCzasu = async (ms) => { const d = T0 + ms - Date.now(); if (d > 0) await sleep(d); };
const start = (nazwa, ms) => sceny.push({ nazwa, ms });

// Przygotowanie: pierwsza scena gotowa przed startem nagrywania
await idz(scena("tytul.html"), false);
await wyslij("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
T0 = Date.now();

// 0 — tytuł i obietnica (0–6 s)
start("tytul", 0);
await doCzasu(6000);

// 1 — problem (6–20 s)
start("problem", 6000);
await idz(scena("problem.html"), false); await rozdzial("1 · Problem");
await doCzasu(6600); await js("document.getElementById('f1').classList.add('on')");
await doCzasu(7200); await napis("Dane o AED są rozproszone, a każde źródło wygląda inaczej");
await doCzasu(8600); await js("document.getElementById('f2').classList.add('on')");
await doCzasu(10600); await js("document.getElementById('f3').classList.add('on')");
await doCzasu(14500); await napis("Bez jednej listy nikt nie wie, gdzie jest najbliższy AED");
await doCzasu(20000);

// 2 — rozwiązanie (20–38 s)
start("rozwiazanie", 20000);
await idz(STRONA + "/", true); await rozdzial("2 · Rozwiązanie");
await doCzasu(20500); await napis("otwarte AED: jeden otwarty zbiór danych o AED dla całej Polski");
await doCzasu(25000); await przewin("#h-zadania", 1800, 60); await napis("Dla gmin, ministerstwa, służb ratowniczych i mieszkańców");
await doCzasu(30500); await przewin("#jak", 1800, 40); await swiec(".etapy"); await napis("Zbieramy · ujednolicamy · łączymy · publikujemy co 2 godziny");
await doCzasu(38000);

// 3 — wzorcowy zakres (38–50 s)
start("wzorzec", 38000);
await swiec(""); await rozdzial("3 · Wzorcowy zakres danych"); await przewin("#wzorzec", 1800, 60); await swiec("#wzorzec .akcje");
await napis("Wzorcowy zakres dla dysponentów: 39 pól, 2 proste szablony");
await doCzasu(43500);
await idz(scena("xlsx.html"), false); await rozdzial("3 · Wzorcowy zakres danych"); await napis("Gotowy plik Excel: pola, słowniki wartości, przykłady");
await doCzasu(50000);

// 4 — demo na prawdziwym pliku (50–74 s)
start("demo", 50000);
await idz(STRONA + "/", true); await przewin("#kreator", 10, 40); await rozdzial("4 · Demo na prawdziwym pliku");
await napis("Plik gminy Marki z dane.gov.pl: wiersze w jednej kolumnie, zamienione osie");
await doCzasu(53000); await swiec("#przyklad");
await doCzasu(54500); await swiec(""); await js("document.getElementById('przyklad').click()");
await doCzasu(57500); await przewin("#k2", 1200, 60); await swiec("#rozpoznano"); await napis("Kreator sam rozpoznaje plik: Urząd Miasta Marki (93%)");
await doCzasu(62000); await swiec(""); await przewin("#k3", 1800, 60); await swiec("#naprawy"); await napis("Naprawiono osie w 7 z 8 rekordów · oznaczono punkt 293 km dalej");
await doCzasu(69500); await swiec(""); await przewin("#k4", 1600, 60); await swiec("#k4 .akcje"); await napis("Gmina pobiera gotowe pliki CSV, XML i MD5 dla dane.gov.pl");
await doCzasu(74000);

// 5 — zgodność z dane.gov.pl (74–92 s)
start("zgodnosc", 74000);
await idz(scena("walidacja.html"), false); await rozdzial("5 · Zgodność z dane.gov.pl");
await napis("XML przechodzi walidację oficjalnym schematem dane.gov.pl");
await doCzasu(80000); await napis("Suma MD5 się zgadza: portal pobiera dane automatycznie");
await doCzasu(85000);
await idz(STRONA + "/", true); await przewin("#dane", 10, 40); await rozdzial("5 · Zgodność z dane.gov.pl"); await swiec(".zgodnosc");
await napis("Przed każdą publikacją hub sam sprawdza wynik · co 2 godziny");
await doCzasu(92000);

// 6 — kampania i białe plamy (92–112 s)
start("kampania", 92000);
await swiec(""); await przewin("#kampania", 1800, 40); await rozdzial("6 · Kampania dla dysponentów");
await napis("Kampania „otwarte AED”: znak, hasło i materiały dla dysponentów");
await doCzasu(97500); await przewin("#biale-plamy", 1800, 40); await swiec("#biale-plamy + p");
await napis("Tylko 5 z 2479 gmin publikuje dane o AED · 351 gmin bez AED w zbiorze");
await doCzasu(104500);
await idz(STRONA + "/pismo.html?teryt=0204022", true); await rozdzial("6 · Kampania dla dysponentów");
await doCzasu(105500); await przewin("#pismo", 1500, 80); await swiec("#pismo"); await napis("Dla każdej gminy gotowe pismo do wysłania przez ePUAP");
await doCzasu(112000);

// 7 — zakończenie (112–120 s)
start("koniec", 112000);
await idz(scena("koniec.html"), false);
await doCzasu(120000);
const KONIEC = Date.now();
await wyslij("Page.stopScreencast");
ws.close(); chrome.kill();

// Złożenie wideo: klatki o zmiennym czasie → 30 kl./s
const t0 = klatki[0].t, tk = t0 + (KONIEC - T0) / 1000;
let lista = "";
klatki.forEach((k, i) => { const nast = i + 1 < klatki.length ? klatki[i + 1].t : tk; lista += `file '${k.plik}'\nduration ${Math.max(0.001, nast - k.t).toFixed(4)}\n`; });
lista += `file '${klatki.at(-1).plik}'\n`;
const plikListy = join(KLATKI, "lista.txt"); writeFileSync(plikListy, lista);
const film = join(WYJ, "otwarte-aed-film.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", plikListy, "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", film]);
const przes = (t0 - T0 / 1000);
writeFileSync(join(WYJ, "sceny.json"), JSON.stringify({ klatek: klatki.length, sceny: sceny.map((s) => ({ ...s, s: s.ms / 1000 })) }, null, 2));
console.log("gotowe:", film, "klatek:", klatki.length, "czas:", ((KONIEC - T0) / 1000).toFixed(1) + " s");
