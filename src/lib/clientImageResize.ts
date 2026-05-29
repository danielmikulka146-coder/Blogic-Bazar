"use client";

export const MAX_DIMENSION = 2500;
const WEBP_QUALITY = 0.82;

// Animované GIFy necháme serveru — canvas by z nich vzal jen první snímek a ztratil
// animaci. Server je převede na animovaný WebP. Vše ostatní (JPEG, PNG, statický
// WebP) zkomprimujeme rovnou tady v prohlížeči do WebP.
function isClientCompressible(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/gif";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image decode failed"));
    el.src = url;
  });
}

/**
 * Zkomprimuje obrázek do WebP přímo v prohlížeči (canvas.toBlob). Zmenší na
 * MAX_DIMENSION a přepne formát na WebP, takže server už nemusí nic překódovávat
 * a upload je výrazně menší. GIF a nepodporované typy vrací beze změny.
 */
export async function compressImageToWebp(file: File, maxSize: number = MAX_DIMENSION): Promise<File> {
  if (!isClientCompressible(file)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxSize ? maxSize / longest : 1;
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });
    if (!blob) return file;

    // Pokud už je vstup malý WebP a komprese ho nezmenšila, ponecháme originál.
    if (file.type === "image/webp" && blob.size >= file.size) return file;

    const newName = `${file.name.replace(/\.[^.]+$/i, "")}.webp`;
    return new File([blob], newName, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    // Dekódování selhalo (poškozený soubor, neznámý kodek) — necháme server, ať to zkusí.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
