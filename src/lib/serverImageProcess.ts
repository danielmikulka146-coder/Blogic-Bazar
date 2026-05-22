import sharp from "sharp";

const MAX_DIMENSION = 2500;
const WEBP_QUALITY = 82;

export async function imageToWebp(input: Buffer | string): Promise<Buffer> {
  return sharp(input, { animated: true })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export function toWebpFilename(name: string): string {
  return name.replace(/\.[^.]+$/i, "") + ".webp";
}
