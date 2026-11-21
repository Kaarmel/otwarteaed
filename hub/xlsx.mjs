// Minimalny zapis i odczyt XLSX bez bibliotek: ZIP + deflate (CompressionStream), arkusze z tekstem w komórkach.
// Działa w przeglądarce i w Node 22. ponytail: brak stylów poza pogrubionym nagłówkiem, brak dat Excela; dodać, gdy będą potrzebne.

const enc = new TextEncoder();
const dec = new TextDecoder();

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function strumien(bajty, transform) {
  const s = new Blob([bajty]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(s).arrayBuffer());
}
const deflate = (b) => strumien(b, new CompressionStream("deflate-raw"));
const inflate = (b) => strumien(b, new DecompressionStream("deflate-raw"));

export async function zapiszZip(pliki) {
  const czesci = [], centralny = [];
  let offset = 0;
  for (const { nazwa, dane } of pliki) {
    const n = enc.encode(nazwa), d = typeof dane === "string" ? enc.encode(dane) : dane;
    const z = await deflate(d), crc = crc32(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 8, true); lh.setUint32(14, crc, true); lh.setUint32(18, z.length, true);
    lh.setUint32(22, d.length, true); lh.setUint16(26, n.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 8, true); ch.setUint32(16, crc, true); ch.setUint32(20, z.length, true); ch.setUint32(24, d.length, true);
    ch.setUint16(28, n.length, true); ch.setUint32(42, offset, true);
    czesci.push(new Uint8Array(lh.buffer), n, z);
    centralny.push(new Uint8Array(ch.buffer), n);
    offset += 30 + n.length + z.length;
  }
  const rozmiar = centralny.reduce((s, c) => s + c.length, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(8, pliki.length, true); eocd.setUint16(10, pliki.length, true);
  eocd.setUint32(12, rozmiar, true); eocd.setUint32(16, offset, true);
  return new Uint8Array(await new Blob([...czesci, ...centralny, new Uint8Array(eocd.buffer)]).arrayBuffer());
}

export async function czytajZip(bajty) {
  const v = new DataView(bajty.buffer, bajty.byteOffset, bajty.byteLength);
  let e = bajty.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("To nie jest plik ZIP/XLSX");
  const ile = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const wynik = {};
  for (let i = 0; i < ile; i++) {
    const metoda = v.getUint16(p + 10, true), dl = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), kl = v.getUint16(p + 32, true);
    const lo = v.getUint32(p + 42, true);
    const nazwa = dec.decode(bajty.subarray(p + 46, p + 46 + nl));
    const start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true);
    const surowe = bajty.subarray(start, start + dl);
    wynik[nazwa] = metoda === 0 ? surowe : await inflate(surowe);
    p += 46 + nl + xl + kl;
  }
  return wynik;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
const kolumna = (i) => { let s = ""; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

function arkuszXML(wiersze) {
  const rows = wiersze.map((w, r) => {
    const cells = w.map((v, c) => {
      if (v === null || v === undefined || v === "") return "";
      const ref = kolumna(c) + (r + 1), s = r === 0 ? ' s="1"' : "";
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
}

export async function zapisXLSX(arkusze) {
  const ns = "http://schemas.openxmlformats.org";
  const pliki = [
    { nazwa: "[Content_Types].xml", dane: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${arkusze.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { nazwa: "_rels/.rels", dane: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nazwa: "xl/workbook.xml", dane: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>${arkusze.map((a, i) => `<sheet name="${esc(a.nazwa.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { nazwa: "xl/_rels/workbook.xml.rels", dane: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships">${arkusze.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${arkusze.length + 1}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nazwa: "xl/styles.xml", dane: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>` },
    ...arkusze.map((a, i) => ({ nazwa: `xl/worksheets/sheet${i + 1}.xml`, dane: arkuszXML(a.wiersze) })),
  ];
  return zapiszZip(pliki);
}

const atrybut = (tag, nazwa) => tag.match(new RegExp(`\\b${nazwa}="([^"]*)"`))?.[1];
function indeksKolumny(ref) { let n = 0; for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }

export async function odczytXLSX(bajty) {
  const z = await czytajZip(bajty);
  const txt = (n) => (z[n] ? dec.decode(z[n]) : "");
  const wspolne = [...txt("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const rels = Object.fromEntries([...txt("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [atrybut(m[0], "Id"), atrybut(m[0], "Target")]));
  return [...txt("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const cel = rels[atrybut(m[0], "r:id")] || "";
    const sciezka = cel.startsWith("/") ? cel.slice(1) : "xl/" + cel.replace(/^\.\//, "");
    const wiersze = [];
    for (const r of txt(sciezka).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)) {
      const w = [];
      for (const c of (r[1] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = atrybut(c[1], "r"), t = atrybut(c[1], "t"), body = c[2] || "";
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let wart = null;
        if (t === "s") wart = wspolne[+v] ?? null;
        else if (t === "inlineStr") wart = unesc([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
        else if (t === "str" || t === "e") wart = v === undefined ? null : unesc(v);
        else if (t === "b") wart = v === "1";
        else if (v !== undefined) wart = Number(v);
        w[ref ? indeksKolumny(ref) : w.length] = wart;
      }
      wiersze.push(Array.from(w, (x) => x ?? null));
    }
    return { nazwa: unesc(atrybut(m[0], "name") || ""), wiersze };
  });
}
