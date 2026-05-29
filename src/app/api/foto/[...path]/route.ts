import fs from "node:fs/promises";
import path from "node:path";

// Kořenová složka s fotkami inzerátů. Servírujeme je přes tento route handler,
// NE přes statickou `public/` složku — Next.js totiž obsah `public/` zafixuje při
// startu (dev) / buildu (produkce), takže fotky nahrané za běhu by se neservírovaly
// a vracely by 404. Route handler čte ze disku dynamicky, takže funguje hned.
const FOTO_ROOT = path.join(process.cwd(), "public", "inzeraty");

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Ochrana proti path traversal — žádný segment nesmí obsahovat ".." ani lomítka.
  if (!segments?.length || segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return new Response("Neplatná cesta", { status: 400 });
  }

  const filePath = path.join(FOTO_ROOT, ...segments);
  // Dvojitá pojistka: výsledná absolutní cesta musí ležet uvnitř FOTO_ROOT.
  if (!filePath.startsWith(FOTO_ROOT)) {
    return new Response("Neplatná cesta", { status: 400 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Nepodporovaný formát", { status: 400 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        // Soubory mají v názvu timestamp (immutable) — můžeme cachovat dlouho.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Nenalezeno", { status: 404 });
  }
}
