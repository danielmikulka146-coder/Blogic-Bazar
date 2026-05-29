import fs from "node:fs/promises";
import sharp from "sharp";

const MAX_DIMENSION = 2500;
const WEBP_QUALITY = 82;
// Animovaný obrázek má width × height × počet snímků pixelů — větší animace snadno
// překročí výchozí limit sharpu (~268 Mpx) a konverze spadne. Zvedneme limit,
// aby se zpracovaly i delší animace.
const MAX_PIXELS = 1_000_000_000;

export type ProcessedImage = { buffer: Buffer; ext: "webp" | "gif" };

/**
 * Zpracuje vstupní obrázek (buffer nebo cesta k souboru) pro uložení k inzerátu.
 *
 * Prioritou je WebP — i animované GIFy převádíme na animovaný WebP (výrazně menší
 * soubor a `next/image` ho zvládne optimalizovat). GIF necháme jen jako záchranný
 * fallback, kdyby WebP konverze animace selhala.
 */
export async function processImage(input: Buffer | string): Promise<ProcessedImage> {
  const buf = typeof input === "string" ? await fs.readFile(input) : input;

  // Zjistíme počet snímků — pages > 1 znamená animaci (GIF nebo animovaný WebP).
  let animated = false;
  try {
    const meta = await sharp(buf, { limitInputPixels: MAX_PIXELS }).metadata();
    animated = (meta.pages ?? 1) > 1;
  } catch {
    // metadata nešla přečíst — zkusíme zpracovat jako statický obrázek níže
  }

  if (animated) {
    // Animaci zachováme, ale jako animovaný WebP. Resize zmenší rozměry; tím se
    // i z obřích animací (původně desítky MB) stane rozumně velký soubor.
    try {
      const out = await sharp(buf, { animated: true, limitInputPixels: MAX_PIXELS })
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();
      return { buffer: out, ext: "webp" };
    } catch {
      // WebP konverze animace selhala — zkusíme aspoň zmenšený GIF.
      try {
        const out = await sharp(buf, { animated: true, limitInputPixels: MAX_PIXELS })
          .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
          .gif()
          .toBuffer();
        return { buffer: out, ext: "gif" };
      } catch {
        return { buffer: buf, ext: "gif" };
      }
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
