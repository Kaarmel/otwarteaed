// Pomocnicze dla testów: oficjalny XSD dane.gov.pl pobierany do .cache (nie trzymamy go w repo).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
export const XSD = new URL("../.cache/otwarte_dane_latest.xsd", import.meta.url);
export async function zapewnijXSD() {
  if (existsSync(XSD)) return true;
  try {
    const r = await fetch("https://dane.gov.pl/static/xml/otwarte_dane_latest.xsd", { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return false;
    mkdirSync(new URL("../.cache/", import.meta.url), { recursive: true });
    writeFileSync(XSD, Buffer.from(await r.arrayBuffer()));
    return true;
  } catch { return false; }
}
