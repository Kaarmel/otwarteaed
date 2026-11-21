// Interfejs strony otwarteaed.pl. Cała logika danych jest w kreator.mjs i hub/*.mjs.
import { przebiegKreatora } from "./kreator.mjs";
import { OPISY } from "../hub/jakosc.mjs";

const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat("pl-PL");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dzis = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
const [profile, schemat, jakosc] = await Promise.all([
  fetch("profile.json").then((r) => r.json()),
  fetch(new URL("../hub/schemat.json", import.meta.url)).then((r) => r.json()),
  fetch("dane/jakosc.json").then((r) => r.json()).catch(() => null),
]);

if (jakosc) {
  const ustaw = (k, v) => document.querySelectorAll(`[data-l="${k}"]`).forEach((e) => (e.textContent = v));
  ustaw("aed", fmt.format(jakosc.aed));
  ustaw("adres", Math.round((jakosc.z_adresem / jakosc.aed) * 100) + "%");
  ustaw("zrodla", Object.keys(jakosc.zrodla).length);
  ustaw("scalone", fmt.format(jakosc.aed_z_kilku_zrodel));
  ustaw("data", new Date(jakosc.data).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }));
  $("#tabJakosc").innerHTML = Object.values(jakosc.zrodla).sort((a, b) => b.obserwacji - a.obserwacji)
    .map((z) => `<tr><td>${esc(z.nazwa)}</td><td>${fmt.format(z.obserwacji)}</td><td class="ocena">${z.srednia_ocena}</td><td>${esc(z.komunikat)}</td></tr>`).join("");
}
$("#tabPola").innerHTML = schemat.pola.map((p) => `<tr><td><code>${p.nazwa}</code>${p.wymagane ? " (wymagane)" : ""}</td><td>${esc(p.opis)}</td><td>${esc(p.format ?? (p.slownik || []).join(" | "))}</td></tr>`).join("");

let stan = { bajty: null, nazwa: "", wynik: null, mapowanie: null, baza: {} };
const NAZWY = Object.fromEntries(schemat.pola.map((p) => [p.nazwa, p.opis.split(/[.(]/)[0]]));
const STATUS = { "24/7": [1, "24/7"], brak_danych: [0, "brak danych — przyjęto: dostępny"], godziny: [2, "ograniczone godziny"], ograniczony: [3, "dostęp ograniczony"] };

async function uruchom() {
  const komunikat = $("#komunikat");
  for (const k of ["#k2", "#k3", "#k4"]) $(k).hidden = false;
  komunikat.textContent = "Sprawdzam plik i szukam adresów w PRG…";
  try {
    stan.wynik = await przebiegKreatora({ bajty: stan.bajty, nazwa: stan.nazwa, profile, schemat, data: dzis(), mapowanie: stan.mapowanie ?? undefined, baza: stan.baza,
      dysponent: { nazwa: $("#dNazwa").value || "Urząd Gminy", url: $("#dUrl").value || "https://example.gov.pl/", licencja: $("#dLic").value } });
  } catch (e) {
    komunikat.innerHTML = `<span class="blad">Nie udało się odczytać pliku: ${esc(e.message)}. Sprawdź, czy to CSV, XLSX, GeoJSON albo KML.</span>`;
    return;
  }
  const w = stan.wynik, top = w.propozycje[0];
  $("#rozpoznano").innerHTML = `Rozpoznano: <strong>${esc(top.nazwa)}</strong> (${Math.round(top.wynik * 100)}% zgodności). ${fmt.format(w.plik.wiersze.length)} wierszy, kodowanie ${w.plik.meta.kodowanie}.`;
  const kolumny = w.plik.naglowki;
  const pola = schemat.pola.filter((p) => p.szablony || ["szerokosc", "dlugosc", "adres_zrodlowy"].includes(p.nazwa));
  const WAZNE = new Set(["nazwa_obiektu", "szerokosc", "dlugosc", "numer", "miejscowosc"]);
  const wiersz = (p) => {
    const m = w.mapowanie[p.nazwa], wart = typeof m === "string" ? m : "";
    return `<tr><td><label for="m-${p.nazwa}">${esc(NAZWY[p.nazwa])}</label> <code>${p.nazwa}</code></td><td><select id="m-${p.nazwa}" data-pole="${p.nazwa}"><option value="">— brak —</option>${kolumny.map((k) => `<option${k === wart ? " selected" : ""} value="${esc(k)}">${esc(k.trim() || "(bez nazwy)")}</option>`).join("")}${m && typeof m !== "string" ? '<option selected value="__zlozone">(złożone z kilku kolumn)</option>' : ""}</select></td></tr>`;
  };
  const glowne = pola.filter((p) => WAZNE.has(p.nazwa) || w.mapowanie[p.nazwa]), reszta = pola.filter((p) => !glowne.includes(p));
  $("#mapowanie").innerHTML = glowne.map(wiersz).join("");
  $("#mapowanieReszta").innerHTML = reszta.map(wiersz).join("");
  const z = Object.values(w.raport.zrodla)[0];
  komunikat.textContent = z ? `Średnia ocena jakości: ${z.srednia_ocena}/100. ${z.komunikat}` : "Plik nie zawiera rekordów.";
  $("#podglad").innerHTML = w.obserwacje.slice(0, 20).map((o) => {
    const [kod, opis] = STATUS[o.status_dostepnosci];
    const adres = [[o.ulica, o.numer].filter(Boolean).join(" "), o.miejscowosc].filter(Boolean).join(", ");
    const uwagi = o.flagi_jakosci.filter((f) => f !== "brak_danych_dostepnosci").map((f) => OPISY[f] ?? f);
    return `<tr><td>${esc(o.nazwa_obiektu ?? "—")}</td><td>${o.szerokosc === null ? '<span class="blad">brak</span>' : o.szerokosc.toFixed(5) + ", " + o.dlugosc.toFixed(5)}</td><td>${esc(adres || "—")}${o.gmina ? `<br><small>gm. ${esc(o.gmina)}, TERYT ${esc(o.teryt_gmina)}</small>` : ""}</td><td><span class="kropka s-${kod}"></span>${opis}</td><td>${uwagi.map(esc).join("<br>") || "—"}</td></tr>`;
  }).join("");
}

function pobierz(nazwa, tresc, typ) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([tresc], { type: typ })), download: nazwa });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function wczytaj(bajty, nazwa, przewin = true) { stan = { ...stan, bajty, nazwa, mapowanie: null }; await uruchom(); if (przewin) $("#k2").scrollIntoView({ behavior: "smooth", block: "start" }); }
$("#plik").addEventListener("change", async (e) => { const f = e.target.files[0]; if (f) await wczytaj(new Uint8Array(await f.arrayBuffer()), f.name); });
const upusc = $(".upusc");
upusc.addEventListener("dragover", (e) => { e.preventDefault(); upusc.classList.add("nad"); });
upusc.addEventListener("dragleave", () => upusc.classList.remove("nad"));
upusc.addEventListener("drop", async (e) => { e.preventDefault(); upusc.classList.remove("nad"); const f = e.dataTransfer.files[0]; if (f) await wczytaj(new Uint8Array(await f.arrayBuffer()), f.name); });
$("#formUrl").addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = $("#url").value;
  try { const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status); await wczytaj(new Uint8Array(await r.arrayBuffer()), u.split("/").pop()); }
  catch (err) { $("#k3").hidden = false; $("#komunikat").innerHTML = `<span class="blad">Nie udało się pobrać pliku (${esc(err.message)}). Serwer może blokować pobieranie z innych stron. Zapisz plik na dysku i wgraj go powyżej.</span>`; }
});
$("#przelicz").addEventListener("click", async () => {
  const m = { ...stan.wynik.mapowanie };
  document.querySelectorAll("#mapowanie select").forEach((s) => { if (s.value === "__zlozone") return; if (s.value) m[s.dataset.pole] = s.value; else delete m[s.dataset.pole]; });
  stan.mapowanie = m; await uruchom();
});
async function przyklad(przewin = true) {
  const b = new Uint8Array(await (await fetch("przyklady/marki_dane_gov_pl.csv")).arrayBuffer());
  $("#dNazwa").value = "Urząd Miasta Marki"; $("#dUrl").value = "https://marki.pl/aed/";
  await wczytaj(b, "marki_dane_gov_pl.csv", przewin);
}
$("#przyklad").addEventListener("click", () => przyklad());
if (location.hash === "#przyklad") przyklad(false);
$("#dysponent").addEventListener("change", () => stan.bajty && uruchom());
$("#pobierzCSV").addEventListener("click", () => pobierz(stan.wynik.pliki.nazwaCSV, stan.wynik.pliki.csv, "text/csv;charset=utf-8"));
$("#pobierzXML").addEventListener("click", () => { const n = stan.wynik.pliki.nazwaCSV.replace(/\.csv$/, ""); pobierz(n + ".xml", stan.wynik.pliki.xml, "application/xml"); pobierz(n + ".md5", stan.wynik.pliki.md5, "text/plain"); });
$("#pobierzProfil").addEventListener("click", () => pobierz(stan.wynik.profil.id + ".json", JSON.stringify(stan.wynik.pliki.profil, null, 2), "application/json"));
