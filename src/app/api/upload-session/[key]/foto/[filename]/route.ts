import fs from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { getSessionFile, removeFoto } from "@/lib/uploadSession";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string; filename: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nepřihlášený uživatel" }, { status: 401 });
  }

  const { key, filename } = await params;
  const match = getSessionFile(key, filename, user.id);
  if (!match) {
    return Response.json({ error: "Nenalezeno" }, { status: 404 });
  }

  const buffer = await fs.readFile(match.filePath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "private, max-age=1200",
      "Content-Type": match.foto.contentType,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string; filename: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nepřihlášený uživatel" }, { status: 401 });
  }

  const { key, filename } = await params;
  if (!getSessionFile(key, filename, user.id)) {
    return Response.json({ error: "Nenalezeno" }, { status: 404 });
  }

  const ok = await removeFoto(key, filename);
  if (!ok) {
    return Response.json({ error: "Nenalezeno" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
