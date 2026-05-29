import fs from "node:fs/promises";
import sharp from "sharp";

const MAX_DIMENSION = 2500;
const WEBP_QUALITY = 82;
// Animovaný GIF má width × height × počet snímků pixelů — větší gify snadno
// překročí výchozí limit sharpu (~268 Mpx) a konverze spadne. Zvedneme limit,
// aby se zpracovaly i delší animace.
const MAX_PIXELS = 1_000_000_000;

export type ProcessedImage = { buffer: Buffer; ext: "webp" | "gif" };

// GIF poznáme podle magických bajtů "GIF" (GIF87a / GIF89a) — spolehlivější
// než přípona souboru, která může chybět nebo lhát.
function isGif(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
}

/**
 * Zpracuje vstupní obrázek (buffer nebo cesta k souboru) pro uložení k inzerátu.
 * GIF zachová jako GIF (kvůli animaci) a jen ho zmenší; ostatní formáty převede
 * do WebP. Vrací výsledný buffer i správnou příponu.
 */
export async function processImage(input: Buffer | string): Promise<ProcessedImage> {
  const buf = typeof input === "string" ? await fs.readFile(input) : input;

  if (isGif(buf)) {
    // GIF nepřevádíme na WebP — animace by se u větších souborů rozbila / konverze
    // by spadla. Zmenšíme rozměry, ale necháme formát GIF.
    try {
      const out = await sharp(buf, { animated: true, limitInputPixels: MAX_PIXELS })
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .gif()
        .toBuffer();
      return { buffer: out, ext: "gif" };
    } catch {
      // Pokud i zmenšení selže (extrémně velký gif), uložíme originál beze změny.
      return { buffer: buf, ext: "gif" };
    }
  }

  const out = await sharp(buf, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { buffer: out, ext: "webp" };
}

/** Nahradí příponu v názvu souboru zadanou příponou (bez tečky). */
export function withExt(name: string, ext: string): string {
  return `${name.replace(/\.[^.]+$/i, "")}.${ext}`;
}
